"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BadgeX,
  Calendar,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Package,
  Printer,
  Receipt,
  Truck,
  Hourglass,
  Ban,
} from "lucide-react";

type InvoiceApiResponse = {
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
  };

  invoiceNumber?: string;
  status?: "paid" | "pending" | "overdue" | "cancelled";
  currency?: string;
  total?: number;
  paid?: boolean;
  paidAt?: string | null;

  dueDate?: string | null;
  paymentMethod?: string | null;

  declaredValue?: number;
  declaredValueCurrency?: string;

  breakdown?: {
    declaredValue?: number;
    rates?: {
      shippingRate?: number | null;
      insuranceRate?: number | null;
      fuelRate?: number | null;
      customsRate?: number | null;
      taxRate?: number | null;
      discountRate?: number | null;
    };
    shipping?: number;
    insurance?: number;
    fuel?: number;
    customs?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    total?: number;
  };

  shipment?: {
    shipmentId?: string;
    trackingNumber?: string;
    originFull?: string;
    destinationFull?: string;

    shipmentType?: string | null;
    serviceLevel?: string | null;
    weightKg?: number | string | null;
    dimensionsCm?: { length?: any; width?: any; height?: any; unit?: string } | null;
  };

  parties?: {
    senderName?: string;
    receiverName?: string;
    senderEmail?: string;
    receiverEmail?: string;
  };

  dates?: {
    createdAt?: string | null;
    updatedAt?: string | null;
  };

  error?: string;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function moneyFmt(amount: any, currency: string) {
  const a = toNumber(amount);
  const c = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c,
      maximumFractionDigits: 2,
    }).format(a);
  } catch {
    // fallback if unsupported currency
    return `${a.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${c}`;
  }
}

