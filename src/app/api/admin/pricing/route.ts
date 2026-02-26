import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const DOC_ID = "default" as const;

export type PricingSettings = {
  shippingRate: number;  // % of declared value (e.g. 10)
  insuranceRate: number; // % of shipping cost
  fuelRate: number;      // % of shipping cost
  customsRate: number;   // % of shipping cost
  taxRate: number;       // % of subtotal
  discountRate: number;  // % of subtotal (optional)
};

export const DEFAULT_PRICING: PricingSettings = {
  shippingRate: 10,
  insuranceRate: 10,
  fuelRate: 5,
  customsRate: 20,
  taxRate: 0,
  discountRate: 0,
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

    return NextResponse.json({
      ok: true,
      settings: doc?.settings ?? DEFAULT_PRICING,
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

    const settings: PricingSettings = {
      shippingRate: toNum(incoming.shippingRate, DEFAULT_PRICING.shippingRate),
      insuranceRate: toNum(incoming.insuranceRate, DEFAULT_PRICING.insuranceRate),
      fuelRate: toNum(incoming.fuelRate, DEFAULT_PRICING.fuelRate),
      customsRate: toNum(incoming.customsRate, DEFAULT_PRICING.customsRate),
      taxRate: toNum(incoming.taxRate, DEFAULT_PRICING.taxRate),
      discountRate: toNum(incoming.discountRate, DEFAULT_PRICING.discountRate),
    };

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