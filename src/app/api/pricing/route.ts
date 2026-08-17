import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { DEFAULT_PRICING } from '@/lib/pricing';
import { auth } from '@/auth';

const DOC_ID = 'default' as const;

// Single source of truth — see src/lib/pricing.ts
const DEFAULT = DEFAULT_PRICING;

/* Requires a session. This returns every per-kg rate, zone multiplier and
   country rate card — the full margin structure. Public quotes compute
   server-side via /api/quote, so nothing unauthenticated needs this. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const doc = await db.collection('pricing_settings').findOne({ _id: DOC_ID as any });
    const s = (doc?.settings || {}) as any;
        const settings = {
      ...DEFAULT,
      ...s,
      air: { ...DEFAULT.air, ...(s.air || {}) },
      sea: { ...DEFAULT.sea, ...(s.sea || {}) },
      land: { ...DEFAULT.land, ...(s.land || {}) },
      ...(s.countryRates ? { countryRates: s.countryRates } : {}),
      ...(s.zoneTable ? { zoneTable: s.zoneTable } : {}),
    };
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: true, settings: DEFAULT });
  }
}