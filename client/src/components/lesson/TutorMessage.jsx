import { LessonText } from '../LessonText.jsx';
import { ErrorNotice } from '../ui/ErrorNotice.jsx';
import { Icon } from '../ui/Icon.jsx';

export function TutorMessage({ message, plan, isLast, onShowSources, onRetry, onOpenSettings }) {
  const { text, status, meta, stepIndex } = message;
  const sources = (meta?.sources ?? [])
    .map((id) => plan.passages.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <article className="flex gap-3" aria-busy={status === 'streaming'}>
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-marker"
      >
        T
      </span>
      <div className="min-w-0 flex-1 pt-1 text-[17px] leading-relaxed">
        <h3 className="sr-only">Tutor</h3>
        {text ? (
          <LessonText text={text} dir={plan.dir} />
        ) : (
          status === 'streaming' && <TypingDots />
        )}

        {status === 'error' && (
          <ErrorNotice
            error={message.error}
            onRetry={isLast ? onRetry : undefined}
            onOpenSettings={onOpenSettings}
            className={text ? 'mt-3' : ''}
          />
        )}

        {(sources.length > 0 || status === 'stopped' || meta?.stepComplete) &&
          status !== 'streaming' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {sources.length > 0 && (
                <button
                  type="button"
                  onClick={() => onShowSources(sources)}
                  className="group inline-flex items-center gap-1.5 font-medium text-ink"
                >
                  <Icon name="source" className="size-4 text-muted group-hover:text-ink" />
                  <span className="marker group-hover:underline group-hover:underline-offset-2">
                    Source: {sources[0].location || sources[0].id}
                    {sources.length > 1 && ` +${sources.length - 1}`}
                  </span>
                </button>
              )}
              {meta?.stepComplete && status === 'done' && (
                <span className="inline-flex items-center gap-1 font-medium text-tick">
                  <Icon name="check" className="size-4" />
                  Step {stepIndex + 1} complete
                </span>
              )}
              {status === 'stopped' && <span className="text-muted">Stopped</span>}
            </div>
          )}
      </div>
    </article>
  );
}

function TypingDots() {
  return (
    <span className="flex h-7 items-center gap-1" role="status">
      <span className="sr-only">The tutor is writing</span>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-2 animate-bounce rounded-full bg-muted/60"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
