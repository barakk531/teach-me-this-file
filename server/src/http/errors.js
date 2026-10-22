import { ApiError } from '@google/genai';
import multer from 'multer';

/** An error that is safe to show to the user. */
export class AppError extends Error {
  constructor(code, message, { status = 400, retryable = false } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// Google issues keys in two formats: the classic "AIza…" and the newer "AQ.…".
const GEMINI_KEY_PATTERN = /AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_-]{20,}/g;

/** Errors can echo request details, so keys are removed before anything is logged. */
export function redactSecrets(text) {
  return String(text).replace(GEMINI_KEY_PATTERN, '[redacted-key]');
}

export function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err?.name === 'AbortError') return new AppError('aborted', 'The request was cancelled.');
  if (err instanceof multer.MulterError) {
    return err.code === 'LIMIT_FILE_SIZE'
      ? new AppError('file_too_large', 'This file is larger than 20 MB. Try a smaller file.', {
          status: 413,
        })
      : new AppError('bad_upload', 'The upload could not be read. Try again.');
  }
  if (err instanceof ApiError) return fromGeminiError(err);
  return new AppError('internal', 'Something went wrong on our side. Try again.', {
    status: 500,
    retryable: true,
  });
}

function fromGeminiError(err) {
  const detail = err.message ?? '';
  if (err.status === 400 && /api key/i.test(detail)) return invalidKey();
  if (err.status === 401 || err.status === 403) return invalidKey();
  if (err.status === 429) {
    return new AppError(
      'rate_limited',
      'The AI provider’s rate limit was reached (free keys allow only a few requests per minute). Wait a minute and try again.',
      { status: 429, retryable: true },
    );
  }
  if (err.status === 404) {
    return new AppError('model_unavailable', 'The AI model is not available for this API key.', {
      status: 502,
      retryable: true,
    });
  }
  if (err.status === 400) {
    return new AppError('ai_rejected', 'The AI could not process this request. Try another file.', {
      status: 422,
    });
  }
  return new AppError(
    'ai_unavailable',
    'The AI service is busy right now. Try again in a moment.',
    {
      status: 503,
      retryable: true,
    },
  );
}

function invalidKey() {
  return new AppError('invalid_key', 'Your Gemini API key was rejected. Check it in Settings.', {
    status: 401,
  });
}

export function publicError(appError) {
  const { code, message, retryable } = appError;
  return { code, message, retryable };
}

export function logError(context, err) {
  console.error(`[${context}]`, redactSecrets(err?.stack ?? err));
}

// Express recognises error handlers by their four arguments, so `next` must stay.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const appError = toAppError(err);
  if (appError.status >= 500) logError(req.path, err);
  res.status(appError.status).json({ error: publicError(appError) });
}
