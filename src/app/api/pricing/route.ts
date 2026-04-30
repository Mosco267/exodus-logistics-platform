import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const DOC_ID = 'default' as const;

const DEFAULT = {
  international: { shippingFee: 120, handlingFee: 10, customsFee: 25, taxFee: 0, discountFee: 0, fuelRate: 0.10, insuranceRate: 0.02 },
  local: { shippingFee: 45, handlingFee: 5, customsFee: 0, taxFee: 0, discountFee: 0, fuelRate: 0.06, insuranceRate: 0.01 },
  air: { ratePerKgExpress: 8, ratePerKgStandard: 5, zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 } },
  sea: { ratePerKgStandard: 0.8, zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 } },
  land: { zoneRates: { zone1: 5, zone2: 15, zone3: 35, zone4: 60 }, expressMultiplier: 1.5 },
};

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