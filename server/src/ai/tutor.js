import { ThinkingLevel } from '@google/genai';
import { AppError } from '../http/errors.js';
import { streamText } from './gemini.js';
import { buildTutorInstructions } from './prompts/tutorPrompt.js';
import { parseTurn } from './turnParser.js';

const OPENER = '[The student opened the lesson.]';

/**
 * Runs one tutor turn. Yields `meta` (assessment, step completion, sources)
 * first and then `text` chunks, ready to be streamed to the browser.
 * The meta event also carries `raw`, the unchecked status line, for evals.
 */
export async function* runTutorTurn({
  apiKey,
  teacherPrompt,
  plan,
  progress,
  history,
  studentMessage,
  signal,
}) {
  const chunks = streamText({
    apiKey,
    signal,
    systemInstruction: buildTutorInstructions({
      teacherPrompt,
      plan,
      progress,
      isStart: history.length === 0,
    }),
    contents: buildContents(history, studentMessage),
    // Low thinking keeps the first words fast; the plan already did the heavy reasoning.
    generationConfig: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      maxOutputTokens: 4096,
    },
  });

  let meta = null;
  let hasText = false;
  for await (const event of parseTurn(chunks)) {
    if (event.type === 'meta') {
      if (!event.meta) console.warn('[tutor] reply had no valid status line; using defaults');
      meta = {
        type: 'meta',
        data: checkMeta(event.meta, plan, progress.stepIndex, studentMessage),
        raw: event.meta,
      };
    } else {
      // The status line goes out with the first text, so a reply that turns out
      // empty sends nothing, and the failed message gets no source link.
      if (meta) {
        yield meta;
        meta = null;
      }
      hasText = true;
      yield { type: 'text', data: { text: event.text } };
    }
  }
  // Models occasionally return nothing. That is a failed turn (progress stays as it was
  // and the student gets "Try again"), not an empty message from the tutor.
  if (!hasText) {
    throw new AppError('empty_reply', 'The AI sent back an empty answer. Try again.', {
      status: 502,
      retryable: true,
    });
  }
}

/**
 * Builds the conversation for Gemini. It must start with a user turn and
 * alternate roles, so an opener is added and same-role neighbours are merged.
 * Past tutor turns keep their status line, so the model keeps the format.
 */
export function buildContents(history, studentMessage) {
  const turns = [
    { role: 'user', text: OPENER },
    ...history.map(toTurn),
    ...(studentMessage ? [{ role: 'user', text: studentMessage }] : []),
  ];
  return turns.reduce((contents, turn) => {
    const last = contents.at(-1);
    if (last?.role === turn.role) last.parts.push({ text: turn.text });
    else contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    return contents;
  }, []);
}

function toTurn(message) {
  if (message.role === 'student') return { role: 'user', text: message.text };
  const status = message.meta ? `<turn>${JSON.stringify(message.meta)}</turn>\n\n` : '';
  const stopped = message.stopped ? '\n\n[The student stopped this message here.]' : '';
  return { role: 'model', text: status + message.text + stopped };
}

/** Never trust the model's status line blindly: it drives the app's progress. */
function checkMeta(meta, plan, stepIndex, studentMessage) {
  const known = new Set(plan.passages.map((p) => p.id));
  const sources = (meta?.sources ?? []).filter((id) => known.has(id));
  // A step can only be completed by something the student said.
  const stepComplete = Boolean(studentMessage && meta?.stepComplete);
  // A reply that completes a step also opens the next one, so its key point belongs there.
  const keyPoints = plan.steps[stepComplete ? stepIndex + 1 : stepIndex]?.keyPoints ?? [];
  const keyPoint = meta?.keyPoint ?? 0;
  return {
    assessment: studentMessage ? (meta?.assessment ?? 'none') : 'none',
    stepComplete,
    keyPoint: keyPoint <= keyPoints.length ? keyPoint : 0,
    sources: sources.length > 0 ? sources : (plan.steps[stepIndex]?.passageIds ?? []),
  };
}
