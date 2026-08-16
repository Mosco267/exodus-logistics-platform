import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const DOC_ID = "default" as const;

// Types live in src/lib/pricing.ts — importing rather than redeclaring keeps
// this route from drifting out of sync with the calculator.
import type {
  PricingSettings,
  PricingProfiles,
} from "@/lib/pricing";

export type { PricingSettings, PricingProfiles };

// Single source of truth — see src/lib/pricing.ts
import { DEFAULT_PRICING as LIB_DEFAULTS } from "@/lib/pricing";
export const DEFAULT_PRICING = LIB_DEFAULTS as any;

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
    taxRate: toDecimalPercent(incoming.taxRate, fallback.taxRate ?? 0),
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

    /* Freight structures pass through as stored, with defaults filling any
       gaps. Nested objects are merged so a document holding only
       land.zoneRates still gets expressMultiplier from the defaults. */
    air: {
      ...DEFAULT_PRICING.air,
      ...(s?.air || {}),
      zoneMultipliers: { ...DEFAULT_PRICING.air.zoneMultipliers, ...(s?.air?.zoneMultipliers || {}) },
      ...(s?.air?.zoneRates ? { zoneRates: s.air.zoneRates } : {}),
    },
    sea: {
      ...DEFAULT_PRICING.sea,
      ...(s?.sea || {}),
      zoneMultipliers: { ...DEFAULT_PRICING.sea.zoneMultipliers, ...(s?.sea?.zoneMultipliers || {}) },
      ...(s?.sea?.zoneRates ? { zoneRates: s.sea.zoneRates } : {}),
    },
    land: {
      ...DEFAULT_PRICING.land,
      ...(s?.land || {}),
      zoneRates: { ...DEFAULT_PRICING.land.zoneRates, ...(s?.land?.zoneRates || {}) },
    },

    // Preserved exactly as stored — never seeded from defaults
    ...(s?.countryRates ? { countryRates: s.countryRates } : {}),
    ...(s?.zoneTable ? { zoneTable: s.zoneTable } : {}),
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
