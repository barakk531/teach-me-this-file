const VARIANTS = {
  primary: 'bg-pen text-white hover:bg-pen-dark disabled:bg-pen/45',
  secondary: 'border border-line bg-white text-ink hover:border-pen/50 hover:bg-pen-soft/50',
  ghost: 'text-muted hover:bg-pen-soft hover:text-ink',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
