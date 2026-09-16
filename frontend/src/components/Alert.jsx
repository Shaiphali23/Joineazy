export default function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const kinds = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    info: 'border-brand-100 bg-brand-50 text-brand-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${kinds[kind]}`}>
      {children}
    </div>
  );
}
