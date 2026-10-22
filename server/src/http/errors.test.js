import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { redactSecrets, toAppError } from './errors.js';

describe('redactSecrets', () => {
  it('removes keys in both Google formats from log text', () => {
    const classic = 'AIzaSyFAKE0000000000000000000000000000';
    const modern = 'AQ.FAKEab12cd34ef56gh78ij90kl12mn34op56qr';
    const text = redactSecrets(`failed with ${classic} and ${modern} in the request`);
    expect(text).toBe('failed with [redacted-key] and [redacted-key] in the request');
  });
});

describe('toAppError', () => {
  it('turns Gemini HTTP errors into messages the user can act on', () => {
    expect(toAppError(new ApiError({ status: 400, message: 'API key not valid' })).code).toBe(
      'invalid_key',
    );
    expect(toAppError(new ApiError({ status: 429, message: 'Quota exceeded' }))).toMatchObject({
      code: 'rate_limited',
      retryable: true,
    });
    expect(toAppError(new ApiError({ status: 503, message: 'Overloaded' })).retryable).toBe(true);
  });

  it('hides unexpected errors behind a generic, retryable message', () => {
    const error = toAppError(new TypeError('Cannot read properties of undefined'));
    expect(error).toMatchObject({ code: 'internal', status: 500, retryable: true });
    expect(error.message).not.toContain('undefined');
  });
});
