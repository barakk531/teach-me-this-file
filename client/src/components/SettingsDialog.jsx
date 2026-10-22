import { useEffect, useRef, useState } from 'react';
import { saveApiKey, useApiKey } from '../settings/apiKeyStore.js';
import { Button } from './ui/Button.jsx';
import { Icon } from './ui/Icon.jsx';

export function SettingsDialog({ open, onClose, serverKey }) {
  const dialogRef = useRef(null);
  const saved = useApiKey();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="settings-title"
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-2xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      {/* Remounting the form on open resets it to the saved values. */}
      {open && <SettingsForm saved={saved} serverKey={serverKey} onClose={onClose} />}
    </dialog>
  );
}

function SettingsForm({ saved, serverKey, onClose }) {
  const [key, setKey] = useState(saved.key);
  const [remember, setRemember] = useState(saved.remember);
  const [visible, setVisible] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    saveApiKey(key, remember);
    onClose();
  }

  function handleRemove() {
    saveApiKey('', false);
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="settings-title" className="text-xl font-bold">
          Gemini API key
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="-m-2 rounded-lg p-2 text-muted hover:bg-pen-soft hover:text-ink"
          aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="mt-2 text-[15px] text-muted">
        Lessons are generated with Google Gemini. Paste a free key from{' '}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-pen underline underline-offset-2"
        >
          Google AI Studio
        </a>
        . It is sent to our server with each request, used for that request only, and never stored
        there.
      </p>
      {serverKey && (
        <p className="mt-2 text-[15px] text-muted">
          This server also has a key of its own, so adding yours is optional.
        </p>
      )}

      <label htmlFor="api-key" className="mt-5 block font-medium">
        API key
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="api-key"
          type={visible ? 'text' : 'password'}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste your key"
          autoComplete="off"
          spellCheck="false"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 font-mono text-[15px] focus:border-pen focus:outline-none"
        />
        <Button variant="secondary" onClick={() => setVisible((v) => !v)}>
          {visible ? 'Hide' : 'Show'}
        </Button>
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-[15px]">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="mt-1 size-4 accent-pen"
        />
        <span>
          Remember on this device
          <span className="block text-muted">
            Otherwise the key is forgotten when you close this tab.
          </span>
        </span>
      </label>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {saved.key && (
          <Button variant="ghost" onClick={handleRemove} className="sm:me-auto">
            Remove key
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!key.trim()}>
          Save key
        </Button>
      </div>
    </form>
  );
}
