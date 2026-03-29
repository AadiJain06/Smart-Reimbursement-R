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
    <div className="ui-page space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Hello, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Base currency <span className="font-medium text-zinc-800">{company?.defaultCurrency}</span>
          {user?.role === 'EMPLOYEE' && ' — submit receipts and track every claim.'}
          {user?.role === 'MANAGER' && ' — review your team and clear the approval queue.'}
          {user?.role === 'ADMIN' && ' — manage people, rules, and company-wide spend.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="ui-card p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <Wallet className="h-4 w-4 text-zinc-400" strokeWidth={1.75} />
            Recent
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-zinc-900">{expenses.length}</p>
          <p className="mt-1 text-xs text-zinc-500">Latest eight expenses in view</p>
        </div>
        <div className="ui-card p-6 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Quick actions</span>
            <Link
              to="/submit"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              New expense <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/submit" className="ui-btn-primary">
              Submit expense
            </Link>
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <Link to="/approvals" className="ui-btn-secondary">
                Open approvals
              </Link>
            )}
          </div>
        </div>
      </div>

      {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && chartData.length > 0 && (
        <div className="ui-card p-6">
          <h2 className="text-sm font-semibold text-zinc-900">Spend by category</h2>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#fafafa' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
                  }}
                  labelStyle={{ fontWeight: 600, color: '#18181b' }}
                />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Recent activity</h2>
        {loading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="ui-table-wrap mt-4">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>In {company?.defaultCurrency}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <p className="p-10 text-center text-sm text-zinc-500">No expenses yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
