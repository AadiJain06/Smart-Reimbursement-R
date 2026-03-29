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
  expenseType: z.string().optional(),
  description: z.string().optional(),
  expenseLinesText: z.string().optional(),
  date: z.string().min(1),
});

type Form = z.infer<typeof schema>;

type OcrLine = { description: string; amount: number | null; quantity?: number | null };

type OcrScanResponse = {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  description: string | null;
  expenseType: string | null;
  expenseLines: OcrLine[];
  detectedCurrency: string | null;
  rawText: string;
};

export function SubmitExpense() {
  const cc = useAuthStore((s) => s.company?.defaultCurrency ?? 'USD');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [lastOcr, setLastOcr] = useState<OcrScanResponse | null>(null);

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
      category: 'General',
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
      const { data } = await api.post<OcrScanResponse>('/api/ocr/scan', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLastOcr(data);

      if (data.amount != null) setValue('amount', data.amount);
      if (data.date) setValue('date', data.date.slice(0, 10));
      if (data.detectedCurrency) setValue('currency', data.detectedCurrency);
      if (data.vendor) setValue('category', data.vendor.slice(0, 120));
      if (data.expenseType) setValue('expenseType', data.expenseType);
      if (data.description) setValue('description', data.description);
      if (data.expenseLines?.length) {
        const text = data.expenseLines
          .map((l) => {
            const q = l.quantity != null ? `${l.quantity} × ` : '';
            const a = l.amount != null ? ` — ${l.amount.toFixed(2)}` : '';
            return `${q}${l.description}${a}`;
          })
          .join('\n');
        setValue('expenseLinesText', text);
      }
      toast.success('OCR applied — review before submit');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'OCR failed');
    } finally {
      setOcrLoading(false);
    }
  };

  const onSubmit = async (data: Form) => {
    try {
      const ocrMetadata: Record<string, unknown> = {
        ...(lastOcr ?? {}),
        expenseType: data.expenseType ?? lastOcr?.expenseType ?? null,
        category: data.category,
        expenseLines: lastOcr?.expenseLines ?? [],
        expenseLinesText: data.expenseLinesText ?? null,
        vendor: lastOcr?.vendor ?? null,
      };

      const fd = new FormData();
      fd.append('amount', String(data.amount));
      fd.append('currency', data.currency);
      fd.append('category', data.category);
      if (data.description) fd.append('description', data.description);
      fd.append('date', new Date(data.date).toISOString());
      fd.append('ocrMetadata', JSON.stringify(ocrMetadata));
      if (receipt) fd.append('receipt', receipt);

      await api.post('/api/expenses', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Expense submitted');
      setReceipt(null);
      setLastOcr(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="ui-page mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Submit expense</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        Run OCR on a receipt to prefill <strong className="font-medium text-zinc-700">amount</strong>,{' '}
        <strong className="font-medium text-zinc-700">date</strong>,{' '}
        <strong className="font-medium text-zinc-700">vendor</strong>,{' '}
        <strong className="font-medium text-zinc-700">type</strong>, and{' '}
        <strong className="font-medium text-zinc-700">line items</strong>. Values convert to{' '}
        <span className="font-medium text-zinc-800">{cc}</span> on submit.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="ui-card mt-8 space-y-6 p-6 sm:p-8">
        <div>
          <label className="ui-label">Receipt image</label>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={runOcr}
            disabled={ocrLoading}
            className="ui-btn-secondary mt-3 gap-2"
          >
            <ScanLine className="h-4 w-4" />
            {ocrLoading ? 'Scanning…' : 'Run OCR & autofill'}
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="ui-label">Amount</label>
            <input
              type="number"
              step="0.01"
              className="ui-input"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="mt-1.5 text-sm text-rose-600">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <label className="ui-label">Currency</label>
            <input className="ui-input" {...register('currency')} />
          </div>
        </div>

        <div>
          <label className="ui-label">Vendor / merchant</label>
          <input
            className="ui-input"
            placeholder="e.g. Café Blue, Shell"
            {...register('category')}
          />
        </div>

        <div>
          <label className="ui-label">Expense type (OCR inferred)</label>
          <input
            className="ui-input"
            placeholder="e.g. Food & Dining"
            {...register('expenseType')}
          />
        </div>

        <div>
          <label className="ui-label">Line items</label>
          <textarea
            rows={5}
            className="ui-textarea font-mono text-xs"
            placeholder="Populated from OCR when line items are detected…"
            {...register('expenseLinesText')}
          />
        </div>

        <div>
          <label className="ui-label">Notes</label>
          <textarea rows={3} className="ui-textarea" {...register('description')} />
        </div>

        <div>
          <label className="ui-label">Date</label>
          <input type="date" className="ui-input" {...register('date')} />
        </div>

        <button type="submit" disabled={isSubmitting} className="ui-btn-primary w-full">
          {isSubmitting ? 'Submitting…' : 'Submit expense'}
        </button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-zinc-500">
        Signup currency uses{' '}
        <a
          className="ui-link"
          href="https://restcountries.com/v3.1/all?fields=name,currencies"
          target="_blank"
          rel="noreferrer"
        >
          REST Countries
        </a>
        . FX uses{' '}
        <a
          className="ui-link"
          href={`https://api.exchangerate-api.com/v4/latest/${cc}`}
          target="_blank"
          rel="noreferrer"
        >
          ExchangeRate-API
        </a>
        .
      </p>
    </div>
  );
}
