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
  CalendarClock,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Package,
  Percent,
  ReceiptText,
  Ruler,
  Truck,
  XCircle,
} from "lucide-react";

type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";

type InvoiceApiResponse = {
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
  };

  invoiceNumber?: string;
  status?: InvoiceStatus;
  currency?: string;
  total?: number;
  paid?: boolean;

  dueDate?: string | null;
  paymentMethod?: string | null;

  declaredValue?: number;
  declaredValueCurrency?: string;

  breakdown?: {
    declaredValue?: number;
    rates?: {
      shippingRate?: number;
      insuranceRate?: number;
      fuelRate?: number;
      customsRate?: number;
      taxRate?: number;
      discountRate?: number;
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

    status?: string;

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

const ACCEPTED_METHODS = ["Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"];

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function fmtMoney(amount: any, currency: string) {
  const c = (currency || "USD").toUpperCase();
  const a = n(amount);

  try {
    // ✅ currency symbol + commas (€, $, £, etc.)
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c,
      currencyDisplay: "symbol",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(a);
  } catch {
    // fallback
    return `${a.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
  }
}

function fmtNumber(amount: any) {
  const a = n(amount);
  return a.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtPercent(rate?: any) {
  if (rate === null || rate === undefined || rate === "") return "";
  const r = n(rate);
  if (!Number.isFinite(r)) return "";
  return `${r}%`;
}

function statusPill(status: InvoiceStatus, paid: boolean) {
  // paid always wins visually
  if (paid) return { label: "PAID", cls: "bg-green-50 border-green-200 text-green-800", Icon: BadgeCheck };

  if (status === "cancelled")
    return { label: "CANCELLED", cls: "bg-gray-100 border-gray-200 text-gray-700", Icon: XCircle };

  if (status === "overdue")
    return { label: "OVERDUE", cls: "bg-red-50 border-red-200 text-red-800", Icon: AlertCircle };

  return { label: "PAYMENT PENDING", cls: "bg-amber-50 border-amber-200 text-amber-800", Icon: BadgeX };
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

    if (!q && (!invoice || !email)) {
      setErr("Invoice details are missing. Please open the invoice from the email or enter your details again.");
      setLoading(false);
      return;
    }

    try {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      if (!q && invoice) qs.set("invoice", invoice);
      if (!q && email) qs.set("email", email);

      const res = await fetch(`/api/invoice?${qs.toString()}`, { method: "GET" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setErr(json?.error || json?.message || "Invoice not found. Please verify your details and try again.");
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

  const paid = Boolean(data?.paid);
  const status = (data?.status as InvoiceStatus) || (paid ? "paid" : "pending");

  const invoiceNumber = safeStr(data?.invoiceNumber) || "—";
  const shipmentId = safeStr(data?.shipment?.shipmentId) || "—";
  const trackingNumber = safeStr(data?.shipment?.trackingNumber) || "—";

  const currency = safeStr(data?.currency) || "USD";
  const total = n(data?.total ?? data?.breakdown?.total ?? 0);

  const createdAt = data?.dates?.createdAt ?? null;
  const updatedAt = data?.dates?.updatedAt ?? null;
  const dueDate = data?.dueDate ?? null;

  // ✅ FULL route
  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";

  const declaredValue = data?.declaredValue ?? data?.breakdown?.declaredValue ?? 0;
  const declaredValueCurrency = safeStr(data?.declaredValueCurrency) || currency;

  const shipmentType = safeStr(data?.shipment?.shipmentType) || "—";
  const serviceLevel = safeStr(data?.shipment?.serviceLevel) || "—";

  const weight = data?.shipment?.weightKg ?? null;
  const weightLine = weight === null || weight === undefined || String(weight).trim() === "" ? "—" : `${fmtNumber(weight)} kg`;

  const dim = data?.shipment?.dimensionsCm ?? null;
  const dimUnit = safeStr(dim?.unit) || "cm";
  const dimLine =
    dim && (dim.length || dim.width || dim.height)
      ? `${safeStr(dim.length) || "—"} × ${safeStr(dim.width) || "—"} × ${safeStr(dim.height) || "—"} ${dimUnit}`
      : "—";

  const senderName = safeStr(data?.parties?.senderName) || "—";
  const receiverName = safeStr(data?.parties?.receiverName) || "—";
  const senderEmail = safeStr(data?.parties?.senderEmail) || "—";
  const receiverEmail = safeStr(data?.parties?.receiverEmail) || "—";

  const paymentMethodRaw = safeStr(data?.paymentMethod);
  // ✅ show "null" if admin hasn’t set it yet
  const recordedMethod = paymentMethodRaw ? paymentMethodRaw : "null";

  const rates = data?.breakdown?.rates || {};
  const shippingRate = rates.shippingRate;
  const insuranceRate = rates.insuranceRate;
  const fuelRate = rates.fuelRate;
  const customsRate = rates.customsRate;
  const taxRate = rates.taxRate;
  const discountRate = rates.discountRate;

  const shipping = n(data?.breakdown?.shipping);
  const insurance = n(data?.breakdown?.insurance);
  const fuel = n(data?.breakdown?.fuel);
  const customs = n(data?.breakdown?.customs);
  const tax = n(data?.breakdown?.tax);
  const discount = n(data?.breakdown?.discount);
  const subtotal = n(data?.breakdown?.subtotal);

  const pill = statusPill(status, paid);

  const trackTarget = (trackingNumber !== "—" ? trackingNumber : shipmentId !== "—" ? shipmentId : q).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-8 print:bg-white print:py-0">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            background: #fff !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          .print-no-border {
            border: none !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 print:px-0">
        {/* Top nav (hide on print) */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 print-hide">
          <Link
            href={`/${locale}/invoice`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                       hover:border-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Invoice Search
          </Link>

          {trackTarget ? (
            <Link
              href={`/${locale}/track/${encodeURIComponent(trackTarget)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                         hover:border-blue-600 hover:text-blue-700 transition"
            >
              <Truck className="w-5 h-5 mr-2" /> Track Shipment
            </Link>
          ) : null}
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl print-card">
            <p className="text-sm text-gray-700">Loading invoice…</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-xl print-card">
            <div className="flex items-center text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 mr-2" />
              {err}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              If you opened this from an email, ensure the invoice number is correct and the email matches the sender/receiver email on the shipment.
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* ✅ Header like before (blue gradient bar) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-card"
            >
              <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 px-6 py-5 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                      <Image
                        src="/logo.png"
                        alt="Exodus Logistics"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm opacity-90">{safeStr(data?.company?.name) || "Exodus Logistics"}</p>
                      <p className="text-xs opacity-80">Invoice</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm opacity-90">Invoice number</p>
                    <p className="text-xl sm:text-2xl font-extrabold tracking-wide break-all">
                      {invoiceNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main content */}
              <div className="p-6 sm:p-8">
                {/* Top summary row (Created / Shipment / Total) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-700" />
                      Created
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{fmtDate(createdAt)}</p>
                    <p className="mt-1 text-xs text-gray-600">
                      Updated: <span className="font-semibold">{fmtDateTime(updatedAt)}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Package className="w-4 h-4 text-gray-700" />
                      Shipment
                    </div>
                    <p className="mt-2 text-sm font-extrabold text-gray-900 break-all">{shipmentId}</p>
                    <p className="mt-1 text-xs text-gray-600 break-all">
                      Tracking: <span className="font-semibold text-gray-900">{trackingNumber}</span>
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      Declared value:{" "}
                      <span className="font-semibold text-gray-900">
                        {fmtMoney(declaredValue, declaredValueCurrency)}
                      </span>
                    </p>
                    <div className="mt-3 text-xs text-gray-600 space-y-1">
                      <div>
                        Type: <span className="font-semibold text-gray-900">{shipmentType}</span>
                      </div>
                      <div>
                        Service: <span className="font-semibold text-gray-900">{serviceLevel}</span>
                      </div>
                      <div>
                        Weight: <span className="font-semibold text-gray-900">{weightLine}</span>
                      </div>
                      <div>
                        Dimensions: <span className="font-semibold text-gray-900">{dimLine}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Total</p>
                        <p className="mt-2 text-2xl font-extrabold text-gray-900">
                          {fmtMoney(total, currency)}
                        </p>
                      </div>

                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold ${pill.cls}`}
                      >
                        <pill.Icon className="w-4 h-4" />
                        {pill.label}
                      </div>
                    </div>

                    {/* ✅ Due date box */}
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                        <CalendarClock className="w-4 h-4 text-gray-700" />
                        Due date
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {dueDate ? fmtDate(dueDate) : "—"}
                      </p>
                    </div>

                    <p className="mt-3 text-sm text-gray-700">
                      {paid
                        ? "Payment confirmed. This invoice has been settled."
                        : status === "cancelled"
                        ? "This invoice has been cancelled. If you believe this is incorrect, please contact support."
                        : status === "overdue"
                        ? "This invoice is overdue. Please complete payment as soon as possible to avoid delays."
                        : "Payment pending. Please complete payment to move the shipment to the next stage."}
                    </p>
                  </div>
                </div>

                {/* Route + Parties */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-gray-200 p-4 md:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-700" />
                      Route
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {originFull} → {destinationFull}
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                      Shipment status: <span className="font-semibold text-gray-900">{safeStr(data?.shipment?.status) || "—"}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Mail className="w-4 h-4 text-gray-700" />
                      Sender
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{senderName}</p>
                    <p className="mt-1 text-xs text-gray-600 break-all">{senderEmail}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Mail className="w-4 h-4 text-gray-700" />
                      Receiver
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{receiverName}</p>
                    <p className="mt-1 text-xs text-gray-600 break-all">{receiverEmail}</p>
                  </div>
                </div>

                {/* Payment method + Charges */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Payment Method Block */}
                  <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 print-card">
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
                      <p className="mt-1 text-sm font-extrabold text-gray-900">{recordedMethod}</p>

                      {!paid ? (
                        <p className="mt-2 text-sm text-gray-700">
                          This invoice is currently{" "}
                          <span className="font-extrabold text-amber-700">NOT PAID</span>.
                          Please proceed with payment using one of the accepted methods above.
                          Once payment is confirmed, the shipment will be eligible to move to the next stage.
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-gray-700">
                          This invoice is <span className="font-extrabold text-green-700">PAID</span>.
                          {paymentMethodRaw ? " The payment method has been recorded." : " The payment method was not recorded."}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Charges */}
                  <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6 print-card">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="w-5 h-5 text-blue-700" />
                      <h2 className="text-lg font-extrabold text-gray-900">Charges summary</h2>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      Charges are calculated from your declared value and pricing settings.
                    </p>

                    <div className="mt-5 space-y-2 text-sm">
                      <Line
                        label="Shipping"
                        pct={fmtPercent(shippingRate)}
                        value={fmtMoney(shipping, currency)}
                      />
                      <Line
                        label="Insurance"
                        pct={fmtPercent(insuranceRate)}
                        value={fmtMoney(insurance, currency)}
                      />
                      <Line
                        label="Fuel"
                        pct={fmtPercent(fuelRate)}
                        value={fmtMoney(fuel, currency)}
                      />
                      <Line
                        label="Customs"
                        pct={fmtPercent(customsRate)}
                        value={fmtMoney(customs, currency)}
                      />
                      <Line
                        label="Tax"
                        pct={fmtPercent(taxRate)}
                        value={fmtMoney(tax, currency)}
                      />
                      <Line
                        label="Discount"
                        pct={fmtPercent(discountRate)}
                        value={fmtMoney(discount, currency)}
                      />

                      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                        <span className="text-gray-900 font-extrabold">Subtotal</span>
                        <span className="text-gray-900 font-extrabold">{fmtMoney(subtotal, currency)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-gray-900 font-extrabold text-lg">Total</span>
                        <span className="text-gray-900 font-extrabold text-lg">{fmtMoney(total, currency)}</span>
                      </div>
                    </div>

                    {!paid ? (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Payment is pending. Please complete payment to avoid delays in processing.
                      </div>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                        Payment confirmed. Thank you — your invoice has been settled.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, pct, value }: { label: string; pct?: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{label}</span>
        {pct ? <span className="text-xs text-gray-500">({pct})</span> : null}
      </div>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}