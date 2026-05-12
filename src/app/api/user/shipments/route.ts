// src/app/api/user/shipments/route.ts
//
// Lists shipments belonging to the signed-in user:
//   - senderEmail === user.email, OR
//   - createdByEmail === user.email, OR
//   - receiverEmail === user.email
//
// Returns lightweight summaries suitable for the dashboard track + invoice list pages.
// Drill-in detail still uses /api/track and /api/invoice.

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function joinNice(parts: Array<any>) {
  return parts.map(x => String(x || "").trim()).filter(Boolean).join(", ");
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = String(session.user.email).toLowerCase();
  const escaped = escapeRegex(email);

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);
  const status = cleanStr(url.searchParams.get("status")).toLowerCase();
  const invoiceStatus = cleanStr(url.searchParams.get("invoiceStatus")).toLowerCase();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const baseQuery: any = {
    $or: [
      { senderEmail: { $regex: `^${escaped}$`, $options: "i" } },
      { receiverEmail: { $regex: `^${escaped}$`, $options: "i" } },
      { createdByEmail: { $regex: `^${escaped}$`, $options: "i" } },
    ],
  };

  if (status && status !== "all") {
    baseQuery.status = { $regex: `^${escapeRegex(status)}$`, $options: "i" };
  }

  if (invoiceStatus && invoiceStatus !== "all") {
    baseQuery["invoice.status"] = invoiceStatus;
  }

  const shipments = await db
    .collection("shipments")
    .find(baseQuery, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const now = Date.now();

  const summaries = shipments.map((s: any) => {
    const inv = s?.invoice || {};
    let invStatusRaw = cleanStr(inv?.status).toLowerCase();
    if (invStatusRaw === "canceled") invStatusRaw = "cancelled";

    let invStatus: "paid" | "unpaid" | "overdue" | "cancelled" =
      invStatusRaw === "paid" ? "paid"
      : invStatusRaw === "cancelled" ? "cancelled"
      : invStatusRaw === "overdue" ? "overdue"
      : "unpaid";

    if (invStatus === "unpaid" && inv?.dueDate) {
      const d = new Date(inv.dueDate);
      if (!Number.isNaN(d.getTime()) && now > d.getTime()) {
        invStatus = "overdue";
      }
    }

    const events = Array.isArray(s?.trackingEvents) ? s.trackingEvents : [];
    let lastEventLabel = "";
    if (events.length > 0) {
      const latest = events.reduce((a: any, b: any) =>
        new Date(a?.occurredAt || 0).getTime() > new Date(b?.occurredAt || 0).getTime() ? a : b
      , events[0]);
      lastEventLabel = cleanStr(latest?.label);
    }

    const origin = joinNice([s?.senderCity, s?.senderState, s?.senderCountry]);
    const destination = joinNice([s?.receiverCity, s?.receiverState, s?.receiverCountry]);

    let role: "sender" | "receiver" | "creator" = "creator";
    if (cleanStr(s?.senderEmail).toLowerCase() === email) role = "sender";
    else if (cleanStr(s?.receiverEmail).toLowerCase() === email) role = "receiver";

    return {
      shipmentId: cleanStr(s?.shipmentId),
      trackingNumber: cleanStr(s?.trackingNumber),
      invoiceNumber: cleanStr(inv?.invoiceNumber),

      status: cleanStr(s?.status) || "Created",
      currentStatus: lastEventLabel || cleanStr(s?.status) || "—",
      statusNote: cleanStr(s?.statusNote),

      origin: origin || "—",
      destination: destination || "—",

      shipmentMeans: cleanStr(s?.shipmentMeans) || null,
      shipmentScope: cleanStr(s?.shipmentScope) || "international",
      serviceLevel: cleanStr(s?.serviceLevel) || null,

      weightKg: s?.weightKg ?? null,

      role,

      invoice: {
        status: invStatus,
        amount: safeNum(inv?.amount),
        currency: cleanStr(inv?.currency || s?.declaredValueCurrency || "USD") || "USD",
        dueDate: inv?.dueDate || null,
        invoiceNumber: cleanStr(inv?.invoiceNumber),
      },

      estimatedDelivery: s?.estimatedDeliveryDate || s?.estimatedDelivery || null,
      estimatedDeliveryDateMin: s?.estimatedDeliveryDateMin || null,

      createdAt: s?.createdAt || null,
      updatedAt: s?.updatedAt || null,
    };
  });

  return NextResponse.json({
    count: summaries.length,
    shipments: summaries,
  });
}