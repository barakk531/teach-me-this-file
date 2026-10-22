import { ThinkingLevel } from '@google/genai';
import { AppError } from '../http/errors.js';
import { streamText } from './gemini.js';
import { PLAN_SCHEMA, PLANNER_INSTRUCTIONS, plannerRequest } from './prompts/plannerPrompt.js';

const MAX_STEPS = 8;
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'dv']);

/**
 * Reads the whole file once and returns a lesson plan. This is the only call
 * that sees the full file: the tutor later works from the plan's passages,
 * which keeps every chat turn small and cheap whatever the file size.
 */
export async function createLessonPlan({
  apiKey,
  fileParts,
  fileName,
  teacherPrompt,
  signal,
  onProgress,
}) {
  const chunks = streamText({
    apiKey,
    signal,
    systemInstruction: PLANNER_INSTRUCTIONS,
    contents: [
      { role: 'user', parts: [...fileParts, { text: plannerRequest(teacherPrompt, fileName) }] },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: PLAN_SCHEMA,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
  });

  let json = '';
  let reported = '';
  for await (const chunk of chunks) {
    json += chunk;
    // The JSON arrives in schema order, so counting keys tells the user how far along we are.
    const progress = { passages: count(json, '"location"'), steps: count(json, '"objective"') };
    const key = `${progress.passages}/${progress.steps}`;
    if (key !== reported) {
      reported = key;
      onProgress?.(progress);
    }
  }
  return normalizePlan(parseJson(json));
}

/** The model's output is checked and cleaned before the app relies on it. */
export function normalizePlan(raw) {
  if (!raw.teachable) {
    throw notTeachable(raw.problem?.trim());
  }

  const passages = uniqueById(
    (raw.passages ?? [])
      .map((p) => ({ id: p.id?.trim(), location: p.location?.trim() ?? '', text: p.text?.trim() }))
      .filter((p) => p.id && p.text),
  );
  const passageIds = new Set(passages.map((p) => p.id));

  const steps = (raw.steps ?? [])
    .filter((step) => step.title?.trim() && step.objective?.trim())
    .slice(0, MAX_STEPS)
    .map((step) => ({
      title: step.title.trim(),
      objective: step.objective.trim(),
      keyPoints: (step.keyPoints ?? []).map((point) => point.trim()).filter(Boolean),
      passageIds: (step.passageIds ?? []).filter((id) => passageIds.has(id)),
      checkQuestion: step.checkQuestion?.trim() ?? '',
    }));
  if (steps.length === 0) throw notTeachable();

  const languageCode = raw.languageCode?.trim() || 'en';
  return {
    title: raw.title?.trim() || 'Lesson',
    language: raw.language?.trim() || 'English',
    languageCode,
    dir: RTL_LANGUAGES.has(languageCode.split('-')[0].toLowerCase()) ? 'rtl' : 'ltr',
    audience: raw.audience?.trim() ?? '',
    durationMinutes: clamp(Math.round(raw.durationMinutes) || 10, 3, 90),
    scope: raw.scope?.trim() ?? '',
    passages,
    steps,
  };
}

function parseJson(json) {
  try {
    return JSON.parse(json);
  } catch {
    throw new AppError('plan_failed', 'The lesson plan came back incomplete. Try again.', {
      status: 502,
      retryable: true,
    });
  }
}

function notTeachable(reason) {
  return new AppError(
    'not_teachable',
    reason || 'This file does not seem to contain anything that can be taught.',
    { status: 422 },
  );
}

function uniqueById(items) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
