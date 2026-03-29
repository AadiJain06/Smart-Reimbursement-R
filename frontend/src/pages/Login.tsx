import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

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
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-bold text-white">Sign in</h1>
      <p className="mt-2 text-slate-400">Access your reimbursement workspace.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-slate-400">Email</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-rose-400">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-slate-400">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            {...register('password')}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/signup" className="text-brand-400 hover:underline">
          Create company
        </Link>
      </p>
    </div>
  );
}
