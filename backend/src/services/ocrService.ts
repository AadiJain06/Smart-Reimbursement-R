import Tesseract from 'tesseract.js';
import path from 'path';

export type OcrResult = {
  rawText: string;
  amount: number | null;
  date: string | null;
  vendor: string | null;
  description: string | null;
};

function parseAmount(text: string): number | null {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const amountRegex =
    /(?:USD|EUR|GBP|INR|\$|€|£|Rs\.?)?\s*([\d,]+\.?\d*)\s*(?:USD|EUR|GBP|INR|\$|€|£)?/gi;
  let best: number | null = null;
  for (const line of lines) {
    let m: RegExpExecArray | null;
    const re = new RegExp(amountRegex.source, 'gi');
    while ((m = re.exec(line)) !== null) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (!Number.isNaN(n) && n > 0 && n < 1e9) {
        if (best === null || n > best) best = n;
      }
    }
  }
  const totalMatch = text.match(/total[:\s]+(?:USD|EUR|\$)?\s*([\d,]+\.?\d*)/i);
  if (totalMatch) {
    const n = parseFloat(totalMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return best;
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
  return null;
}

function guessVendor(lines: string[]): string | null {
  const skip = /^(total|sub|tax|date|receipt|invoice|thank)/i;
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && !skip.test(line)) return line.slice(0, 120);
  }
  return lines[0]?.slice(0, 120) ?? null;
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
  const amount = parseAmount(cleaned);
  const date = parseDate(cleaned);
  const vendor = guessVendor(lines);
  const description = lines.slice(0, 3).join(' · ').slice(0, 500) || null;

  return {
    rawText: cleaned.slice(0, 8000),
    amount,
    date,
    vendor,
    description,
  };
}
