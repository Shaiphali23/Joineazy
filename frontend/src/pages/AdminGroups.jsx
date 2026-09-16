import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import StatCard from '../components/StatCard.jsx';

export default function AdminGroups() {
  const [groups, setGroups] = useState([]);
  const [ungrouped, setUngrouped] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [g, o] = await Promise.all([api.get('/groups'), api.get('/analytics/overview')]);
        setGroups(g.data);
        setUngrouped(o.data.totals.ungroupedStudents);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Groups</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Groups" value={groups.length} />
        <StatCard label="Students in a group" value={groups.reduce((n, g) => n + g.memberCount, 0)} />
        <StatCard
          label="Not in a group"
          value={ungrouped}
          tone={ungrouped > 0 ? 'amber' : 'slate'}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <article key={g.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{g.name}</h2>
              <span className="text-xs text-slate-500 tabular-nums">{g.submissionCount} submitted</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                    {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{m.name}</p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 sm:col-span-2">
            No groups have been formed yet.
          </p>
        )}
      </div>
    </div>
  );
}
