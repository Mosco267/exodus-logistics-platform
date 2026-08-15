import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { DEFAULT_PRICING } from '@/lib/pricing';

const DOC_ID = 'default' as const;

// Single source of truth — see src/lib/pricing.ts
const DEFAULT = DEFAULT_PRICING;

export async function GET() {
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
    };
    return NextResponse.json({ ok: true, settings });
  } catch {
    return NextResponse.json({ ok: true, settings: DEFAULT });
  }
}