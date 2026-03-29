import { Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <div className="relative hidden w-[42%] flex-col justify-between bg-zinc-900 px-10 py-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/50 via-zinc-900 to-zinc-950" />
        <div className="relative z-10">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
              <Layers className="h-4 w-4" />
            </span>
            Reimburse
          </Link>
          <h1 className="mt-14 max-w-md text-3xl font-semibold leading-tight tracking-tight">
            {title}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">{subtitle}</p>
        </div>
        <p className="relative z-10 text-xs text-zinc-500">
          Expense workflows, approvals, and FX — built for teams.
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
              <Layers className="h-4 w-4" />
            </span>
            <span className="font-semibold text-zinc-900">Reimburse</span>
          </div>
          {children}
          <div className="mt-8 text-center text-sm text-zinc-500">{footer}</div>
        </div>
      </div>
    </div>
  );
}
