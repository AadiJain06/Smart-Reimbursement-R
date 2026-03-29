/**
 * Same shape as GET /api/meta/countries — loads directly from REST Countries
 * when the backend is unavailable (e.g. signup before API is up).
 */
export type CountryRow = {
  name: string;
  code: string;
  currencies: string[];
};

export async function fetchCountriesFromRestApi(): Promise<CountryRow[]> {
  const res = await fetch(
    'https://restcountries.com/v3.1/all?fields=name,cca2,currencies'
  );
  if (!res.ok) throw new Error(`REST Countries: ${res.status}`);
  const raw = (await res.json()) as Array<{
    name: { common: string };
    cca2: string;
    currencies?: Record<string, { name: string; symbol: string }>;
  }>;
  return raw
    .map((c) => ({
      name: c.name.common,
      code: c.cca2,
      currencies: c.currencies ? Object.keys(c.currencies) : [],
    }))
    .filter((c) => c.currencies.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
