import clsx from 'clsx';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:
      'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/80',
    APPROVED:
      'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/80',
    REJECTED: 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200/80',
  };
  return (
    <span
      className={clsx(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize',
        map[status] ?? 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200'
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
