import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useExpenseSocket } from '@/hooks/useSocket';
import { StatusBadge } from '@/components/StatusBadge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type ExpenseRow = {
  id: string;
  amount: string;
  currency: string;
  amountInCompanyCurrency: string;
  category: string;
  status: string;
  date: string;
};

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const company = useAuthStore((s) => s.company);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [analytics, setAnalytics] = useState<{
    byStatus: { status: string; _count: number; _sum: { amountInCompanyCurrency: unknown } | null }[];
    byCategory: { category: string; _count: number; _sum: { amountInCompanyCurrency: unknown } | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ExpenseRow[]>('/api/expenses');
      setExpenses(data.slice(0, 8));
      if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
        const a = await api.get('/api/analytics/summary');
        setAnalytics(a.data);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useExpenseSocket(load);

  const chartData =
    analytics?.byCategory.map((c) => ({
      name: c.category,
      total: Number(c._sum?.amountInCompanyCurrency ?? 0),
    })) ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">
          Hello, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-2 text-slate-400">
          Company currency: <span className="text-brand-400">{company?.defaultCurrency}</span>
          {user?.role === 'EMPLOYEE' && ' — submit receipts and track status.'}
          {user?.role === 'MANAGER' && ' — review your team and pending approvals.'}
          {user?.role === 'ADMIN' && ' — manage users, rules, and overrides.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2 text-slate-400">
            <Wallet className="h-4 w-4" />
            Recent expenses
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-white">{expenses.length}</p>
          <p className="text-xs text-slate-500">Showing latest 8</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Quick actions</span>
            <Link
              to="/submit"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-400 hover:text-brand-300"
            >
              New expense <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/submit"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Submit expense
            </Link>
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <Link
                to="/approvals"
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              >
                Open approvals
              </Link>
            )}
          </div>
        </div>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && chartData.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="font-display text-lg font-semibold text-white">Spend by category</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="total" fill="#0d8bd9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-lg font-semibold text-white">Recent activity</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">In {company?.defaultCurrency}</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-slate-800/80 hover:bg-slate-900/50">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <p className="p-6 text-center text-slate-500">No expenses yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
