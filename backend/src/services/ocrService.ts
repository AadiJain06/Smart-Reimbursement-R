import Tesseract from 'tesseract.js';
import path from 'path';

/** One line item parsed from a receipt (e.g. menu row, fuel line). */
export type OcrExpenseLine = {
  description: string;
  amount: number | null;
  quantity?: number | null;
};

export type OcrResult = {
  rawText: string;
  amount: number | null;
  date: string | null;
  /** Merchant / restaurant / store name */
  vendor: string | null;
  description: string | null;
  /** Broad category inferred from receipt wording (e.g. Food & Dining, Travel). */
  expenseType: string | null;
  /** Parsed line items when detectable (qty × item … price). */
  expenseLines: OcrExpenseLine[];
  /** ISO 4217 if a currency symbol/code was detected near totals */
  detectedCurrency: string | null;
};

function parseAmount(text: string): { total: number | null; currency: string | null } {
  const currencyHints: { re: RegExp; code: string }[] = [
    { re: /\b(USD|\$)\b/i, code: 'USD' },
    { re: /€|EUR/i, code: 'EUR' },
    { re: /£|GBP/i, code: 'GBP' },
    { re: /₹|INR|Rs\.?/i, code: 'INR' },
  ];
  let detectedCurrency: string | null = null;
  for (const { re, code } of currencyHints) {
    if (re.test(text)) {
      detectedCurrency = code;
      break;
    }
  }

  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  let best: number | null = null;

  const totalMatch = text.match(
    /(?:total|amount\s*due|balance\s*due|grand\s*total)[:\s]*(?:USD|EUR|GBP|INR|\$|€|£|₹)?\s*([\d,]+\.?\d{0,2})/i
  );
  if (totalMatch) {
    const n = parseFloat(totalMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(n) && n > 0 && n < 1e9) return { total: n, currency: detectedCurrency };
  }

  const amountLike = /(?:^|[^\d])([\d,]+\.\d{2})\s*$/;
  for (const line of lines) {
    const m = line.match(amountLike);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (!Number.isNaN(n) && n > 0 && n < 1e9) {
        if (best === null || n > best) best = n;
      }
    }
  }

  if (best === null) {
    for (const line of lines) {
      const re = /([\d,]+\.?\d*)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const n = parseFloat(m[1].replace(/,/g, ''));
        if (!Number.isNaN(n) && n > 0.5 && n < 1e9) {
          if (best === null || n > best) best = n;
        }
      }
    }
  }

  return { total: best, currency: detectedCurrency };
}

function parseDate(text: string): string | null {
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dmy = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    const pad = (s: string) => s.padStart(2, '0');
    return `${y}-${pad(dmy[2])}-${pad(dmy[1])}`;
  }
  const mdy = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/);
  if (mdy && parseInt(mdy[1], 10) <= 12) {
    const pad = (s: string) => s.padStart(2, '0');
    return `${mdy[3]}-${pad(mdy[1])}-${pad(mdy[2])}`;
  }
  return null;
}

const SKIP_VENDOR = /^(total|sub|tax|date|receipt|invoice|thank|order|tel|phone|www\.|http|cashier|table|server)/i;
const PHONE = /^[\d\s\-+().]{7,}$/;

function guessVendor(lines: string[]): string | null {
  for (const line of lines.slice(0, 8)) {
    const t = line.trim();
    if (t.length < 3 || t.length > 80) continue;
    if (SKIP_VENDOR.test(t)) continue;
    if (PHONE.test(t)) continue;
    if (/^\d+[/.-]\d+/.test(t)) continue;
    return t.slice(0, 120);
  }
  return lines[0]?.slice(0, 120).trim() || null;
}

function inferExpenseType(text: string, vendor: string | null): string | null {
  const blob = `${text}\n${vendor ?? ''}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/restaurant|cafe|coffee|kitchen|diner|pizza|burger|bistro|bar\s*&|food\s*court|mcdonald|starbucks|domino/i, 'Food & Dining'],
    [/hotel|motel|inn|suites|resort|lodging|airbnb/i, 'Lodging'],
    [/flight|airline|airport|boarding|jetblue|delta|united\s*air/i, 'Travel — Air'],
    [/uber|lyft|taxi|cab|fuel|gas\s*station|shell|exxon|bp\s|parking\s*meter/i, 'Transport'],
    [/pharmacy|drugstore|cvs|walgreens|medical/i, 'Medical'],
    [/office\s*depot|staples|supplies|software|saas/i, 'Office & Supplies'],
    [/grocery|supermarket|walmart\s*grocery|whole\s*foods/i, 'Groceries'],
  ];
  for (const [re, label] of rules) {
    if (re.test(blob)) return label;
  }
  return null;
}

/**
 * Heuristic line-item extraction: lines that look like "description ... 12.34"
 * or "2 x Item ... 24.00"
 */
function extractExpenseLines(text: string): OcrExpenseLine[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const out: OcrExpenseLine[] = [];
  const lineRe = /^(.+?)\s+(?:x\s*)?([\d,]+\.\d{2})\s*$/i;
  const qtyRe = /^(\d+)\s*[x×]\s*(.+?)\s+([\d,]+\.\d{2})\s*$/i;

  for (const line of lines) {
    if (/^(total|subtotal|tax|tip|balance|change|cash|visa|mastercard)/i.test(line)) continue;
    let m = line.match(qtyRe);
    if (m) {
      const qty = parseInt(m[1], 10);
      const desc = m[2].trim();
      const amt = parseFloat(m[3].replace(/,/g, ''));
      if (desc.length > 1 && !Number.isNaN(amt)) {
        out.push({ description: desc.slice(0, 200), amount: amt, quantity: qty });
      }
      continue;
    }
    m = line.match(lineRe);
    if (m && m[1].length > 2) {
      const desc = m[1].replace(/\s+$/,'').trim();
      const amt = parseFloat(m[2].replace(/,/g, ''));
      if (!Number.isNaN(amt) && amt > 0 && amt < 1e6 && desc.length < 200) {
        if (!/^\d+\.?\d*$/.test(desc)) {
          out.push({ description: desc, amount: amt });
        }
      }
    }
  }
  return out.slice(0, 40);
}

export async function scanReceiptImage(filePath: string): Promise<OcrResult> {
  const abs = path.resolve(filePath);
  const {
    data: { text },
  } = await Tesseract.recognize(abs, 'eng', {
    logger: () => {},
  });
  const cleaned = text.replace(/\r/g, '\n');
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

  const { total: amount, currency: detectedCurrency } = parseAmount(cleaned);
  const date = parseDate(cleaned);
  const vendor = guessVendor(lines);
  const expenseType = inferExpenseType(cleaned, vendor);
  const expenseLines = extractExpenseLines(cleaned);

  const summaryLines = lines.slice(0, 4).join(' · ');
  const lineSummary =
    expenseLines.length > 0
      ? expenseLines
          .slice(0, 8)
          .map((l) => `${l.description}${l.quantity ? ` ×${l.quantity}` : ''}: ${l.amount ?? '?'}`)
          .join('; ')
      : '';
  const description = [summaryLines, lineSummary].filter(Boolean).join('\n').slice(0, 2000) || null;

  return {
    rawText: cleaned.slice(0, 8000),
    amount,
    date,
    vendor,
    description,
    expenseType,
    expenseLines,
    detectedCurrency,
  };
}
