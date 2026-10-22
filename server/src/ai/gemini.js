import { GoogleGenAI } from '@google/genai';
import { setTimeout as wait } from 'node:timers/promises';
import { config } from '../config.js';
import { AppError, toAppError } from '../http/errors.js';

// Errors worth trying again: quotas are counted per model, and overload is usually brief.
const RETRY_CODES = new Set(['rate_limited', 'ai_unavailable', 'model_unavailable']);
// Each pass tries every model; the wait before each pass grows.
const PASS_DELAYS_MS = [0, 2000, 5000];
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
    const stream = await withFallback({
      models: [config.models.primary, config.models.fallback],
      signal,
      open: (model) => ai.models.generateContentStream({ model, ...request }),
    });
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

/**
 * Opens a request on the first model that answers. Free-tier models are often
 * overloaded for a few seconds, so when every model fails with a temporary
 * error, it waits and tries them all again. Other errors fail at once.
 */
export async function withFallback({ models, open, signal, delays = PASS_DELAYS_MS }) {
  let lastError;
  for (const delay of delays) {
    if (delay) await wait(delay, undefined, { signal });
    for (const model of models) {
      try {
        return await open(model);
      } catch (err) {
        lastError = toAppError(err);
        if (!RETRY_CODES.has(lastError.code)) throw lastError;
        console.warn(`[gemini] ${model} failed (${lastError.code})`);
      }
    }
  }
  throw lastError;
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
