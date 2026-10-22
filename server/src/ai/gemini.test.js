import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { withFallback } from './gemini.js';

const overloaded = () => new ApiError({ status: 503, message: 'high demand' });

/** A fake `open` that fails with the given errors in order, then succeeds. */
function scripted(errors) {
  const calls = [];
  return {
    calls,
    open: async (model) => {
      calls.push(model);
      const error = errors.shift();
      if (error) throw error;
      return `stream from ${model}`;
    },
  };
}

describe('withFallback', () => {
  const models = ['primary', 'fallback'];

  it('uses the fallback model when the first one is overloaded', async () => {
    const { open, calls } = scripted([overloaded()]);
    await expect(withFallback({ models, open, delays: [0] })).resolves.toBe('stream from fallback');
    expect(calls).toEqual(['primary', 'fallback']);
  });

  it('tries every model again on the next pass when all of them are busy', async () => {
    const { open, calls } = scripted([overloaded(), overloaded()]);
    await expect(withFallback({ models, open, delays: [0, 1] })).resolves.toBe(
      'stream from primary',
    );
    expect(calls).toEqual(['primary', 'fallback', 'primary']);
  });

  it('fails at once on errors that a retry cannot fix', async () => {
    const { open, calls } = scripted([new ApiError({ status: 400, message: 'API key not valid' })]);
    await expect(withFallback({ models, open, delays: [0, 1] })).rejects.toMatchObject({
      code: 'invalid_key',
    });
    expect(calls).toEqual(['primary']);
  });

  it('gives up with the last error after the final pass', async () => {
    const { open } = scripted(Array.from({ length: 4 }, overloaded));
    await expect(withFallback({ models, open, delays: [0, 1] })).rejects.toMatchObject({
      code: 'ai_unavailable',
      retryable: true,
    });
  });

  it('stops waiting when the request is cancelled', async () => {
    const { open } = scripted([overloaded(), overloaded()]);
    const controller = new AbortController();
    const result = withFallback({ models, open, delays: [0, 60_000], signal: controller.signal });
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
