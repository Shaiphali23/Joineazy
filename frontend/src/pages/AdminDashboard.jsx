import { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import StatCard from '../components/StatCard.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';

const tone = (pct) => (pct >= 80 ? 'green' : pct >= 40 ? 'amber' : 'brand');

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [overview, groupProgress] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/groups'),
        ]);
        setData(overview.data);
        setGroups(groupProgress.data);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;

  const { totals, overall, perAssignment } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Submission confirmations across the cohort</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={totals.totalStudents} />
        <StatCard label="Groups" value={totals.totalGroups} />
        <StatCard label="Assignments" value={totals.totalAssignments} />
        <StatCard
          label="Not in a group"
          value={totals.ungroupedStudents}
          tone={totals.ungroupedStudents > 0 ? 'amber' : 'slate'}
          sub={totals.ungroupedStudents > 0 ? 'Cannot submit until they join a group' : 'Every student is in a group'}
        />
      </div>

      {/*
        Two denominators, deliberately shown together. Group completion alone
        would report 100% while ungrouped students remain unaccounted for.
      */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 font-semibold text-slate-900">Overall completion</h2>
        <p className="mb-4 text-sm text-slate-500">
          Measured two ways, because a group-only view hides students who belong to no group.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <ProgressBar
              value={overall.groupCompletionPct}
              label="Group completion"
              tone={tone(overall.groupCompletionPct)}
            />
            <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
              {overall.confirmedGroupSubmissions} of {overall.expectedGroupSubmissions} expected group submissions
            </p>
          </div>
          <div>
            <ProgressBar
              value={overall.studentCoveragePct}
              label="Student coverage"
              tone={tone(overall.studentCoveragePct)}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Share of all {totals.totalStudents} students covered by a confirmed submission
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">By assignment</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {perAssignment.map((a) => (
            <li key={a.id} className="p-4 sm:p-5">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-slate-900">{a.title}</h3>
                <span className="text-xs text-slate-500">
                  {a.audience === 'ALL' ? 'All groups' : 'Selected groups'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <ProgressBar value={a.groupCompletionPct} label="Groups confirmed" tone={tone(a.groupCompletionPct)} />
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">{a.confirmedGroups} of {a.targetedGroups} groups</p>
                </div>
                <div>
                  <ProgressBar value={a.studentCoveragePct} label="Students covered" tone={tone(a.studentCoveragePct)} />
                  <p className="mt-1 text-xs text-slate-500 tabular-nums">{a.studentsCovered} of {a.totalStudents} students</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Group progress</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {groups.map((g) => {
            const pct = g.assignedCount === 0 ? 0 : Math.round((g.confirmedCount / g.assignedCount) * 100);
            return (
              <li key={g.id} className="p-4 sm:p-5">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-medium text-slate-900">{g.name}</h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {g.memberCount} member{g.memberCount === 1 ? '' : 's'} · {g.confirmedCount}/{g.assignedCount} confirmed
                  </span>
                </div>
                <ProgressBar value={pct} tone={tone(pct)} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
