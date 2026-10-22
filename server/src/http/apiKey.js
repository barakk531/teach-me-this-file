import { AppError } from './errors.js';

/**
 * Reads the user's Gemini key from the request header. The key lives only in
 * memory for the duration of the request: it is never stored or logged.
 * A key in the host's environment is an optional fallback.
 */
export function requireApiKey(req, res, next) {
  const apiKey = req.get('x-gemini-key')?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return next(
      new AppError('missing_key', 'Add your Gemini API key in Settings to start.', { status: 401 }),
    );
  }
  res.locals.apiKey = apiKey;
  next();
}
