import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api.js';
import ProgressBar from '../components/ProgressBar.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';

const blank = {
  title: '', description: '', dueDate: '', oneDriveLink: '',
  audience: 'ALL', targetGroupIds: [],
};

const toDateInput = (d) => new Date(d).toISOString().slice(0, 10);

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [a, g] = await Promise.all([api.get('/assignments'), api.get('/groups')]);
    setAssignments(a.data);
    setGroups(g.data);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const toggleGroup = (id) => setForm((f) => ({
    ...f,
    targetGroupIds: f.targetGroupIds.includes(id)
      ? f.targetGroupIds.filter((x) => x !== id)
      : [...f.targetGroupIds, id],
  }));

  const reset = () => { setForm(blank); setEditingId(null); };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      description: a.description,
      dueDate: toDateInput(a.dueDate),
      oneDriveLink: a.oneDriveLink,
      audience: a.audience,
      targetGroupIds: [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const payload = { ...form, dueDate: new Date(form.dueDate).toISOString() };
      if (payload.audience === 'ALL') payload.targetGroupIds = [];
      // When editing a SPECIFIC assignment without re-picking groups, omit the
      // field entirely so the server leaves the existing targets untouched.
      if (editingId && payload.audience === 'SPECIFIC' && payload.targetGroupIds.length === 0) {
        delete payload.targetGroupIds;
      }
      if (editingId) {
        await api.patch(`/assignments/${editingId}`, payload);
        setNotice('Assignment updated.');
      } else {
        await api.post('/assignments', payload);
        setNotice('Assignment created.');
      }
      reset();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">Assignments</h1>

      {notice && <Alert kind="success">{notice}</Alert>}
      <Alert>{error}</Alert>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="font-semibold text-slate-900">{editingId ? 'Edit assignment' : 'New assignment'}</h2>

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input id="title" required minLength={3} value={form.title} onChange={set('title')} className={field} placeholder="Database Design Fundamentals" />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" required rows={3} value={form.description} onChange={set('description')} className={field} placeholder="What students need to do, and what to upload." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="dueDate" className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
            <input id="dueDate" type="date" required value={form.dueDate} onChange={set('dueDate')} className={field} />
          </div>
          <div>
            <label htmlFor="link" className="mb-1 block text-sm font-medium text-slate-700">OneDrive link</label>
            <input id="link" type="url" required value={form.oneDriveLink} onChange={set('oneDriveLink')} className={field} placeholder="https://onedrive.live.com/..." />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1 block text-sm font-medium text-slate-700">Assign to</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="audience" value="ALL" checked={form.audience === 'ALL'} onChange={set('audience')} />
              All groups
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="audience" value="SPECIFIC" checked={form.audience === 'SPECIFIC'} onChange={set('audience')} />
              Specific groups
            </label>
          </div>
          {form.audience === 'ALL' && (
            <p className="mt-1.5 text-xs text-slate-500">
              Includes groups formed after this assignment is posted.
            </p>
          )}
          {form.audience === 'SPECIFIC' && (
            <div className="mt-2 flex flex-wrap gap-2">
              {groups.map((g) => (
                <button
                  type="button" key={g.id} onClick={() => toggleGroup(g.id)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    form.targetGroupIds.includes(g.id)
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {g.name}
                </button>
              ))}
              {groups.length === 0 && <p className="text-sm text-slate-500">No groups exist yet.</p>}
            </div>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2 pt-1">
          <button disabled={busy} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {busy ? 'Saving...' : editingId ? 'Save changes' : 'Create assignment'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {assignments.map((a) => (
          <article key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">{a.title}</h3>
                <p className="text-xs text-slate-500">
                  Due {new Date(a.dueDate).toLocaleDateString()} · {a.audience === 'ALL' ? 'All groups' : 'Selected groups'}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/admin/assignments/${a.id}`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  View
                </Link>
                <button onClick={() => startEdit(a)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Edit
                </button>
              </div>
            </div>
            <p className="mb-3 text-sm text-slate-600">{a.description}</p>
            <ProgressBar
              value={a.completionPct}
              label={`${a.confirmedGroups} of ${a.targetedGroups} groups confirmed`}
              tone={a.completionPct >= 80 ? 'green' : a.completionPct >= 40 ? 'amber' : 'brand'}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
