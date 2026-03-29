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
    <div className="ui-page space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Admin</h1>
        <p className="mt-2 text-sm text-zinc-500">People, reporting lines, and approval workflows.</p>
      </div>

      <section className="ui-card p-6 sm:p-8">
        <h2 className="text-sm font-semibold text-zinc-900">Create user</h2>
        <p className="mt-1 text-sm text-zinc-500">Invite employees and managers to the workspace.</p>
        <form onSubmit={handleSubmit(onUser)} className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="ui-label">Name</label>
            <input className="ui-input" {...register('name')} />
          </div>
          <div>
            <label className="ui-label">Email</label>
            <input className="ui-input" type="email" {...register('email')} />
          </div>
          <div>
            <label className="ui-label">Password</label>
            <input className="ui-input" type="password" {...register('password')} />
          </div>
          <div>
            <label className="ui-label">Role</label>
            <select className="ui-select" {...register('role')}>
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="ui-label">Reporting manager (optional)</label>
            <select className="ui-select" {...register('managerId')}>
              <option value="">— None —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={isSubmitting} className="ui-btn-primary">
              {isSubmitting ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </section>

      <section className="ui-card p-6 sm:p-8">
        <h2 className="text-sm font-semibold text-zinc-900">Workflow rule</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Define sequential steps and optional parallel gates (percentage + CFO shortcut).
        </p>
        <input
          className="ui-input mt-5"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          placeholder="Rule name"
        />
        <textarea
          className="ui-textarea mt-3 font-mono text-xs leading-relaxed"
          rows={16}
          value={ruleJson}
          onChange={(e) => setRuleJson(e.target.value)}
        />
        <button type="button" onClick={onRule} className="ui-btn-primary mt-4">
          Save as default rule
        </button>
        <div className="mt-8 border-t border-zinc-100 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Saved rules</h3>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            {rules.map((r) => (
              <li key={r.id}>
                {r.name} {r.isDefault && <span className="text-zinc-400">· default</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-6 py-5 sm:px-8">
        <h2 className="text-sm font-semibold text-zinc-900">Admin override</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Use <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-zinc-200">POST /api/override</code> with{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-zinc-200">expenseId</code> and{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-zinc-200">approve: boolean</code> from your API
          client when you need a hard override.
        </p>
      </section>
    </div>
  );
}
