import clsx from 'clsx';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    APPROVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    REJECTED: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  };
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        map[status] ?? 'bg-slate-700 text-slate-200'
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
