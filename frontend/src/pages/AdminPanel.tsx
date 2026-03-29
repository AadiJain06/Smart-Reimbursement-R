import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['MANAGER', 'EMPLOYEE']),
  managerId: z.string().optional(),
});

type UserForm = z.infer<typeof userSchema>;

type UserRow = { id: string; email: string; name: string; role: string; managerId: string | null };

export function AdminPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rules, setRules] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const [ruleJson, setRuleJson] = useState(
    JSON.stringify(
      {
        sequential: [
          { assignee: 'role:MANAGER', label: 'Manager' },
          { assignee: 'role:ADMIN', label: 'Finance' },
        ],
        parallelGate: {
          assignees: ['role:ADMIN'],
          percentageThreshold: 60,
          orUserIds: [] as string[],
        },
      },
      null,
      2
    )
  );
  const [ruleName, setRuleName] = useState('Custom workflow');

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'EMPLOYEE' },
  });

  const load = async () => {
    const [u, r] = await Promise.all([
      api.get<UserRow[]>('/api/users'),
      api.get('/api/rules'),
    ]);
    setUsers(u.data);
    setRules(r.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('Failed to load admin data'));
  }, []);

  const onUser = async (data: UserForm) => {
    try {
      await api.post('/api/users', {
        ...data,
        managerId: data.managerId || undefined,
      });
      toast.success('User created');
      reset();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const onRule = async () => {
    try {
      const definition = JSON.parse(ruleJson);
      await api.post('/api/rules', {
        name: ruleName,
        isDefault: true,
        definition,
      });
      toast.success('Rule saved');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid JSON or request');
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Admin</h1>
        <p className="mt-2 text-slate-400">Users and approval rules for your company.</p>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Create user</h2>
        <form onSubmit={handleSubmit(onUser)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-slate-400">Name</label>
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" {...register('name')} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Email</label>
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" {...register('email')} />
          </div>
          <div>
            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              {...register('password')}
            />
          </div>
          <div>
            <label className="text-sm text-slate-400">Role</label>
            <select className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2" {...register('role')}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-slate-400">Reporting manager (optional)</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
              {...register('managerId')}
            >
              <option value="">— None —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Create user
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Workflow rule (JSON)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sequential steps, then optional parallel gate with % threshold and/or CFO user IDs.
        </p>
        <input
          className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="Rule name"
        />
        <textarea
          className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs leading-relaxed text-slate-200"
          rows={16}
          value={ruleJson}
          onChange={(e) => setRuleJson(e.target.value)}
        />
        <button
          type="button"
          onClick={onRule}
          className="mt-4 rounded-xl bg-brand-600 px-6 py-2.5 font-medium text-white hover:bg-brand-500"
        >
          Save rule as default
        </button>
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-300">Existing rules</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {rules.map((r) => (
              <li key={r.id}>
                {r.name} {r.isDefault && '(default)'}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Override (API)</h2>
        <p className="mt-2 text-sm text-slate-500">
          Use POST /api/override with expenseId and approve: true|false from tools or API client for edge cases.
        </p>
      </section>
    </div>
  );
}
