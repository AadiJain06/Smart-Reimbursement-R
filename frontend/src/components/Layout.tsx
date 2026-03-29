import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  History,
  Inbox,
  Settings,
  LogOut,
  Layers,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import clsx from 'clsx';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/submit', label: 'Submit expense', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/history', label: 'History', icon: History, roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { to: '/approvals', label: 'Approvals', icon: Inbox, roles: ['ADMIN', 'MANAGER'] },
  { to: '/admin', label: 'Admin', icon: Settings, roles: ['ADMIN'] },
];

export function Layout() {
  const { user, logout, company } = useAuthStore();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Mobile header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Layers className="h-4 w-4" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold text-zinc-900">Reimburse</span>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(18rem,100%)] flex-col border-r border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-900">Menu</span>
              <button
                type="button"
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                onClick={() => setNavOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 p-3">
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
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0 text-zinc-400" strokeWidth={1.75} />
                    {label}
                  </NavLink>
                ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-56 flex-col border-r border-zinc-200 bg-white shadow-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-zinc-100 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <Layers className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">Reimburse</p>
            <p className="truncate text-xs text-zinc-500">{company?.name}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3 pt-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Workspace
          </p>
          {links
            .filter((l) => user && l.roles.includes(user.role))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0 text-zinc-400" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-zinc-100 p-3">
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-zinc-900">{user?.name}</p>
            <p className="truncate text-xs text-zinc-500">{user?.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 ring-1 ring-zinc-200/80">
              {user?.role}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="ui-btn-ghost mt-2 w-full justify-start gap-2 text-zinc-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-56">
        <div className="ui-page mx-auto max-w-6xl px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pt-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
