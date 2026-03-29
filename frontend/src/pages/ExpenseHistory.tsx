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
    <div className="ui-page">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Expense history</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Everything you’re allowed to see for your role, in one place.
      </p>

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="ui-table-wrap mt-8">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>{company?.defaultCurrency}</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-zinc-600">
                    {new Date(e.date).toLocaleDateString()}
                  </td>
                  <td className="font-medium text-zinc-900">{e.category}</td>
                  <td className="tabular-nums">
                    {e.amount} {e.currency}
                  </td>
                  <td className="tabular-nums text-zinc-600">
                    {Number(e.amountInCompanyCurrency).toFixed(2)}
                  </td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  <td>
                    {e.receiptPath ? (
                      <a
                        href={e.receiptPath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-10 text-center text-sm text-zinc-500">No expenses found.</p>
          )}
        </div>
      )}
    </div>
  );
}
