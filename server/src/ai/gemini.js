import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { AppError, toAppError } from '../http/errors.js';

// Free-tier quotas are counted per model, so these errors are worth one try on the fallback.
const FALLBACK_CODES = new Set(['rate_limited', 'ai_unavailable', 'model_unavailable']);
const BLOCKED_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII']);

/**
 * Streams a Gemini generation and yields its visible text chunks.
 * This is the only module that talks to the AI provider.
 */
export async function* streamText({
  apiKey,
  systemInstruction,
  contents,
  generationConfig,
  signal,
}) {
  const ai = new GoogleGenAI({ apiKey });
  const request = {
    contents,
    config: { systemInstruction, ...generationConfig, abortSignal: signal },
  };
  let finishReason;
  try {
    const stream = await openStream(ai, request);
    for await (const chunk of stream) {
      if (chunk.promptFeedback?.blockReason) throw blockedError();
      const candidate = chunk.candidates?.[0];
      finishReason = candidate?.finishReason ?? finishReason;
      const text = visibleText(candidate);
      if (text) yield text;
    }
  } catch (err) {
    throw toAppError(err);
  }
  if (BLOCKED_REASONS.has(finishReason)) throw blockedError();
  if (finishReason === 'RECITATION') {
    throw new AppError(
      'recitation',
      'The AI stopped because its answer repeated too much of the source text. Try again.',
      { status: 502, retryable: true },
    );
  }
}

async function openStream(ai, request) {
  const models = [config.models.primary, config.models.fallback];
  for (const [index, model] of models.entries()) {
    try {
      return await ai.models.generateContentStream({ model, ...request });
    } catch (err) {
      const appError = toAppError(err);
      const isLast = index === models.length - 1;
      if (isLast || !FALLBACK_CODES.has(appError.code)) throw appError;
      console.warn(`[gemini] ${model} failed (${appError.code}), trying ${models[index + 1]}`);
    }
  }
}

/** Thought summaries are internal reasoning, never shown to the student. */
function visibleText(candidate) {
  const parts = candidate?.content?.parts ?? [];
  return parts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join('');
}

function blockedError() {
  return new AppError('blocked', 'The AI declined to respond to this content.', { status: 422 });
}
