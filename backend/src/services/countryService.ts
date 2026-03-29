const CACHE_MS = 1000 * 60 * 60 * 6;
let cache: { at: number; data: CountryRow[] } | null = null;

export type CountryRow = {
  name: string;
  code: string;
  currencies: string[];
};

export async function fetchCountries(): Promise<CountryRow[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const res = await fetch(
    'https://restcountries.com/v3.1/all?fields=name,cca2,currencies'
  );
  if (!res.ok) throw new Error('Failed to fetch countries');
  const raw = (await res.json()) as Array<{
    name: { common: string };
    cca2: string;
    currencies?: Record<string, { name: string; symbol: string }>;
  }>;
  const data: CountryRow[] = raw
    .map((c) => ({
      name: c.name.common,
      code: c.cca2,
      currencies: c.currencies ? Object.keys(c.currencies) : [],
    }))
    .filter((c) => c.currencies.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  cache = { at: Date.now(), data };
  return data;
}

/** Returns primary currency code for ISO2 country code, or USD fallback */
export async function getDefaultCurrencyForCountry(
  countryCode: string
): Promise<string> {
  const countries = await fetchCountries();
  const row = countries.find(
    (c) => c.code.toUpperCase() === countryCode.toUpperCase()
  );
  return row?.currencies[0] ?? 'USD';
}
