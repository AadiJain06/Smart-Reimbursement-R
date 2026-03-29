import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ScanLine } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const schema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(4),
  category: z.string().min(1),
  description: z.string().optional(),
  date: z.string().min(1),
});

type Form = z.infer<typeof schema>;

export function SubmitExpense() {
  const cc = useAuthStore((s) => s.company?.defaultCurrency ?? 'USD');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: cc,
      date: new Date().toISOString().slice(0, 10),
      category: 'Travel',
    },
  });

  const runOcr = async () => {
    if (!receipt) {
      toast.error('Choose a receipt image first');
      return;
    }
    setOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', receipt);
      const { data } = await api.post<{
        amount: number | null;
        date: string | null;
        vendor: string | null;
        description: string | null;
      }>('/api/ocr/scan', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.amount != null) setValue('amount', data.amount);
      if (data.date) setValue('date', data.date.slice(0, 10));
      if (data.vendor) setValue('category', data.vendor.slice(0, 80));
      if (data.description) setValue('description', data.description);
      toast.success('OCR applied — review fields');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'OCR failed');
    } finally {
      setOcrLoading(false);
    }
  };

  const onSubmit = async (data: Form) => {
    try {
      const fd = new FormData();
      fd.append('amount', String(data.amount));
      fd.append('currency', data.currency);
      fd.append('category', data.category);
      if (data.description) fd.append('description', data.description);
      fd.append('date', new Date(data.date).toISOString());
      if (receipt) fd.append('receipt', receipt);
      await api.post('/api/expenses', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Expense submitted');
      setReceipt(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-bold text-white">Submit expense</h1>
      <p className="mt-2 text-slate-400">
        Amounts are converted to {cc}. Upload a receipt and run OCR to autofill.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm text-slate-400">Receipt image</label>
          <input
            type="file"
            accept="image/*"
            className="mt-1 w-full text-sm text-slate-300"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={runOcr}
            disabled={ocrLoading}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-brand-600/50 px-4 py-2 text-sm text-brand-300 hover:bg-brand-900/30 disabled:opacity-50"
          >
            <ScanLine className="h-4 w-4" />
            {ocrLoading ? 'Scanning…' : 'Run OCR & autofill'}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-slate-400">Amount</label>
            <input
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-rose-400">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400">Currency</label>
            <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5" {...register('currency')} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400">Category / vendor</label>
          <input className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5" {...register('category')} />
        </div>

        <div>
          <label className="block text-sm text-slate-400">Description</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5"
            {...register('description')}
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400">Date</label>
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5" {...register('date')} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-brand-600 py-3 font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting…' : 'Submit expense'}
        </button>
      </form>
    </div>
  );
}
