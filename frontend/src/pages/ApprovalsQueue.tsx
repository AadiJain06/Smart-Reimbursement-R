import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useExpenseSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';

type Step = {
  id: string;
  expense: {
    id: string;
    amount: string;
    currency: string;
    category: string;
    description: string | null;
    status: string;
    date: string;
    submitter: { name: string; email: string };
    company: { defaultCurrency: string };
  };
};

export function ApprovalsQueue() {
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ id: string; mode: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Step[]>('/api/pending');
      setPending(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useExpenseSocket(load);

  const act = async () => {
    if (!modal) return;
    try {
      if (modal.mode === 'approve') {
        await api.post('/api/approve', { expenseId: modal.id, comment: comment || undefined });
        toast.success('Approved');
      } else {
        await api.post('/api/reject', { expenseId: modal.id, comment: comment || undefined });
        toast.success('Rejected');
      }
      setModal(null);
      setComment('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const escalate = async (expenseId: string) => {
    try {
      await api.post('/api/escalate', { expenseId, comment: 'Escalated for visibility' });
      toast.success('Escalation logged');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  if (user?.role === 'EMPLOYEE') {
    return (
      <p className="text-sm text-zinc-500">Approvals are available to managers and administrators.</p>
    );
  }

  return (
    <div className="ui-page">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Approvals</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Sequential and parallel steps where you’re the assigned approver.
      </p>

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="mt-8 space-y-3">
          {pending.map((s) => {
            const e = s.expense;
            return (
              <div
                key={s.id}
                className="ui-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">
                    {e.category}{' '}
                    <span className="font-normal text-zinc-500">
                      · {e.amount} {e.currency}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {e.submitter.name} · {new Date(e.date).toLocaleDateString()}
                  </p>
                  {e.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{e.description}</p>
                  )}
                  <div className="mt-3">
                    <StatusBadge status={e.status} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ id: e.id, mode: 'approve' })}
                    className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ id: e.id, mode: 'reject' })}
                    className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
                  >
                    Reject
                  </button>
                  <button type="button" onClick={() => escalate(e.id)} className="ui-btn-secondary">
                    Escalate
                  </button>
                </div>
              </div>
            );
          })}
          {pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 py-14 text-center">
              <p className="text-sm text-zinc-500">You’re all caught up — no pending approvals.</p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!modal}
        title={modal?.mode === 'approve' ? 'Approve expense' : 'Reject expense'}
        onClose={() => setModal(null)}
      >
        <textarea
          className="ui-textarea"
          placeholder="Comment (optional)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button type="button" onClick={act} className="ui-btn-primary mt-4 w-full">
          Confirm
        </button>
      </Modal>
    </div>
  );
}
