import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const DOC_ID = "default" as const;

export type PricingSettings = {
  // ✅ STORED AS DECIMALS in DB (0.10 = 10%)
  shippingRate: number;  // % of declared value
  insuranceRate: number; // % of shipping cost
  fuelRate: number;      // % of shipping cost
  customsRate: number;   // % of shipping cost
  taxRate: number;       // % of subtotal
  discountRate: number;  // % of subtotal (optional)
};

// ✅ DEFAULTS SHOULD BE DECIMALS
export const DEFAULT_PRICING: PricingSettings = {
  shippingRate: 0.10,
  insuranceRate: 0.10,
  fuelRate: 0.05,
  customsRate: 0.20,
  taxRate: 0.00,
  discountRate: 0.00,
};

type PricingSettingsDoc = {
  _id: typeof DOC_ID;
  settings: PricingSettings;
  updatedAt?: Date;
};

function toNum(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Accepts either "10" (meaning 10%) OR "0.10" (already decimal)
function toDecimalPercent(v: any, fallbackDecimal: number) {
  const raw = toNum(v, fallbackDecimal);

  // If someone sends 10, 8.5, etc -> treat as percent
  // If someone sends 0.10, 0.085 -> treat as decimal
  const dec = raw > 1 ? raw / 100 : raw;

  // Clamp to sane range (0..1) and round to avoid float noise
  const clamped = Math.min(Math.max(dec, 0), 1);
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

// If old DB stored 10 instead of 0.10, normalize on read too
function normalizeSettings(s: any): PricingSettings {
  const incoming = s || {};
  return {
    shippingRate: toDecimalPercent(incoming.shippingRate, DEFAULT_PRICING.shippingRate),
    insuranceRate: toDecimalPercent(incoming.insuranceRate, DEFAULT_PRICING.insuranceRate),
    fuelRate: toDecimalPercent(incoming.fuelRate, DEFAULT_PRICING.fuelRate),
    customsRate: toDecimalPercent(incoming.customsRate, DEFAULT_PRICING.customsRate),
    taxRate: toDecimalPercent(incoming.taxRate, DEFAULT_PRICING.taxRate),
    discountRate: toDecimalPercent(incoming.discountRate, DEFAULT_PRICING.discountRate),
  };
}

export async function GET() {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const doc = await db
      .collection<PricingSettingsDoc>("pricing_settings")
      .findOne({ _id: DOC_ID });

    const settings = normalizeSettings(doc?.settings ?? DEFAULT_PRICING);

    // (optional) auto-fix old bad DB values once admin opens page
    // If DB has 10, we rewrite to 0.10 silently.
    if (doc?.settings) {
      const rawAny = doc.settings as any;
      const looksLegacy =
        rawAny.shippingRate > 1 ||
        rawAny.insuranceRate > 1 ||
        rawAny.customsRate > 1 ||
        rawAny.fuelRate > 1;

      if (looksLegacy) {
        await db.collection<PricingSettingsDoc>("pricing_settings").updateOne(
          { _id: DOC_ID },
          { $set: { settings, updatedAt: new Date() } }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      settings,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const incoming = body?.settings ?? body ?? {};

    // ✅ Always store decimals in DB
    const settings: PricingSettings = normalizeSettings(incoming);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection<PricingSettingsDoc>("pricing_settings").updateOne(
      { _id: DOC_ID },
      { $set: { _id: DOC_ID, settings, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, settings });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}