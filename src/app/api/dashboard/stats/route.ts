import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const normalize = (s: string) =>
  (s || "").toLowerCase().trim().replace(/[\s_-]+/g, "");

export async function GET() {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const shipments = await db
    .collection("shipments")
    .find({}, { projection: { status: 1, invoice: 1 } })
    .toArray();

  const total = shipments.length;

  let inTransit = 0;
  let delivered = 0;
  let custom = 0;
  let unclaimed = 0;

  let pendingInvoicesCount = 0;

  // ✅ NEW: totals split by currency
  const pendingInvoicesByCurrency: Record<string, number> = {};

  for (const s of shipments) {
    const st = normalize(String((s as any).status || ""));

    if (st === "intransit") inTransit++;
    if (st === "delivered") delivered++;
    if (st === "customclearance") custom++;
    if (st === "unclaimed") unclaimed++;

    const invoice = (s as any)?.invoice || {};
    const paid = Boolean(invoice?.paid);

    const amountRaw = invoice?.amount;
    const amount = Number(amountRaw ?? 0);

    const currencyRaw = invoice?.currency;
    const currency = String(currencyRaw || "USD").toUpperCase();

    if (!paid && Number.isFinite(amount) && amount > 0) {
      pendingInvoicesCount++;
      pendingInvoicesByCurrency[currency] =
        (pendingInvoicesByCurrency[currency] || 0) + amount;
    }
  }

  // Optional helper for UI ordering
  const pendingInvoicesCurrencies = Object.keys(pendingInvoicesByCurrency).sort(
  (a, b) =>
    (pendingInvoicesByCurrency[b] || 0) -
    (pendingInvoicesByCurrency[a] || 0)
);

  return NextResponse.json({
    total,
    inTransit,
    delivered,
    custom,
    unclaimed,
    pendingInvoicesCount,
    pendingInvoicesByCurrency,
    pendingInvoicesCurrencies,
  });
}