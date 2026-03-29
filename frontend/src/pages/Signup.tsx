import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  companyName: z.string().min(1),
  countryCode: z.string().length(2),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

type Form = z.infer<typeof schema>;

type Country = { name: string; code: string; currencies: string[] };

export function Signup() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Country[]>('/api/meta/countries');
        setCountries(data);
      } catch {
        toast.error('Could not load countries — is the API running?');
      }
    })();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { countryCode: 'US' } });

  const onSubmit = async (data: Form) => {
    try {
      const res = await api.post('/api/auth/signup', {
        ...data,
        countryCode: data.countryCode.toUpperCase(),
      });
      setSession(res.data.token, res.data.user, res.data.company);
      toast.success('Company created');
      navigate('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Signup failed');
    }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-bold text-white">Create company</h1>
      <p className="mt-2 text-slate-400">We set currency from your country automatically.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-slate-400">Company name</label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5"
            {...register('companyName')}
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-rose-400">{errors.companyName.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm text-slate-400">Country</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5"
            {...register('countryCode')}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currencies[0]})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400">Your name</label>
          <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5" {...register('adminName')} />
        </div>
        <div>
          <label className="block text-sm text-slate-400">Admin email</label>
          <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5" {...register('adminEmail')} />
        </div>
        <div>
          <label className="block text-sm text-slate-400">Password (min 8)</label>
          <input
            type="password"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5"
            {...register('adminPassword')}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create & sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
