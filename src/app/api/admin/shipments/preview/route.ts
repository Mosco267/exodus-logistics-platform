import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { computeInvoiceFromDeclaredValue, DEFAULT_PRICING } from "@/lib/pricing";

function toRate(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  // allow admin to type 10 meaning 10%
  return n > 1 ? n / 100 : n;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = String((session as any)?.user?.role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const declaredValue = Number(body.declaredValue);
    if (!Number.isFinite(declaredValue) || declaredValue <= 0) {
      return NextResponse.json({ error: "declaredValue must be > 0" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const pricingDoc = await db.collection("pricing_settings").findOne(
      { key: "default" } as any, // <-- avoids TS ObjectId complaint
      { projection: { _id: 0 } }
    );

    const basePricing = (pricingDoc as any)?.settings || DEFAULT_PRICING;

    // Optional per-shipment overrides from admin form
    const o = body?.pricingOverride || {};
    const pricing = {
      ...basePricing,
      shippingRate: toRate(o.shippingRate) ?? basePricing.shippingRate,
      insuranceRate: toRate(o.insuranceRate) ?? basePricing.insuranceRate,
      fuelRate: toRate(o.fuelRate) ?? basePricing.fuelRate,
      customsRate: toRate(o.customsRate) ?? basePricing.customsRate,
      taxRate: toRate(o.taxRate) ?? basePricing.taxRate,
      discountRate: toRate(o.discountRate) ?? basePricing.discountRate,
    };

    const breakdown = computeInvoiceFromDeclaredValue(declaredValue, pricing);

    return NextResponse.json({
      ok: true,
      declaredValue,
      pricing,
      breakdown,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}