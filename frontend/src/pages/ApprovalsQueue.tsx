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
    return <p className="text-slate-400">Approvals are for managers and admins.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">Approvals queue</h1>
      <p className="mt-2 text-slate-400">Sequential and parallel steps assigned to you.</p>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-8 space-y-4">
          {pending.map((s) => {
            const e = s.expense;
            return (
              <div
                key={s.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {e.category} · {e.amount} {e.currency}
                  </p>
                  <p className="text-sm text-slate-500">
                    {e.submitter.name} · {new Date(e.date).toLocaleDateString()}
                  </p>
                  {e.description && (
                    <p className="mt-1 text-sm text-slate-400">{e.description}</p>
                  )}
                  <div className="mt-2">
                    <StatusBadge status={e.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ id: e.id, mode: 'approve' })}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ id: e.id, mode: 'reject' })}
                    className="rounded-xl border border-rose-500/50 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => escalate(e.id)}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            );
          })}
          {pending.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
              No pending approvals.
            </p>
          )}
        </div>
      )}

      <Modal
        open={!!modal}
        title={modal?.mode === 'approve' ? 'Approve expense' : 'Reject expense'}
        onClose={() => setModal(null)}
      >
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Comment (optional)"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          type="button"
          onClick={act}
          className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 font-medium text-white"
        >
          Confirm
        </button>
      </Modal>
    </div>
  );
}
