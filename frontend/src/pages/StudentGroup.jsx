import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';

export default function StudentGroup() {
  const { user, refresh } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [groupName, setGroupName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/groups/me');
      setGroup(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, success) => {
    setBusy(true); setError(''); setNotice('');
    try {
      await fn();
      setNotice(success);
      await load();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const createGroup = (e) => {
    e.preventDefault();
    act(async () => {
      const { data } = await api.post('/groups', { name: groupName.trim() });
      setGroup(data); setGroupName('');
    }, 'Group created.');
  };

  const addMember = (e) => {
    e.preventDefault();
    const added = email.trim();
    act(async () => {
      const { data } = await api.post('/groups/members', { email: added });
      setGroup(data); setEmail('');
    }, `${added} added to your group.`);
  };

  const leave = () => {
    setLeaveOpen(false);
    act(async () => { await api.delete('/groups/members/me'); setGroup(null); }, 'You left the group.');
  };

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">My Group</h1>

      {notice && <Alert kind="success">{notice}</Alert>}
      <Alert>{error}</Alert>

      {!group ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">You are not in a group</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">
            Create one and add your teammates by email. A student can belong to one group at a time.
          </p>
          <form onSubmit={createGroup} className="flex flex-col gap-2 sm:flex-row">
            <input required minLength={3} value={groupName} onChange={(e) => setGroupName(e.target.value)} className={field} placeholder="Group name, e.g. Team Rocket" />
            <button disabled={busy} className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
              {busy ? 'Creating...' : 'Create group'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{group.name}</h2>
                <p className="text-sm text-slate-500">{group.members.length} member{group.members.length === 1 ? '' : 's'}</p>
              </div>
              <button onClick={() => setLeaveOpen(true)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50">
                Leave group
              </button>
            </div>

            <ul className="mt-4 divide-y divide-slate-100">
              {group.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                    {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {m.name}{m.id === user?.id && <span className="ml-1 text-xs font-normal text-slate-400">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Add a member</h2>
            <p className="mt-1 mb-3 text-sm text-slate-600">
              Students who already belong to a group cannot be added -- they must leave theirs first.
            </p>
            <form onSubmit={addMember} className="flex flex-col gap-2 sm:flex-row">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="student@joineazy.edu" />
              <button disabled={busy} className="shrink-0 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                {busy ? 'Adding...' : 'Add member'}
              </button>
            </form>
          </div>
        </>
      )}

      <Modal open={leaveOpen} title="Leave this group?" onClose={() => setLeaveOpen(false)}>
        <p className="text-sm text-slate-600">
          You will lose access to <span className="font-semibold text-slate-900">{group?.name}</span>'s assignments
          until you join or create another group. If you are the last member, the group is deleted.
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={() => setLeaveOpen(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={leave} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">Leave group</button>
        </div>
      </Modal>
    </div>
  );
}
