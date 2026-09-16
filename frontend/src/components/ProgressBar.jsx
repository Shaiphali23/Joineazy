export default function ProgressBar({ value, label, tone = 'brand' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const tones = {
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  };
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-slate-600 mb-1">
          <span>{label}</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
      )}
      <div
        className="h-2 w-full rounded-full bg-slate-200 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'progress'}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
