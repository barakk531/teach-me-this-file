import express, { Router } from 'express';
import { runTutorTurn } from '../ai/tutor.js';
import { config } from '../config.js';
import { requireApiKey } from '../http/apiKey.js';
import { AppError, logError, publicError, toAppError } from '../http/errors.js';
import { openEventStream } from '../http/eventStream.js';

export const turnRouter = Router();

turnRouter.post('/', express.json({ limit: '1mb' }), requireApiKey, async (req, res, next) => {
  let input;
  try {
    input = parseTurnRequest(req.body);
  } catch (err) {
    return next(err);
  }

  const stream = openEventStream(res);
  try {
    const events = runTutorTurn({ ...input, apiKey: res.locals.apiKey, signal: stream.signal });
    for await (const event of events) stream.send(event.type, event.data);
    stream.send('done', {});
  } catch (err) {
    if (stream.signal.aborted) return;
    const appError = toAppError(err);
    if (appError.status >= 500) logError('turn', err);
    stream.send('error', publicError(appError));
  } finally {
    stream.end();
  }
});

/**
 * The server keeps no lesson state: the browser sends the plan and progress
 * with each turn. So everything is checked here before it reaches a prompt.
 */
export function parseTurnRequest(body) {
  const { teacherPrompt, plan, progress, history, studentMessage } = body ?? {};
  if (!Array.isArray(plan?.steps) || !Array.isArray(plan?.passages) || plan.steps.length === 0) {
    throw invalid('The lesson plan is missing.');
  }
  if (typeof teacherPrompt !== 'string' || teacherPrompt.length > config.limits.teacherPromptChars) {
    throw invalid('The teacher prompt is missing or too long.');
  }

  const stepIndex = progress?.stepIndex;
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= plan.steps.length) {
    throw invalid('The lesson is already complete.');
  }

  const messages = (Array.isArray(history) ? history : [])
    .filter((m) => (m?.role === 'student' || m?.role === 'tutor') && typeof m.text === 'string')
    .slice(-config.limits.historyMessages);

  const message = typeof studentMessage === 'string' ? studentMessage.trim() : null;
  if (message === null && messages.length > 0) throw invalid('A student message is required.');
  if (message !== null && (!message || message.length > config.limits.studentMessageChars)) {
    throw invalid('The message is empty or too long.');
  }

  return {
    teacherPrompt,
    plan,
    progress: {
      stepIndex,
      attempts: Math.max(0, Number(progress.attempts) || 0),
      minutesElapsed: Math.max(0, Math.round(Number(progress.minutesElapsed) || 0)),
    },
    history: messages,
    studentMessage: message,
  };
}

function invalid(message) {
  return new AppError('invalid_request', message);
}
