import { Button } from './Button.jsx';
import { Icon } from './Icon.jsx';

// Errors the user fixes in the key settings (a used-up daily quota needs another key).
const KEY_ERRORS = new Set(['missing_key', 'invalid_key', 'daily_quota']);

/** Says what went wrong and offers the action that fixes it. */
export function ErrorNotice({ error, onRetry, onOpenSettings, className = '' }) {
  const needsKey = KEY_ERRORS.has(error.code);
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-[15px] ${className}`}
    >
      <Icon name="alert" className="size-5 shrink-0 text-danger" />
      <p className="min-w-0 flex-1">{error.message}</p>
      {needsKey && onOpenSettings && (
        <Button variant="secondary" className="min-h-9 text-sm" onClick={onOpenSettings}>
          <Icon name="key" className="size-4" />
          Open settings
        </Button>
      )}
      {!needsKey && error.retryable && onRetry && (
        <Button variant="secondary" className="min-h-9 text-sm" onClick={onRetry}>
          <Icon name="retry" className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
