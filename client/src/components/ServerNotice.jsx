import { Button } from './ui/Button.jsx';
import { Icon } from './ui/Icon.jsx';
import { Spinner } from './ui/Spinner.jsx';

/** Free hosting sleeps when idle: say so instead of looking broken. */
export function ServerNotice({ status }) {
  if (status.state === 'waking') {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 text-[15px]"
      >
        <Spinner />
        Waking up the server. It sleeps when nobody uses it, so this first visit can take up to a
        minute.
      </p>
    );
  }
  if (status.state === 'unreachable') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-[15px]"
      >
        <Icon name="alert" className="size-5 text-danger" />
        <p className="flex-1">The server is not answering. Check your connection.</p>
        <Button variant="secondary" className="min-h-9 text-sm" onClick={status.retry}>
          Try again
        </Button>
      </div>
    );
  }
  return null;
}
