import { useCallback, useEffect, useState } from 'react';
import { checkHealth } from '../api/lessonApi.js';

// Free hosting puts the server to sleep when idle; waking it takes up to a minute.
const SLOW_AFTER_MS = 2_500;
const ATTEMPT_TIMEOUT_MS = 30_000;
const ATTEMPTS = 4;

/** 'checking' → 'waking' (if slow) → 'ready' | 'unreachable'. Also reports a host-provided key. */
export function useServerStatus() {
  const [status, setStatus] = useState({ state: 'checking', serverKey: false });
  const [run, setRun] = useState(0);

  useEffect(() => {
    let active = true;
    const slowTimer = setTimeout(() => {
      if (active) setStatus((s) => (s.state === 'checking' ? { ...s, state: 'waking' } : s));
    }, SLOW_AFTER_MS);

    (async () => {
      for (let attempt = 0; attempt < ATTEMPTS && active; attempt++) {
        try {
          const health = await checkHealth({ signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
          if (active) setStatus({ state: 'ready', serverKey: health.serverKey });
          return;
        } catch {
          // The host may answer with an error while it boots: wait and ask again.
          await new Promise((resolve) => setTimeout(resolve, 2_000));
        }
      }
      if (active) setStatus((s) => ({ ...s, state: 'unreachable' }));
    })();

    return () => {
      active = false;
      clearTimeout(slowTimer);
    };
  }, [run]);

  const retry = useCallback(() => {
    setStatus((s) => ({ ...s, state: 'checking' }));
    setRun((n) => n + 1);
  }, []);

  return { ...status, retry };
}
