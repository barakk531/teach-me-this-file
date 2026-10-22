import { useEffect, useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Spinner } from '../ui/Spinner.jsx';

const STAGES = ['uploading', 'reading', 'planning'];

/** Shows the real stages reported by the server while the lesson is prepared. */
export function PlanningProgress({ fileName, phase, passages, steps, onCancel }) {
  const seconds = useElapsedSeconds();
  const current = STAGES.indexOf(phase);
  const labels = {
    uploading: `Upload ${fileName}`,
    reading: 'Read the file',
    planning: 'Design the lesson',
  };

  return (
    <div role="status" aria-live="polite" className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold">Preparing the lesson</h2>
        <span className="text-sm text-muted tabular-nums">{formatTime(seconds)}</span>
      </div>
      <ol className="mt-5 space-y-3.5">
        {STAGES.map((stage, index) => {
          const state = index < current ? 'done' : index === current ? 'active' : 'pending';
          return (
            <li key={stage} className="flex items-start gap-3">
              <StageMark state={state} />
              <div className="min-w-0">
                <p className={`truncate ${state === 'pending' ? 'text-muted' : 'font-medium'}`}>
                  {labels[stage]}
                </p>
                {stage === 'planning' && state === 'active' && (
                  <p className="text-sm text-muted">
                    {passages === 0
                      ? 'Reading every page, including scans, tables and formulas…'
                      : `${passages} source passages found${steps ? `, ${steps} steps drafted` : ''}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {seconds > 25 && (
        <p className="mt-5 text-[15px] text-muted">
          Long or scanned files take longer. The whole file is read once, so the lesson itself
          will be fast.
        </p>
      )}
      <Button variant="secondary" className="mt-6" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function StageMark({ state }) {
  if (state === 'done') {
    return (
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-tick text-white">
        <Icon name="check" className="size-4" />
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="grid size-6 shrink-0 place-items-center">
        <Spinner className="size-5" />
      </span>
    );
  }
  return <span className="mx-1 mt-1 size-4 shrink-0 rounded-full border-2 border-line" />;
}

function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
