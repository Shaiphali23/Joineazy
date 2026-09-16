import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../lib/api.js';
import Alert from '../components/Alert.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/assignments', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fill = (e) => { setEmail(e); setPassword('Password123!'); };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white">J</span>
          <h1 className="text-xl font-bold text-slate-900">Sign in to Joineazy</h1>
          <p className="mt-1 text-sm text-slate-500">Group assignment management</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <Alert>{error}</Alert>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="you@joineazy.edu"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="********"
            />
          </div>
          <button
            type="submit" disabled={busy}
            className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-slate-500">
            New student? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
          </p>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-xs text-slate-600">
          <p className="mb-2 font-semibold text-slate-700">Demo accounts</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => fill('professor@joineazy.edu')} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Professor</button>
            <button type="button" onClick={() => fill('ayush@joineazy.edu')} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Student (in a group)</button>
            <button type="button" onClick={() => fill('arjun@joineazy.edu')} className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50">Student (no group)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
