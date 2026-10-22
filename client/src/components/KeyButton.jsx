import { Icon } from './ui/Icon.jsx';

export function KeyButton({ hasKey, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[15px] font-medium hover:border-pen/50"
    >
      <Icon name="key" className="size-4 text-muted" />
      API key
      <span
        className={`size-2 rounded-full ${hasKey ? 'bg-tick' : 'bg-amber-500'}`}
        title={hasKey ? 'Key ready' : 'No key yet'}
      />
      <span className="sr-only">{hasKey ? '(ready)' : '(missing)'}</span>
    </button>
  );
}
