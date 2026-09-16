export default function StatCard({ label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    brand: 'text-brand-600',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl sm:text-3xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
