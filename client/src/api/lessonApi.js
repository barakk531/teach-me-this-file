import { getJson, postEventStream } from './http.js';

export function checkHealth({ signal } = {}) {
  return getJson('/api/health', { signal });
}

/** Uploads the file and prompt; reports planning stages and returns the lesson plan. */
export async function requestPlan({ file, prompt, apiKey, signal, onStage, onProgress }) {
  const body = new FormData();
  body.append('prompt', prompt);
  body.append('file', file);

  let plan;
  await postEventStream('/api/plan', {
    body,
    apiKey,
    signal,
    endEvent: 'plan',
    onEvent(name, data) {
      if (name === 'stage') onStage(data.stage);
      if (name === 'progress') onProgress(data);
      if (name === 'plan') plan = data;
    },
  });
  return plan;
}

/** Streams one tutor turn: the hidden assessment first, then the message text. */
export function requestTurn({ request, apiKey, signal, onMeta, onText }) {
  return postEventStream('/api/turn', {
    body: request,
    apiKey,
    signal,
    endEvent: 'done',
    onEvent(name, data) {
      if (name === 'meta') onMeta(data);
      if (name === 'text') onText(data.text);
    },
  });
}
