import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { fetchCountriesFromRestApi } from '@/services/countries';
import { useAuthStore } from '@/store/authStore';
import { AuthShell } from '@/components/AuthShell';

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
  const [countriesSource, setCountriesSource] = useState<'api' | 'direct' | null>(null);
  const [countriesLoading, setCountriesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCountriesLoading(true);
      try {
        const { data } = await api.get<Country[]>('/api/meta/countries');
        if (!cancelled) {
          setCountries(data);
          setCountriesSource('api');
        }
      } catch {
        try {
          const data = await fetchCountriesFromRestApi();
          if (!cancelled) {
            setCountries(data);
            setCountriesSource('direct');
          }
        } catch {
          if (!cancelled) {
            toast.error('Could not load countries. Check your network and try again.');
          }
        }
      } finally {
        if (!cancelled) setCountriesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
    <AuthShell
      title="Create your company"
      subtitle="We set your default currency from the country you select, using live country data."
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="ui-link">
            Sign in
          </Link>
        </>
      }
    >
      <div className="ui-card p-8 shadow-card-hover">
        <h2 className="text-lg font-semibold text-zinc-900">Company &amp; admin</h2>
        <p className="mt-1 text-sm text-zinc-500">You’ll be the first administrator.</p>
        {countriesSource === 'direct' && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Country list loaded directly from REST Countries. Start the backend before submitting if
            it’s not running — signup still needs the API.
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="ui-label">Company name</label>
            <input className="ui-input" {...register('companyName')} />
            {errors.companyName && (
              <p className="mt-1.5 text-sm text-rose-600">{errors.companyName.message}</p>
            )}
          </div>
          <div>
            <label className="ui-label">Country</label>
            <select
              className="ui-select"
              disabled={countriesLoading || countries.length === 0}
              {...register('countryCode')}
            >
              {countriesLoading || countries.length === 0 ? (
                <option value="US">Loading countries…</option>
              ) : (
                countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.currencies[0]})
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="ui-label">Your name</label>
            <input className="ui-input" {...register('adminName')} />
          </div>
          <div>
            <label className="ui-label">Work email</label>
            <input className="ui-input" type="email" {...register('adminEmail')} />
          </div>
          <div>
            <label className="ui-label">Password</label>
            <input className="ui-input" type="password" {...register('adminPassword')} />
            <p className="mt-1 text-xs text-zinc-400">At least 8 characters.</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || countriesLoading || countries.length === 0}
            className="ui-btn-primary w-full"
          >
            {isSubmitting ? 'Creating…' : 'Create workspace'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
