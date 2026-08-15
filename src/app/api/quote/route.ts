// src/app/api/quote/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  computeInvoice,
  autoSelectMeans,
  getDeliveryDays,
  DEFAULT_PRICING,
  type PricingProfiles,
  type ShipmentScope,
  type ServiceLevel,
  type ShipmentType,
} from '@/lib/pricing';
import { getCountryDistance, getStateDistance } from '@/lib/distances';
import { addBusinessDays } from '@/lib/holidays';
import { getRateToUsd } from '@/lib/fx';
 
const DOC_ID = 'default' as const;
 
/* Limits mirrored from the new-shipment page */
const WEIGHT_MAX = 30000;
const LENGTH_MAX = 1200;
const WIDTH_MAX = 300;
const HEIGHT_MAX = 300;
 
/* Simple in-memory rate limit. Quotes are public, and pricing settings
   are commercially sensitive, so this stops trivial scraping. On serverless
   it resets per instance — put Redis behind it if that matters. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();
 
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT;
}
 
async function loadPricing(): Promise<PricingProfiles> {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const doc = await db.collection('pricing_settings').findOne({ _id: DOC_ID as any });
    const s = (doc?.settings || {}) as any;
    return {
      ...DEFAULT_PRICING,
      ...s,
      international: { ...DEFAULT_PRICING.international, ...(s.international || {}) },
      local: { ...DEFAULT_PRICING.local, ...(s.local || {}) },
      air: { ...DEFAULT_PRICING.air, ...(s.air || {}) },
      sea: { ...DEFAULT_PRICING.sea, ...(s.sea || {}) },
      land: { ...DEFAULT_PRICING.land, ...(s.land || {}) },
    };
  } catch {
    return DEFAULT_PRICING;
  }
}
 
const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
 
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
 
  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED' },
      { status: 429 }
    );
  }
 
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'BAD_JSON' }, { status: 400 });
  }
 
  const scope: ShipmentScope = body.scope === 'local' ? 'local' : 'international';
  const senderCountryCode = String(body.senderCountryCode || '').toUpperCase().slice(0, 2);
  const receiverCountryCode = String(body.receiverCountryCode || '').toUpperCase().slice(0, 2);
  const senderState = String(body.senderState || '').slice(0, 100);
  const receiverState = String(body.receiverState || '').slice(0, 100);
  const senderCity = String(body.senderCity || '').slice(0, 100);
  const receiverCity = String(body.receiverCity || '').slice(0, 100);
  const currency = String(body.currency || 'USD').toUpperCase().slice(0, 3);
  const shipmentType = String(body.shipmentType || 'Parcel') as ShipmentType;
 
  const actualWeight = num(body.weightKg);
  const length = num(body.lengthCm);
  const width = num(body.widthCm);
  const height = num(body.heightCm);
  const declaredValue = num(body.declaredValue);
  const requestedService: ServiceLevel =
    body.serviceLevel === 'Standard' ? 'Standard' : 'Express';
 
  /* ── Validation ─────────────────────────────────────────── */
  if (!senderCountryCode || !receiverCountryCode) {
    return NextResponse.json({ ok: false, error: 'MISSING_COUNTRY' }, { status: 400 });
  }
  if (actualWeight <= 0) {
    return NextResponse.json({ ok: false, error: 'MISSING_WEIGHT' }, { status: 400 });
  }
  if (declaredValue <= 0) {
    return NextResponse.json({ ok: false, error: 'MISSING_VALUE' }, { status: 400 });
  }
  if (
    actualWeight > WEIGHT_MAX ||
    length > LENGTH_MAX ||
    width > WIDTH_MAX ||
    height > HEIGHT_MAX
  ) {
    return NextResponse.json({ ok: false, error: 'OVER_LIMIT' }, { status: 400 });
  }
 
  /* ── Volumetric weight — chargeable is the greater ───────── */
  const volumetricWeight = (length * width * height) / 5000;
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);
  const volumetricApplied = volumetricWeight > actualWeight;
 
  /* ── Mode and service, matching new-shipment behaviour ───── */
  const means = autoSelectMeans(scope, requestedService, chargeableWeight, shipmentType);
 
  let serviceLevel: ServiceLevel = requestedService;
  if (means === 'sea') serviceLevel = 'Standard';
  else if (chargeableWeight >= 500) serviceLevel = 'Standard';
  const serviceDowngraded = serviceLevel !== requestedService;
 
  /* ── Distance and delivery window ────────────────────────── */
  const distanceKm =
    scope === 'local' && senderCountryCode && senderState && receiverState
      ? getStateDistance(senderCountryCode, senderState, receiverState)
      : getCountryDistance(senderCountryCode, receiverCountryCode);
 
  const delivery = getDeliveryDays(means, serviceLevel, distanceKm);
  const today = new Date();
  const deliveryMinISO = addBusinessDays(today, delivery.min).toISOString().split('T')[0];
  const deliveryMaxISO = addBusinessDays(today, delivery.max).toISOString().split('T')[0];
 
  /* ── The same calculator the invoice uses ────────────────── */
  const pricing = await loadPricing();
  const fxRate = await getRateToUsd(currency);

  let breakdown;
  try {
    breakdown = computeInvoice({
      scope,
      means,
      serviceLevel,
      weightKg: chargeableWeight,
      declaredValue,
      currency,
      fxRate,
      senderCountryCode,
      receiverCountryCode: receiverCountryCode || senderCountryCode,
      senderCity,
      senderState,
      receiverCity,
      receiverState,
      pricing,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'CALC_FAILED' }, { status: 500 });
  }
 
  const quoteNumber = `EXS-QT-${Date.now().toString(36).toUpperCase()}`;
  const validUntil = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
 
  /* Only the computed result goes back. Rates and multipliers stay server-side. */
  return NextResponse.json({
    ok: true,
    quote: {
      quoteNumber,
      validUntil,
      scope,
      means,
      serviceLevel,
      serviceDowngraded,
      shipmentType,
      currency,
      actualWeight,
      volumetricWeight: Number(volumetricWeight.toFixed(2)),
      chargeableWeight: Number(chargeableWeight.toFixed(2)),
      volumetricApplied,
      dimensionsCm: { length, width, height },
      declaredValue,
      distanceKm,
      deliveryMinDays: delivery.min,
      deliveryMaxDays: delivery.max,
      deliveryMinISO,
      deliveryMaxISO,
      charges: {
        baseFreight: Number(breakdown.baseFreight.toFixed(2)),
        fuel: Number(breakdown.fuel.toFixed(2)),
        insurance: Number(breakdown.insurance.toFixed(2)),
        handling: Number(breakdown.handling.toFixed(2)),
        customs: Number(breakdown.customs.toFixed(2)),
        tax: Number(breakdown.tax.toFixed(2)),
        discount: Number(breakdown.discount.toFixed(2)),
        total: Number(breakdown.total.toFixed(2)),
      },
      route: {
        senderCountryCode,
        senderState,
        senderCity,
        receiverCountryCode,
        receiverState,
        receiverCity,
      },
    },
  });
}