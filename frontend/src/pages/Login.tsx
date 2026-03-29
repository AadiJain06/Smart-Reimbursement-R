import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AuthShell } from '@/components/AuthShell';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type Form = z.infer<typeof schema>;

export function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    try {
      const res = await api.post('/api/auth/login', data);
      setSession(res.data.token, res.data.user, res.data.company);
      toast.success('Welcome back');
      navigate('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <AuthShell
      title="Sign in to your workspace"
      subtitle="Submit expenses, track approvals, and see spend in your company currency."
      footer={
        <>
          No account?{' '}
          <Link to="/signup" className="ui-link">
            Create a company
          </Link>
        </>
      }
    >
      <div className="ui-card p-8 shadow-card-hover">
        <h2 className="text-lg font-semibold text-zinc-900">Sign in</h2>
        <p className="mt-1 text-sm text-zinc-500">Use your work email to continue.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div>
            <label className="ui-label">Email</label>
            <input className="ui-input" type="email" autoComplete="email" {...register('email')} />
            {errors.email && (
              <p className="mt-1.5 text-sm text-rose-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="ui-label">Password</label>
            <input
              className="ui-input"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="ui-btn-primary w-full">
            {isSubmitting ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
