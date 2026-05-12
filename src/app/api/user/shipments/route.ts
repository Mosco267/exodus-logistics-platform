// src/app/api/user/shipments/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the shipments that belong to the signed-in user.
 *
 * Query params:
 *   ?type=invoices                              → only shipments with an invoice
 *   ?status=paid|unpaid|overdue|cancelled       → filter by invoice status
 *   ?q=...                                      → search (track: trackingNumber only; invoices: invoice number only)
 *   ?searchField=tracking|invoice               → which field to search
 *   ?limit=...                                  → default 100, max 500
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const email = cleanStr((session?.user as any)?.email).toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = cleanStr(url.searchParams.get("type")).toLowerCase();
    const status = cleanStr(url.searchParams.get("status")).toLowerCase();
    const q = cleanStr(url.searchParams.get("q"));
    const searchField = cleanStr(url.searchParams.get("searchField")).toLowerCase();
    const limitRaw = parseInt(url.searchParams.get("limit") || "100", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const dbName = process.env.MONGODB_DB;
    if (!dbName) return NextResponse.json({ error: "Server config error" }, { status: 500 });

    const client = await clientPromise;
    const db = client.db(dbName);

    // Ownership filter
    const ownership = {
      $or: [
        { senderEmail: { $regex: `^${escapeRegex(email)}$`, $options: "i" } },
        { createdByEmail: { $regex: `^${escapeRegex(email)}$`, $options: "i" } },
        { receiverEmail: { $regex: `^${escapeRegex(email)}$`, $options: "i" } },
      ],
    };

    const projection = {
      _id: 0,
      shipmentId: 1,
      trackingNumber: 1,
      status: 1,
      senderName: 1,
      senderEmail: 1,
      senderCountry: 1,
      senderCity: 1,
      senderState: 1,
      receiverName: 1,
      receiverEmail: 1,
      receiverCountry: 1,
      receiverCity: 1,
      receiverState: 1,
      shipmentType: 1,
      shipmentMeans: 1,
      shipmentScope: 1,
      serviceLevel: 1,
      packageDescription: 1,
      weightKg: 1,
      dimensionsCm: 1,
      declaredValue: 1,
      declaredValueCurrency: 1,
      estimatedDeliveryDate: 1,
      estimatedDeliveryDateMin: 1,
      createdAt: 1,
      updatedAt: 1,
      statusUpdatedAt: 1,
      "invoice.invoiceNumber": 1,
      "invoice.status": 1,
      "invoice.amount": 1,
      "invoice.currency": 1,
      "invoice.dueDate": 1,
      "invoice.paid": 1,
      "invoice.paymentStatus": 1,
      "invoice.paymentMethod": 1,
    };

    // ============================================================
    // Step 1: Pull ALL user-owned shipments (within limit) WITHOUT filters
    // so we can compute correct counts before applying status filter.
    // ============================================================
    const allOwned = await db.collection("shipments")
      .find(ownership, { projection })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // Normalise effective status for each shipment (overdue if past dueDate)
    const now = Date.now();
    const allWithEffectiveStatus = allOwned.map((d: any) => {
      const inv = d?.invoice || {};
      const dueDate = inv?.dueDate ? new Date(inv.dueDate) : null;
      const rawStatus = cleanStr(inv?.status).toLowerCase();

      let effectiveStatus = rawStatus;
      if (rawStatus === "unpaid" && dueDate && !Number.isNaN(dueDate.getTime()) && now > dueDate.getTime()) {
        effectiveStatus = "overdue";
      }
      if (!effectiveStatus && inv?.paid) effectiveStatus = "paid";
      if (!effectiveStatus) effectiveStatus = "unpaid";

      return {
        ...d,
        invoice: inv && Object.keys(inv).length ? { ...inv, status: effectiveStatus } : null,
      };
    });

    // ============================================================
    // Step 2: For "invoices" mode, narrow down to only shipments
    // that have an invoice. This is the "all" universe for counts.
    // ============================================================
    let countsUniverse = allWithEffectiveStatus;
    if (type === "invoices") {
      countsUniverse = allWithEffectiveStatus.filter(
        (d: any) => d?.invoice && (d.invoice.invoiceNumber || d.invoice.amount)
      );
    }

    // Counts computed BEFORE the status filter (so tab numbers are correct)
    const counts = {
      all: countsUniverse.length,
      paid: countsUniverse.filter((d: any) => d?.invoice?.status === "paid").length,
      unpaid: countsUniverse.filter((d: any) => d?.invoice?.status === "unpaid").length,
      overdue: countsUniverse.filter((d: any) => d?.invoice?.status === "overdue").length,
      cancelled: countsUniverse.filter((d: any) => d?.invoice?.status === "cancelled").length,
    };

    // ============================================================
    // Step 3: Apply status + search filters to produce the response list.
    // ============================================================
    let shipments = countsUniverse;

    if (status && ["paid", "unpaid", "overdue", "cancelled"].includes(status)) {
      shipments = shipments.filter((d: any) => d?.invoice?.status === status);
    }

    if (q) {
      const qUpper = q.toUpperCase();
      shipments = shipments.filter((d: any) => {
        if (searchField === "tracking") {
          return String(d.trackingNumber || "").toUpperCase().includes(qUpper);
        }
        if (searchField === "invoice") {
          return String(d?.invoice?.invoiceNumber || "").toUpperCase().includes(qUpper);
        }
        // Default — search anywhere
        return (
          String(d.trackingNumber || "").toUpperCase().includes(qUpper) ||
          String(d.shipmentId || "").toUpperCase().includes(qUpper) ||
          String(d?.invoice?.invoiceNumber || "").toUpperCase().includes(qUpper)
        );
      });
    }

    return NextResponse.json({ shipments, counts });
  } catch (e) {
    console.error("/api/user/shipments error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}