function numberFmt(v: any) {
  const n = toNumber(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Convert stored rate to a “percent” for display.
 * - If rate is 0.1 => 10%
 * - If rate is 10 => 10%
 */
function rateToPercent(rate: any) {
  const r = Number(rate);
  if (!Number.isFinite(r)) return null;
  const pct = r <= 1 ? r * 100 : r;
  return pct;
}

const ACCEPTED_METHODS = [
  "Cryptocurrency",
  "Bank transfer",
  "PayPal",
  "Zelle",
  "Cash",
  "Other",
];

function statusPill(status?: string, paid?: boolean) {
  const s = (status || "").toLowerCase();
  if (paid || s === "paid") {
    return {
      text: "PAID",
      cls: "bg-green-50 border-green-200 text-green-800",
      icon: <BadgeCheck className="w-4 h-4" />,
    };
  }
  if (s === "cancelled") {
    return {
      text: "CANCELLED",
      cls: "bg-gray-100 border-gray-200 text-gray-800",
      icon: <Ban className="w-4 h-4" />,
    };
  }
  if (s === "overdue") {
    return {
      text: "OVERDUE",
      cls: "bg-red-50 border-red-200 text-red-800",
      icon: <BadgeX className="w-4 h-4" />,
    };
  }
  return {
    text: "PAYMENT PENDING",
    cls: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <Hourglass className="w-4 h-4" />,
  };
}

export default function InvoiceFullPage() {
  const params = useParams();
  const sp = useSearchParams();
  const locale = (params?.locale as string) || "en";

  const q = useMemo(() => safeStr(sp.get("q")).toUpperCase(), [sp]);
  const invoice = useMemo(() => safeStr(sp.get("invoice")).toUpperCase(), [sp]);
  const email = useMemo(() => safeStr(sp.get("email")).toLowerCase(), [sp]);

  const [data, setData] = useState<InvoiceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    setData(null);

    // Must have:
    // - q OR (invoice + email)
    if (!q && (!invoice || !email)) {
      setErr(
        "Invoice details are missing. Please open the invoice from the email, or enter your invoice number and the sender/receiver email again."
      );
      setLoading(false);
      return;
    }

    try {
      // ✅ Use GET so it matches your route.ts GET and also works when opened from links
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (invoice) qs.set("invoice", invoice);
      if (email) qs.set("email", email);

      const res = await fetch(`/api/invoice?${qs.toString()}`, { method: "GET" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(
          json?.error ||
            json?.message ||
            "Invoice not found. Please verify your details and try again."
        );
        return;
      }

      setData(json as InvoiceApiResponse);
    } catch (e: any) {
      setErr(e?.message || "Invoice unavailable. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, invoice, email]);

  const company = data?.company || {};
  const currency = safeStr(data?.currency) || "USD";
  const total = toNumber(data?.total ?? data?.breakdown?.total ?? 0);

  const shipmentId = safeStr(data?.shipment?.shipmentId);
  const trackingNumber = safeStr(data?.shipment?.trackingNumber);
  const invoiceNumber = safeStr(data?.invoiceNumber);

  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";

  const declaredValue = toNumber(data?.declaredValue ?? data?.breakdown?.declaredValue ?? 0);
  const declaredValueCurrency = safeStr(data?.declaredValueCurrency) || currency;

  const shipmentType = safeStr(data?.shipment?.shipmentType) || "—";
  const serviceLevel = safeStr(data?.shipment?.serviceLevel) || "—";
  const weightKg = data?.shipment?.weightKg;
  const dims = data?.shipment?.dimensionsCm;

  const dimUnit = safeStr((dims as any)?.unit) || "cm";
  const dimLine =
    dims && (dims as any)
      ? `${safeStr((dims as any)?.length) || "—"} × ${safeStr((dims as any)?.width) || "—"} × ${safeStr((dims as any)?.height) || "—"} ${dimUnit}`
      : "—";

  const paid = Boolean(data?.paid);
  const status = data?.status || (paid ? "paid" : "pending");
  const pill = statusPill(status, paid);

  const dueDate = data?.dueDate || null;
  const paymentMethod = data?.paymentMethod ?? null;

  const rates = data?.breakdown?.rates || {};
  const shippingRate = rateToPercent((rates as any)?.shippingRate);
  const insuranceRate = rateToPercent((rates as any)?.insuranceRate);
  const fuelRate = rateToPercent((rates as any)?.fuelRate);
  const customsRate = rateToPercent((rates as any)?.customsRate);
  const taxRate = rateToPercent((rates as any)?.taxRate);
  const discountRate = rateToPercent((rates as any)?.discountRate);

  const b = data?.breakdown || {};
  const shipping = toNumber((b as any)?.shipping);
  const insurance = toNumber((b as any)?.insurance);
  const fuel = toNumber((b as any)?.fuel);
  const customs = toNumber((b as any)?.customs);
  const tax = toNumber((b as any)?.tax);
  const discount = toNumber((b as any)?.discount);
  const subtotal = toNumber((b as any)?.subtotal);
  const calcTotal = toNumber((b as any)?.total ?? total);

  const senderName = safeStr(data?.parties?.senderName) || "—";
  const senderEmail = safeStr(data?.parties?.senderEmail) || "—";
  const receiverName = safeStr(data?.parties?.receiverName) || "—";
  const receiverEmail = safeStr(data?.parties?.receiverEmail) || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-12 print:py-0">
      {/* print styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-no-shadow {
            box-shadow: none !important;
          }
          .print-no-border {
            border: none !important;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4">
        {/* Top nav + Print */}
        <div className="no-print mb-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/invoice`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                       hover:border-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Invoice Search
          </Link>

          {(trackingNumber || shipmentId || q) && (
            <Link
              href={`/${locale}/track/${encodeURIComponent(
                (trackingNumber || shipmentId || q).toUpperCase()
              )}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                         hover:border-blue-600 hover:text-blue-700 transition"
            >
              <Truck className="w-5 h-5 mr-2" /> Track Shipment
            </Link>
          )}

          <button
  type="button"
  onClick={() => window.print()}
  className="sm:ml-auto inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-900 to-cyan-800 text-white font-semibold shadow hover:opacity-95 transition"
>
  <Printer className="w-5 h-5 mr-2" /> Print
</button>
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
            <p className="text-sm text-gray-700">Loading invoice…</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-xl">
            <div className="flex items-center text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {err}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              If you opened this from an email, confirm the invoice number and use the sender/receiver email linked to the shipment.
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Header card (print friendly) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-no-shadow"
            >
              {/* Gradient header like your screenshot */}
              <div className="bg-gradient-to-r from-white via-blue-900 to-cyan-800 px-6 sm:px-8 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-white/95 border border-white/40 overflow-hidden flex items-center justify-center">
                      {/* ✅ SVG logo */}
                      <Image
                        src="/logo.svg"
                        alt="Exodus Logistics"
                        width={44}
                        height={44}
                        className="object-contain"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-white/80 text-xs">{safeStr(company?.name) || "Exodus Logistics Ltd."}</p>
                      <p className="text-white text-sm font-semibold">Invoice</p>

                      {/* company contact (editable from admin via company_settings) */}
                      <div className="mt-1 text-[11px] text-white/80 space-y-0.5">
                        <div>{safeStr(company?.address) || "—"}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span>{safeStr(company?.phone) || "—"}</span>
                          <span>{safeStr(company?.email) || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-white/80 text-xs">Invoice number</p>
                    <p className="text-white text-lg sm:text-2xl font-extrabold tracking-wide">
                      {invoiceNumber || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary row like your screenshot */}
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Created */}
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-700" />
                      Created
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {fmtDate(data?.dates?.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Updated: <span className="font-semibold">{fmtDate(data?.dates?.updatedAt)}</span>
                    </p>
                  </div>

                  {/* Shipment (ONLY these 3) */}
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Package className="w-4 h-4 text-gray-700" />
                      Shipment
                    </div>

                    <p className="mt-2 text-xs text-gray-600">Shipment ID</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{shipmentId || "—"}</p>

                    <p className="mt-2 text-xs text-gray-600">Tracking</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{trackingNumber || "—"}</p>

                    <p className="mt-2 text-xs text-gray-600">Invoice number</p>
                    <p className="text-sm font-semibold text-gray-900 break-all">{invoiceNumber || "—"}</p>
                  </div>

                  {/* Total + Status + Due */}
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {moneyFmt(calcTotal, currency)}
                    </p>

                    <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold ${pill.cls}`}>
                      {pill.icon}
                      {pill.text}
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-gray-600">Due date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {dueDate ? fmtDate(dueDate) : "—"}
                      </p>
                    </div>

                    <p className="mt-3 text-sm text-gray-700">
                      {paid || status === "paid"
                        ? "Payment has been confirmed. Your invoice is settled."
                        : status === "cancelled"
                        ? "This invoice has been cancelled."
                        : status === "overdue"
                        ? "This invoice is overdue. Please contact support or complete payment to avoid delays."
                        : "Payment is pending. Please complete payment to move the shipment to the next stage."}
                    </p>
                  </div>
                </div>

                {/* Declared value/type/service/weight/dimensions in its own box */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200 p-4 lg:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Receipt className="w-4 h-4 text-gray-700" />
                      Declaration & package
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Declared value</span>
                        <span className="font-semibold text-gray-900">
                          {moneyFmt(declaredValue, declaredValueCurrency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Type</span>
                        <span className="font-semibold text-gray-900">{shipmentType}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Service</span>
                        <span className="font-semibold text-gray-900">{serviceLevel}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Weight</span>
                        <span className="font-semibold text-gray-900">
                          {weightKg != null && safeStr(weightKg) !== "" ? `${safeStr(weightKg)} kg` : "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Dimensions</span>
                        <span className="font-semibold text-gray-900">{dimLine}</span>
                      </div>
                    </div>
                  </div>

                  {/* Route box */}
                  <div className="rounded-2xl border border-gray-200 p-4 lg:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-700" />
                      Route
                    </div>

                    <div className="mt-3 text-sm">
                      <p className="text-xs text-gray-600">From</p>
                      <p className="font-semibold text-gray-900">{originFull}</p>

                      <p className="mt-3 text-xs text-gray-600">To</p>
                      <p className="font-semibold text-gray-900">{destinationFull}</p>
                    </div>
                  </div>

                  {/* Sender/Receiver */}
                  <div className="rounded-2xl border border-gray-200 p-4 lg:col-span-1">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                          <Mail className="w-4 h-4 text-gray-700" />
                          Sender
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{senderName}</p>
                        <p className="text-xs text-gray-600 break-all">{senderEmail}</p>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                          <Mail className="w-4 h-4 text-gray-700" />
                          Receiver
                        </div>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{receiverName}</p>
                        <p className="text-xs text-gray-600 break-all">{receiverEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* footer strip */}
              <div className="px-6 sm:px-8 py-4 bg-blue-50 border-t border-blue-100 text-sm text-gray-700 print:rounded-none">
                This invoice is linked to a specific shipment and can only be accessed using the correct invoice details.
              </div>
            </motion.div>

            {/* Payment method + Charges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Payment method */}
              <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 print-no-shadow">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-700" />
                  <h2 className="text-lg font-extrabold text-gray-900">Payment method</h2>
                </div>

                <p className="mt-1 text-sm text-gray-600">Accepted payment methods:</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {ACCEPTED_METHODS.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs text-gray-600">Recorded method</p>
                  <p className="mt-1 text-sm font-extrabold text-gray-900">
                    {paymentMethod ? paymentMethod : "NULL"}
                  </p>

                  {!paid && status !== "paid" ? (
                    <p className="mt-2 text-sm text-gray-700">
                      This invoice is currently{" "}
                      <span className="font-extrabold text-amber-700">
                        {pill.text}
                      </span>
                      . Please proceed with payment using one of the accepted methods above.
                      Once payment is confirmed, the shipment will be eligible to move to the next stage.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-700">
                      This invoice is{" "}
                      <span className="font-extrabold text-green-700">PAID</span>.{" "}
                      Payment has been successfully recorded in our system.
                    </p>
                  )}
                </div>
              </div>

              {/* Charges summary */}
              <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 print-no-shadow">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-700" />
                  <h2 className="text-lg font-extrabold text-gray-900">Charges summary</h2>
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  Charges are calculated from your declared value.
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">
                      Shipping{shippingRate != null ? ` (${numberFmt(shippingRate)}%)` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {moneyFmt(shipping, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">
                      Insurance{insuranceRate != null ? ` (${numberFmt(insuranceRate)}%)` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {moneyFmt(insurance, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">
                      Fuel{fuelRate != null ? ` (${numberFmt(fuelRate)}%)` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {moneyFmt(fuel, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">
                      Customs{customsRate != null ? ` (${numberFmt(customsRate)}%)` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {moneyFmt(customs, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">
                      Tax{taxRate != null ? ` (${numberFmt(taxRate)}%)` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {moneyFmt(tax, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">
                      Discount{discountRate != null ? ` (${numberFmt(discountRate)}%)` : ""}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {moneyFmt(discount, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-gray-900 font-extrabold">Subtotal</span>
                    <span className="text-gray-900 font-extrabold">
                      {moneyFmt(subtotal, currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-900 font-extrabold">Total</span>
                    <span className="text-gray-900 font-extrabold">
                      {moneyFmt(calcTotal, currency)}
                    </span>
                  </div>
                </div>

                {!paid && status !== "paid" ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Payment is pending. Please complete payment to avoid delays in processing.
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                    Payment confirmed. Thank you — your invoice has been settled.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}