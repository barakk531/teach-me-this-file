const OPEN = '<turn>';
const CLOSE = '</turn>';
const MAX_STATUS_CHARS = 400;
const ASSESSMENTS = new Set(['correct', 'partial', 'incorrect', 'question', 'off_topic', 'none']);

/**
 * Splits the tutor's streamed reply into its hidden status line and the
 * visible message. Yields one `{ type: 'meta', meta }` (meta is null when the
 * model forgot the status line), then `{ type: 'text', text }` chunks.
 */
export async function* parseTurn(chunks) {
  let buffer = '';
  let statusDone = false;
  let textStarted = false;

  // The message starts at its first visible character, whichever chunk it is in.
  function* visible(text) {
    const shown = textStarted ? text : text.trimStart();
    if (!shown) return;
    textStarted = true;
    yield { type: 'text', text: shown };
  }

  for await (const chunk of chunks) {
    if (statusDone) {
      yield* visible(chunk);
      continue;
    }
    buffer += chunk;
    const split = splitStatus(buffer, false);
    if (!split) continue;
    statusDone = true;
    yield { type: 'meta', meta: split.meta };
    yield* visible(split.rest);
  }

  if (!statusDone) {
    const split = splitStatus(buffer, true);
    yield { type: 'meta', meta: split.meta };
    yield* visible(split.rest);
  }
}

/** Returns null while it is still too early to tell where the status line ends. */
function splitStatus(buffer, isFinal) {
  const text = buffer.trimStart();
  if (text.startsWith(OPEN)) {
    const end = text.indexOf(CLOSE);
    if (end !== -1) {
      return {
        meta: parseMeta(text.slice(OPEN.length, end)),
        rest: text.slice(end + CLOSE.length),
      };
    }
    if (!isFinal && text.length < MAX_STATUS_CHARS) return null;
    // A broken status line is dropped so the student never sees it.
    return { meta: null, rest: text.replace(/^<turn>[^\n]*\n?/, '') };
  }
  if (!isFinal && OPEN.startsWith(text)) return null;
  return { meta: null, rest: buffer };
}

function parseMeta(json) {
  try {
    const raw = JSON.parse(json);
    return {
      assessment: ASSESSMENTS.has(raw.assessment) ? raw.assessment : 'none',
      stepComplete: raw.stepComplete === true,
      sources: Array.isArray(raw.sources) ? raw.sources.filter((s) => typeof s === 'string') : [],
    };
  } catch {
    return null;
  }
}
