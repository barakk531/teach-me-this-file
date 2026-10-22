export function Spinner({ className = 'size-4' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-pen/25 border-t-pen ${className}`}
    />
  );
}
