/**
 * Exchange rates from https://api.exchangerate-api.com/v4/latest/{BASE}
 * Rates are: 1 BASE = rate[CUR] units of CUR
 */

const cache = new Map<string, { at: number; rates: Record<string, number> }>();
const TTL_MS = 1000 * 60 * 30;

async function getRates(baseCurrency: string): Promise<Record<string, number>> {
  const key = baseCurrency.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rates;
  const res = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(key)}`
  );
  if (!res.ok) throw new Error(`Currency API error: ${res.status}`);
  const body = (await res.json()) as { rates: Record<string, number> };
  cache.set(key, { at: Date.now(), rates: body.rates });
  return body.rates;
}

/**
 * Convert `amount` from `fromCurrency` to `toCurrency` (company currency).
 */
export async function convertToCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;
  const rates = await getRates(to);
  const rateFrom = rates[from];
  if (rateFrom === undefined) {
    throw new Error(`Unknown currency pair: ${from} -> ${to}`);
  }
  // rates[from] = how many `from` units per 1 `to` base unit... 
  // API v4/latest/USD gives rates.EUR = euros per 1 USD
  // So amount USD to EUR: amount * rates.EUR
  // Our base is `to`. So we fetch latest/{to} — then rates[from] = units of `from` per 1 `to`? 
  // Actually exchangerate-api doc: base USD, rates.EUR means 1 USD = X EUR? 
  // Typically: "rates": { "EUR": 0.92 } means 1 USD = 0.92 EUR
  // So amount in USD * rates.EUR = EUR amount. Good.

  // If base is EUR and we want USD->EUR: fetch latest/EUR
  // rates.USD = how many USD per 1 EUR
  // So 100 USD to EUR: 100 / rates.USD = EUR

  const r = rates[from];
  return amount / r;
}
