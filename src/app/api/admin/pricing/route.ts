import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const DOC_ID = "default" as const;

export type PricingSettings = {
  // ✅ FIXED (money)
  shippingFee: number;
  handlingFee: number;
  customsFee: number;
  taxFee: number;
  discountFee: number;

  // ✅ DECIMALS (0.10 = 10%)
  fuelRate: number;       // % of shipping
  insuranceRate: number;  // % of declared value
};

export type PricingProfiles = {
  international: PricingSettings;
  local: PricingSettings;
};

// ✅ DEFAULTS
export const DEFAULT_PRICING: PricingProfiles = {
  international: {
    shippingFee: 120,
    handlingFee: 10,
    customsFee: 25,
    taxFee: 0,
    discountFee: 0,
    fuelRate: 0.10,
    insuranceRate: 0.02,
  },
  local: {
    shippingFee: 45,
    handlingFee: 5,
    customsFee: 0,
    taxFee: 0,
    discountFee: 0,
    fuelRate: 0.06,
    insuranceRate: 0.01,
  },
};

type PricingSettingsDoc = {
  _id: typeof DOC_ID;
  settings: PricingProfiles;
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

  // Clamp 0..1 and round
  const clamped = Math.min(Math.max(dec, 0), 1);
  return Math.round(clamped * 1_000_000) / 1_000_000;
}

function toMoney(v: any, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}

// Normalize on read/write
function normalizeSettings(
  s: any,
  fallback: PricingSettings
): PricingSettings {
  const incoming = s || {};
  return {
    shippingFee: toMoney(incoming.shippingFee, fallback.shippingFee),
    handlingFee: toMoney(incoming.handlingFee, fallback.handlingFee),
    customsFee: toMoney(incoming.customsFee, fallback.customsFee),
    taxFee: toMoney(incoming.taxFee, fallback.taxFee),
    discountFee: toMoney(incoming.discountFee, fallback.discountFee),

    fuelRate: toDecimalPercent(incoming.fuelRate, fallback.fuelRate),
    insuranceRate: toDecimalPercent(incoming.insuranceRate, fallback.insuranceRate),
  };
}

function normalizeProfiles(s: any): PricingProfiles {
  return {
    international: normalizeSettings(
      s?.international ?? DEFAULT_PRICING.international,
      DEFAULT_PRICING.international
    ),
    local: normalizeSettings(
      s?.local ?? DEFAULT_PRICING.local,
      DEFAULT_PRICING.local
    ),
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

    const settings = normalizeProfiles(doc?.settings ?? DEFAULT_PRICING);

    // optional: auto-fix legacy % values if any existed
    if (doc?.settings) {
      const rawAny = doc.settings as any;
      const looksLegacy =
        rawAny.fuelRate > 1 ||
        rawAny.insuranceRate > 1;

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

    const settings: PricingProfiles = normalizeProfiles(incoming);

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
