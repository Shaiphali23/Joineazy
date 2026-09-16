import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../lib/api.js';
import Alert from '../components/Alert.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate('/assignments', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-bold text-slate-900">Create your student account</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Professor accounts are provisioned by the institution.</p>
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <Alert>{error}</Alert>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
            <input id="name" required value={form.name} onChange={set('name')} className={field} placeholder="Ayush Jaiswal" />
          </div>
          <div>
            <label htmlFor="remail" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input id="remail" type="email" required value={form.email} onChange={set('email')} className={field} placeholder="you@joineazy.edu" />
          </div>
          <div>
            <label htmlFor="rpassword" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input id="rpassword" type="password" required minLength={8} value={form.password} onChange={set('password')} className={field} placeholder="At least 8 characters" />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {busy ? 'Creating...' : 'Create account'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
