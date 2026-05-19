import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

const normalize = (s: string) =>
  (s || "").toLowerCase().trim().replace(/[\s_-]+/g, "");

export async function GET() {
  const session = await auth();
  const role = String((session as any)?.user?.role || "USER").toUpperCase();
  const userId = String((session as any)?.user?.id || "");
  const email = String((session as any)?.user?.email || "").toLowerCase().trim();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const match =
    role === "ADMIN"
      ? {}
      : {
          $or: [
            ...(userId ? [{ createdByUserId: userId }] : []),
            ...(email ? [{ createdByEmail: email }] : []),
          ],
        };

  // ✅ Pull the timestamps too so we can sort by latest invoice
  const shipments = await db
    .collection("shipments")
    .find(match, {
      projection: {
        status: 1,
        invoice: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    })
    .toArray();

  const total = shipments.length;

  let inTransit = 0;
  let delivered = 0;
  let custom = 0;
  let unclaimed = 0;

  let pendingInvoicesCount = 0;
  const pendingInvoicesByCurrency: Record<string, number> = {};

  // ✅ Track the most-recent invoice timestamp per currency
  const latestByCurrency: Record<string, number> = {};

  for (const s of shipments) {
    const st = normalize(String((s as any).status || ""));

    if (st === "intransit") inTransit++;
    if (st === "delivered") delivered++;
    if (st === "customclearance") custom++;
    if (st === "unclaimed") unclaimed++;

    const invoice = (s as any)?.invoice || {};
    const paid = Boolean(invoice?.paid);

    const amount = Number(invoice?.amount ?? 0);
    const currency = String(invoice?.currency || "USD").toUpperCase();

    if (!paid && Number.isFinite(amount) && amount > 0) {
      pendingInvoicesCount++;
      pendingInvoicesByCurrency[currency] =
        (pendingInvoicesByCurrency[currency] || 0) + amount;

      // ✅ Pick the best "this invoice was last touched" timestamp.
      // Priority: invoice.createdAt > invoice.updatedAt > shipment.updatedAt > shipment.createdAt
      const invoiceTime = new Date(
        invoice?.createdAt ??
          invoice?.updatedAt ??
          (s as any)?.updatedAt ??
          (s as any)?.createdAt ??
          0
      ).getTime();

      const prev = latestByCurrency[currency] || 0;
      if (invoiceTime > prev) latestByCurrency[currency] = invoiceTime;
    }
  }

  // ✅ Sort currencies by most-recent invoice first (newest at the top)
  const pendingInvoicesCurrencies = Object.keys(pendingInvoicesByCurrency).sort(
    (a, b) => (latestByCurrency[b] || 0) - (latestByCurrency[a] || 0)
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