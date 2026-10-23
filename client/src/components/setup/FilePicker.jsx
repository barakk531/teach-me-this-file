import { useState } from 'react';
import { Icon } from '../ui/Icon.jsx';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const EXTENSIONS = [
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'heic',
  'heif',
  'docx',
  'txt',
  'md',
  'csv',
];
const ACCEPT = EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Checked again on the server; this only gives faster feedback. */
function checkFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (!EXTENSIONS.includes(extension)) {
    return 'This file type is not supported. Use a PDF, a photo, a Word document or a text file.';
  }
  if (file.size > MAX_FILE_BYTES) return 'This file is larger than 20 MB. Try a smaller file.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

export function FilePicker({ file, onChange, error, onError, disabled }) {
  const [dragging, setDragging] = useState(false);

  function pick(candidate) {
    if (!candidate) return;
    const problem = checkFile(candidate);
    onError(problem);
    onChange(problem ? null : candidate);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-pen-soft text-pen">
          <Icon name="file" />
        </span>
        <div className="min-w-0 flex-1">
          <p dir="auto" className="truncate font-medium">
            {file.name}
          </p>
          <p className="text-sm text-muted">{formatSize(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          className="rounded-lg p-2 text-muted hover:bg-pen-soft hover:text-ink disabled:opacity-40"
          aria-label="Remove file"
        >
          <Icon name="close" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:border-pen ${
          dragging ? 'border-pen bg-pen-soft' : 'border-line bg-paper hover:border-pen/50'
        }`}
      >
        <Icon name="upload" className="size-7 text-pen" />
        <span className="font-medium">
          <span className="hidden sm:inline">
            Drop a file here, or{' '}
            <span className="text-pen underline underline-offset-2">choose one</span>
          </span>
          <span className="text-pen underline underline-offset-2 sm:hidden">Choose a file</span>
        </span>
        <span className="text-sm text-muted">
          PDF (scanned pages are fine), photo, Word or text, up to 20 MB
        </span>
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => pick(e.target.files[0])}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'file-error' : undefined}
        />
      </label>
      {error && (
        <p id="file-error" className="mt-2 text-[15px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
