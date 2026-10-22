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
  limits: { fileSize: config.limits.uploadBytes, files: 1 },
});

export const planRouter = Router();

// The key is checked before the upload is read, so a missing key fails fast.
planRouter.post('/', requireApiKey, upload.single('file'), async (req, res, next) => {
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
