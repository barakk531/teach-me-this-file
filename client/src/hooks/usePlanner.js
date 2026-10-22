import { useCallback, useEffect, useRef, useState } from 'react';
import { requestPlan } from '../api/lessonApi.js';

const IDLE = { phase: 'idle', passages: 0, steps: 0, error: null };

/** Uploads the file and follows the planning stages. Resolves to the plan, or null. */
export function usePlanner() {
  const [state, setState] = useState(IDLE);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const createPlan = useCallback(async ({ file, prompt, apiKey }) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ ...IDLE, phase: 'uploading' });
    try {
      const plan = await requestPlan({
        file,
        prompt,
        apiKey,
        signal: controller.signal,
        onStage: (phase) => setState((s) => ({ ...s, phase })),
        onProgress: ({ passages, steps }) => setState((s) => ({ ...s, passages, steps })),
      });
      setState(IDLE);
      return plan;
    } catch (err) {
      setState(controller.signal.aborted ? IDLE : { ...IDLE, phase: 'error', error: err });
      return null;
    }
  }, []);

  return {
    ...state,
    isWorking: !['idle', 'error'].includes(state.phase),
    createPlan,
    cancel: () => controllerRef.current?.abort(),
  };
}
