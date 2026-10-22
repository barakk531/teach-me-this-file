import { useCallback, useEffect, useRef } from 'react';
import { requestTurn } from '../api/lessonApi.js';
import { retryRequest, turnRequest } from '../lesson/selectors.js';

/**
 * Runs tutor turns: sends the request built from lesson state, streams the
 * reply into the reducer, and supports stopping and retrying.
 */
export function useTutor({ lesson, dispatch, apiKey }) {
  const controllerRef = useRef(null);

  // Leaving the lesson cancels a reply in progress.
  useEffect(() => () => controllerRef.current?.abort(), []);

  const runTurn = useCallback(
    async (request) => {
      const id = crypto.randomUUID();
      const controller = new AbortController();
      controllerRef.current = controller;
      dispatch({ type: 'tutorTurnStarted', id, at: Date.now() });
      try {
        await requestTurn({
          request,
          apiKey,
          signal: controller.signal,
          onMeta: (meta) => dispatch({ type: 'tutorMetaReceived', id, meta }),
          onText: (text) => dispatch({ type: 'tutorTextReceived', id, text }),
        });
        dispatch({ type: 'tutorTurnFinished', id, stopped: false });
      } catch (err) {
        if (controller.signal.aborted) {
          dispatch({ type: 'tutorTurnFinished', id, stopped: true });
        } else {
          const { code, message, retryable } = err;
          dispatch({ type: 'tutorTurnFailed', id, error: { code, message, retryable } });
        }
      }
    },
    [apiKey, dispatch],
  );

  return {
    start: () => runTurn(turnRequest(lesson, null)),
    send(text) {
      const request = turnRequest(lesson, text);
      dispatch({ type: 'studentMessageSent', id: crypto.randomUUID(), text, at: Date.now() });
      runTurn(request);
    },
    retry() {
      const request = retryRequest(lesson);
      dispatch({ type: 'tutorMessageRemoved', id: lesson.messages.at(-1).id });
      runTurn(request);
    },
    stop: () => controllerRef.current?.abort(),
  };
}
