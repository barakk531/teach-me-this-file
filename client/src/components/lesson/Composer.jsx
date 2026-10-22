import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon.jsx';

const MAX_CHARS = 2000;
// On touch keyboards Enter adds a new line; the send button sends.
const enterSends = () => window.matchMedia('(pointer: fine)').matches;

export function Composer({ streaming, onSend, onStop, dir }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  // Grow with the text, up to a few lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  function send() {
    const message = text.trim();
    if (!message || streaming) return;
    onSend(message);
    setText('');
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="shrink-0 border-t border-line bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      <div className="mx-auto flex max-w-2xl items-end gap-2">
        <label htmlFor="answer" className="sr-only">
          Your answer
        </label>
        <textarea
          id="answer"
          ref={inputRef}
          rows={1}
          dir={dir}
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && enterSends()) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Write your answer…"
          className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[17px] leading-normal placeholder:text-muted/80 focus:border-pen focus:bg-white focus:outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink hover:border-pen/50"
            aria-label="Stop the reply"
            title="Stop"
          >
            <Icon name="stop" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-pen text-white hover:bg-pen-dark disabled:bg-pen/40"
            aria-label="Send"
            title="Send"
          >
            <Icon name="send" />
          </button>
        )}
      </div>
    </form>
  );
}
