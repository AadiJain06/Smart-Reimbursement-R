import { useCallback, useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useExpenseSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/StatusBadge';
import { useOfflineStore } from '@/store/offlineStore';

type Expense = {
  id: string;
  amount: string;
  currency: string;
  amountInCompanyCurrency: string;
  category: string;
  description: string | null;
  status: string;
  date: string;
  receiptPath: string | null;
};

export function ExpenseHistory() {
  const company = useAuthStore((s) => s.company);
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const setLast = useOfflineStore((s) => s.setLastExpenses);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Expense[]>('/api/expenses');
      setRows(data);
      setLast(JSON.stringify(data));
    } catch {
      const cached = useOfflineStore.getState().lastExpensesJson;
      if (cached) {
        try {
          setRows(JSON.parse(cached));
        } catch {
          /* ignore */
        }
      }
    } finally {
      setLoading(false);
    }
  }, [setLast]);

  useEffect(() => {
    load();
  }, [load]);

  useExpenseSocket(load);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-white">Expense history</h1>
      <p className="mt-2 text-slate-400">All expenses visible for your role.</p>

      {loading ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">{company?.defaultCurrency}</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-slate-800/80 hover:bg-slate-900/50">
                  <td className="px-4 py-3">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3">
                    {e.amount} {e.currency}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {Number(e.amountInCompanyCurrency).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-4 py-3">
                    {e.receiptPath ? (
                      <a
                        href={e.receiptPath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-8 text-center text-slate-500">No expenses found.</p>
          )}
        </div>
      )}
    </div>
  );
}
