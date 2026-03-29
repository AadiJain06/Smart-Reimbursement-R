import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  History,
  Inbox,
  Settings,
  LogOut,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/submit', label: 'Submit expense', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/history', label: 'Expense history', icon: History, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/approvals', label: 'Approvals', icon: Inbox, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin', label: 'Admin', icon: Settings, roles: ['ADMIN'] },
];

export function Layout() {
  const { user, logout, company } = useAuthStore();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900 p-2 text-white lg:hidden"
        onClick={() => setNavOpen((o) => !o)}
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {navOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-transform lg:static lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <Sparkles className="h-8 w-8 text-brand-500" />
          <div>
            <p className="font-display text-sm font-semibold text-white">Smart Reimburse</p>
            <p className="truncate text-xs text-slate-500">{company?.name}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links
            .filter((l) => user && l.roles.includes(user.role))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-600/20 text-brand-100'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0 opacity-80" />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-brand-400">{user?.role}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 lg:pl-0">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 lg:px-8 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
