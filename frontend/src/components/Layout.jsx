import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">J</span>
              <span className="truncate font-semibold text-slate-900">Joineazy</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:block truncate text-sm text-slate-600">
                {user?.name} · {isAdmin ? 'Professor' : 'Student'}
              </span>
              <button
                onClick={onLogout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log out
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-2">
            {isAdmin ? (
              <>
                <NavLink to="/admin" end className={linkClass}>Dashboard</NavLink>
                <NavLink to="/admin/assignments" className={linkClass}>Assignments</NavLink>
                <NavLink to="/admin/groups" className={linkClass}>Groups</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/assignments" className={linkClass}>Assignments</NavLink>
                <NavLink to="/group" className={linkClass}>My Group</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
