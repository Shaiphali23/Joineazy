import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import Badge from '../components/Badge.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';

export default function AdminAssignmentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/assignments/${id}/detail`)
      .then((r) => setData(r.data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;

  const confirmed = data.groups.filter((g) => g.submitted).length;

  return (
    <div className="space-y-5">
      <Link to="/admin/assignments" className="text-sm font-medium text-brand-600 hover:underline">&larr; Back to assignments</Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">{data.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{data.description}</p>
        <p className="mt-2 text-xs text-slate-500">
          Due {new Date(data.dueDate).toLocaleDateString()} ·{' '}
          {data.audience === 'ALL' ? 'All groups' : 'Selected groups'} ·{' '}
          <a href={data.oneDriveLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">OneDrive folder</a>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-baseline justify-between border-b border-slate-200 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Group confirmations</h2>
          <span className="text-sm text-slate-500 tabular-nums">{confirmed} of {data.groups.length}</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {data.groups.map((g) => (
            <li key={g.id} className="p-4 sm:p-5">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-slate-900">{g.name}</h3>
                {g.submitted ? <Badge tone="green">Confirmed</Badge> : <Badge tone="amber">Not confirmed</Badge>}
              </div>
              <p className="text-xs text-slate-500">
                {g.members.map((m) => m.name).join(', ')}
              </p>
              {g.submitted && (
                <p className="mt-1 text-xs text-slate-500">
                  Confirmed by <span className="font-medium text-slate-700">{g.confirmedBy?.name}</span> on{' '}
                  {new Date(g.submittedAt).toLocaleString()}
                </p>
              )}
            </li>
          ))}
          {data.groups.length === 0 && (
            <li className="p-8 text-center text-sm text-slate-500">No groups are targeted by this assignment yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
