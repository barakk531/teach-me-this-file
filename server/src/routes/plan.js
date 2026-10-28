import { Router } from 'express';
import multer from 'multer';
import { createLessonPlan } from '../ai/planner.js';
import { config } from '../config.js';
import { readUpload } from '../files/readUpload.js';
import { requireApiKey } from '../http/apiKey.js';
import { AppError, logError, publicError, toAppError } from '../http/errors.js';
import { openEventStream } from '../http/eventStream.js';

const upload = multer({
  storage: multer.memoryStorage(),
  // One file and one short text field (the prompt); anything else is refused early.
  limits: { fileSize: config.limits.uploadBytes, files: 1, fields: 2, fieldSize: 16 * 1024 },
});

/**
 * Multer reads the form with busboy, which rejects a broken form (cut off, without a
 * boundary, a malformed part) with a plain Error. That is the client's fault, so it is
 * marked the way express.json() marks a body it cannot read.
 */
function readForm(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err && !(err instanceof multer.MulterError)) {
      Object.assign(err, { status: 400, expose: true });
    }
    next(err);
  });
}

export const planRouter = Router();

// The key is checked before the upload is read, so a missing key fails fast.
planRouter.post('/', requireApiKey, readForm, async (req, res, next) => {
  const teacherPrompt = req.body?.prompt?.trim() ?? '';
  if (!req.file) return next(new AppError('missing_file', 'Choose a file to teach from.'));
  if (!teacherPrompt)
    return next(new AppError('missing_prompt', 'Write how the lesson should be taught.'));
  if (teacherPrompt.length > config.limits.teacherPromptChars) {
    return next(new AppError('prompt_too_long', 'The teacher prompt is too long.'));
  }

  const stream = openEventStream(res);
  try {
    stream.send('stage', { stage: 'reading' });
    const fileParts = await readUpload(req.file);
    stream.send('stage', { stage: 'planning' });
    const plan = await createLessonPlan({
      apiKey: res.locals.apiKey,
      fileParts,
      fileName: req.file.originalname,
      teacherPrompt,
      signal: stream.signal,
      onProgress: (progress) => stream.send('progress', progress),
    });
    stream.send('plan', plan);
  } catch (err) {
    if (stream.signal.aborted) return;
    const appError = toAppError(err);
    if (appError.status >= 500) logError('plan', err);
    stream.send('error', publicError(appError));
  } finally {
    stream.end();
  }
});
