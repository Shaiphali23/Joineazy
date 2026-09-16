import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Badge from '../components/Badge.jsx';
import Modal from '../components/Modal.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';

const fmt = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function StudentAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Two-step confirmation state: step 1 acknowledges the upload, step 2 commits.
  const [target, setTarget] = useState(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/assignments');
      setAssignments(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = assignments.length;
    const done = assignments.filter((a) => a.submitted).length;
    return { total, done, pct: total === 0 ? 0 : (done / total) * 100 };
  }, [assignments]);

  const openConfirm = (a) => { setTarget(a); setStep(1); setModalError(''); };
  const close = () => { setTarget(null); setStep(1); setModalError(''); };

  const commit = async () => {
    setBusy(true); setModalError('');
    try {
      await api.post(`/assignments/${target.id}/confirm`);
      setToast(`Submission confirmed for "${target.title}".`);
      close();
      await load();
    } catch (e) {
      setModalError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Assignments</h1>
        <p className="text-sm text-slate-500">
          {user?.group ? <>Submitting as <span className="font-medium text-slate-700">{user.group.name}</span></> : 'You are not in a group yet'}
        </p>
      </div>

      {toast && <Alert kind="success">{toast}</Alert>}
      <Alert>{error}</Alert>

      {!user?.group && (
        <Alert kind="warn">
          Submissions are made by a group, so you need one before you can confirm anything.{' '}
          <Link to="/group" className="font-semibold underline">Create or join a group</Link>.
        </Alert>
      )}

      {user?.group && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Group progress</h2>
            <span className="text-sm text-slate-500 tabular-nums">{stats.done} of {stats.total} confirmed</span>
          </div>
          <ProgressBar value={stats.pct} tone={stats.pct === 100 ? 'green' : 'brand'} />
          {stats.total > 0 && stats.done === stats.total && (
            <p className="mt-2 text-sm font-medium text-emerald-600">All assignments confirmed.</p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {assignments.map((a) => (
          <article key={a.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{a.title}</h3>
              {a.submitted
                ? <Badge tone="green">Submitted</Badge>
                : a.isOverdue
                  ? <Badge tone="red">Overdue</Badge>
                  : <Badge tone="amber">Pending</Badge>}
            </div>
            <p className="mb-3 text-sm text-slate-600 line-clamp-3">{a.description}</p>
            <dl className="mb-3 space-y-1 text-xs text-slate-500">
              <div className="flex gap-1"><dt>Due:</dt><dd className="font-medium text-slate-700">{fmt(a.dueDate)}</dd></div>
              {a.submitted && a.confirmedBy && (
                <div className="flex gap-1"><dt>Confirmed by:</dt><dd className="font-medium text-slate-700">{a.confirmedBy.name}</dd></div>
              )}
            </dl>
            <div className="mt-auto flex flex-wrap gap-2">
              <a
                href={a.oneDriveLink} target="_blank" rel="noreferrer"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open OneDrive
              </a>
              {a.submitted ? (
                <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">Confirmed</span>
              ) : (
                <button
                  onClick={() => openConfirm(a)} disabled={!a.canSubmit}
                  title={a.canSubmit ? '' : 'Join a group to confirm submissions'}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm submission
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {assignments.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No assignments have been posted yet.
        </p>
      )}

      {/* Step 1 of 2 -- acknowledge the external upload. */}
      <Modal open={Boolean(target) && step === 1} title="Have you uploaded your work?" onClose={close}>
        <p className="text-sm text-slate-600">
          Your work for <span className="font-semibold text-slate-900">{target?.title}</span> must already be uploaded
          to OneDrive. This system records the confirmation only -- it does not store your files.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={close} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Not yet</button>
          <button onClick={() => setStep(2)} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            Yes, I have submitted
          </button>
        </div>
      </Modal>

      {/* Step 2 of 2 -- commit on behalf of the whole group. */}
      <Modal open={Boolean(target) && step === 2} title="Confirm for the whole group?" onClose={close}>
        <Alert>{modalError}</Alert>
        <p className="mt-2 text-sm text-slate-600">
          This marks <span className="font-semibold text-slate-900">{target?.title}</span> as submitted for{' '}
          <span className="font-semibold text-slate-900">{user?.group?.name}</span> and every member in it.
          Your name is recorded as the confirming member. This cannot be undone.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={() => setStep(1)} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back</button>
          <button onClick={commit} disabled={busy} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Confirming...' : 'Confirm submission'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
