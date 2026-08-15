// src/lib/fx.ts
import clientPromise from '@/lib/mongodb';
 
/* Exchange rates expressed as: units of CURRENCY per 1 USD.
   All pricing settings are denominated in USD, so every conversion
   goes through USD as the pivot. */
 
const FX_DOC_ID = 'rates' as const;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refresh once a day
const SOURCE = 'https://open.er-api.com/v6/latest/USD';
 
/* Last-resort snapshot, used only if the API is unreachable AND
   nothing has been cached yet. Deliberately conservative and clearly
   stale — better a wrong-but-sane number than a 750x error. */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.52, NZD: 1.64,
  CHF: 0.88, JPY: 157, CNY: 7.24, INR: 83.5, KRW: 1380, SGD: 1.35,
  AED: 3.67, SAR: 3.75, ZAR: 18.2, NGN: 1600, GHS: 15.2, KES: 129,
  EGP: 48, BRL: 5.6, MXN: 18.5, TRY: 34, RUB: 92, PLN: 3.95,
  SEK: 10.6, NOK: 10.8, DKK: 6.85, MYR: 4.4, THB: 34.5, PHP: 57,
  ARS: 990,
};
 
type FxDoc = { rates: Record<string, number>; fetchedAt: number; source: string };
 
let memoryCache: FxDoc | null = null;
 
async function readCache(): Promise<FxDoc | null> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache;
  }
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const doc = await db.collection('fx_rates').findOne({ _id: FX_DOC_ID as any });
    if (doc?.rates && doc?.fetchedAt) {
      const cached = { rates: doc.rates, fetchedAt: doc.fetchedAt, source: doc.source || 'cache' };
      memoryCache = cached;
      return cached;
    }
  } catch {}
  return null;
}
 
async function writeCache(doc: FxDoc): Promise<void> {
  memoryCache = doc;
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    await db.collection('fx_rates').updateOne(
      { _id: FX_DOC_ID as any },
      { $set: doc },
      { upsert: true }
    );
  } catch {}
}
 
/**
 * Returns { CURRENCY: unitsPerUsd }. Refreshes at most once a day.
 * Never throws — falls back to the last cache, then to the snapshot.
 */
export async function getRates(): Promise<Record<string, number>> {
  const cached = await readCache();
  const fresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  if (cached && fresh) return cached.rates;
 
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 3600 } } as any);
    const json: any = await res.json();
    if (json?.result === 'success' && json?.rates?.USD === 1) {
      const doc: FxDoc = {
        rates: json.rates,
        fetchedAt: Date.now(),
        source: 'open.er-api.com',
      };
      await writeCache(doc);
      return doc.rates;
    }
  } catch {}
 
  // API failed — stale cache still beats the snapshot
  if (cached) return cached.rates;
  return FALLBACK_RATES;
}
 
/** How many units of `currency` equal 1 USD. Returns 1 for unknown codes. */
export async function getRateToUsd(currency: string): Promise<number> {
  const code = String(currency || 'USD').toUpperCase();
  if (code === 'USD') return 1;
  const rates = await getRates();
  const r = Number(rates[code]);
  return Number.isFinite(r) && r > 0 ? r : 1;
}
 
/** Convert an amount in `currency` into USD. */
export function toUsd(amount: number, rate: number): number {
  const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return amount / r;
}
 
/** Convert a USD amount into `currency`. */
export function fromUsd(amountUsd: number, rate: number): number {
  const r = Number.isFinite(rate) && rate > 0 ? rate : 1;
  return amountUsd * r;
}