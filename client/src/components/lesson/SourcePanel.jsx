import { useEffect, useRef } from 'react';
import { LessonText } from '../LessonText.jsx';
import { Icon } from '../ui/Icon.jsx';

/** The file passages behind a tutor message: a side panel on desktop, a sheet on phones. */
export function SourcePanel({ passages, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [passages, onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-10 bg-ink/30 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-labelledby="source-title"
        className="fixed inset-x-0 bottom-0 z-20 flex max-h-[75dvh] flex-col rounded-t-2xl border-t border-line bg-white shadow-2xl lg:static lg:z-auto lg:max-h-none lg:w-96 lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-s lg:shadow-none"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="source-title" className="font-bold">
            From the file
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="-me-2 rounded-lg p-2 text-muted hover:bg-pen-soft hover:text-ink"
            aria-label="Close sources"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {passages.map((passage) => (
            <figure key={passage.id}>
              <figcaption className="mb-1.5 text-sm font-medium text-muted">
                {passage.location || passage.id}
              </figcaption>
              <blockquote className="passage animate-highlight rounded-sm px-3 py-2 text-[16px] leading-relaxed">
                <LessonText text={passage.text} dir="auto" />
              </blockquote>
            </figure>
          ))}
          <p className="text-sm text-muted">
            Copied from your file by the AI when it planned the lesson.
          </p>
        </div>
      </aside>
    </>
  );
}
