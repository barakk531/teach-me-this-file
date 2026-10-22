/** An error with a message that can be shown to the user as is. */
export class ApiError extends Error {
  constructor({ code = 'unknown', message, retryable = false }) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

const NETWORK_ERROR = {
  code: 'network',
  message: 'Cannot reach the server. Check your connection and try again.',
  retryable: true,
};
const CONNECTION_LOST = {
  code: 'connection_lost',
  message: 'The connection was interrupted. Try again.',
  retryable: true,
};

/**
 * POSTs a request and reads the Server-Sent Events it streams back
 * (EventSource cannot POST). Resolves once `endEvent` arrives; an `error`
 * event or a stream that ends early becomes an ApiError.
 */
export async function postEventStream(path, { body, apiKey, signal, endEvent, onEvent }) {
  const response = await post(path, { body, apiKey, signal });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const event = parseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (!event) continue;
        if (event.name === 'error') throw new ApiError(event.data);
        onEvent(event.name, event.data);
        if (event.name === endEvent) return;
      }
    }
  } catch (err) {
    if (err instanceof ApiError || signal?.aborted) throw err;
    throw new ApiError(CONNECTION_LOST);
  } finally {
    reader.cancel().catch(() => {});
  }
  throw new ApiError(CONNECTION_LOST);
}

export async function getJson(path, { signal } = {}) {
  const response = await fetch(path, { signal });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

async function post(path, { body, apiKey, signal }) {
  const isForm = body instanceof FormData;
  const headers = { ...(apiKey && { 'X-Gemini-Key': apiKey }) };
  if (!isForm) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers,
      body: isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(NETWORK_ERROR);
  }
  if (!response.ok) throw await errorFrom(response);
  return response;
}

async function errorFrom(response) {
  try {
    const { error } = await response.json();
    if (error?.message) return new ApiError(error);
  } catch {
    // Not our JSON: a proxy or a sleeping host answered.
  }
  return new ApiError({
    code: `http_${response.status}`,
    message: 'The server is not responding right now. Try again in a moment.',
    retryable: true,
  });
}

function parseEvent(frame) {
  let name = 'message';
  let data = '';
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) name = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  // Frames without data are heartbeat comments.
  return data ? { name, data: JSON.parse(data) } : null;
}
