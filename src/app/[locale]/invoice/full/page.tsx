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
  Receipt,
  Truck,
} from "lucide-react";

type Money = { amount: number; currency: string };

type Dimensions =
  | { length?: number | string; width?: number | string; height?: number | string; unit?: string }
  | null
  | undefined;

type InvoiceApiResponse = {
  ok?: boolean;

  // invoice identity
  invoiceNumber?: string;
  shipmentId?: string;
  trackingNumber?: string;

  // status + money
  paid?: boolean;
  invoice?: Money | null; // some APIs return invoice: {amount,currency}
  amount?: number; // some APIs return amount at top-level
  currency?: string;

  // payment details (admin can set this)
  paymentMethod?: string | null;

  // shipment details
  senderName?: string;
  senderEmail?: string;
  receiverName?: string;
  receiverEmail?: string;

  origin?: string | null;
  destination?: string | null;
  currentStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  declaredValue?: number | string | null;
  declaredValueCurrency?: string | null;

  weight?: number | string | null;
  weightUnit?: string | null;

  dimensions?: Dimensions;

  // charges breakdown (optional)
  charges?: {
    shipping?: number;
    insurance?: number;
    fuel?: number;
    tax?: number;
    discount?: number;
    subtotal?: number;
    total?: number;
    currency?: string;
  } | null;

  // optional message from server
  error?: string;
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function n(num: any) {
  const v = Number(num);
  return Number.isFinite(v) ? v : 0;
}

function fmtMoney(amount: number, currency: string) {
  const a = n(amount);
  const c = (currency || "USD").toUpperCase();
  return `${a.toFixed(2)} ${c}`;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function normalizePaymentMethod(v: any) {
  const s = safeStr(v);
  return s || "";
}

const ACCEPTED_METHODS = [
  "Cryptocurrency",
  "Bank transfer",
  "PayPal",
  "Zelle",
  "Cash",
  "Other",
];

export default function InvoiceFullPage() {
  const params = useParams();
  const sp = useSearchParams();
  const locale = (params?.locale as string) || "en";

  const q = useMemo(() => safeStr(sp.get("q")), [sp]);
  const invoice = useMemo(() => safeStr(sp.get("invoice")), [sp]);
  const email = useMemo(() => safeStr(sp.get("email")).toLowerCase(), [sp]);

  const [data, setData] = useState<InvoiceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    setData(null);

    // We support either:
    // 1) q (tracking / shipment id)
    // 2) invoice + email
    const payload: any = {};
    if (q) payload.q = q.toUpperCase();
    if (invoice) payload.invoice = invoice.toUpperCase();
    if (email) payload.email = email;

    if (!payload.q && (!payload.invoice || !payload.email)) {
      setErr("Invoice details are missing. Please open the invoice from the email or enter your invoice details again.");
      setLoading(false);
      return;
    }

    try {
      // ✅ Use POST so it works the same everywhere (and avoids caching issues)
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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

  // --- normalized fields (support different server shapes) ---
  const paid = Boolean(data?.paid);
  const invoiceNumber = safeStr(data?.invoiceNumber);
  const shipmentId = safeStr(data?.shipmentId);
  const trackingNumber = safeStr(data?.trackingNumber);

  const moneyAmount =
    data?.invoice?.amount ??
    (typeof data?.amount === "number" ? data.amount : undefined) ??
    (data?.charges?.total ?? undefined) ??
    0;

  const moneyCurrency =
    safeStr(data?.invoice?.currency) ||
    safeStr(data?.currency) ||
    safeStr(data?.charges?.currency) ||
    "USD";

  const paymentMethod = normalizePaymentMethod(data?.paymentMethod);

  const declaredValue = data?.declaredValue;
  const declaredValueCurrency = safeStr(data?.declaredValueCurrency) || moneyCurrency;

  const weight = data?.weight;
  const weightUnit = safeStr(data?.weightUnit) || "kg";

  const dim = data?.dimensions || null;
  const dimUnit = safeStr((dim as any)?.unit) || "cm";
  const dimLine = dim
    ? `${safeStr((dim as any)?.length) || "—"} × ${safeStr((dim as any)?.width) || "—"} × ${safeStr((dim as any)?.height) || "—"} ${dimUnit}`
    : "—";

  const statusLabel = safeStr(data?.currentStatus) || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top nav */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/invoice`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                       hover:border-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Invoice Search
          </Link>

          {trackingNumber || shipmentId || q ? (
            <Link
              href={`/${locale}/track/${encodeURIComponent((trackingNumber || shipmentId || q).toUpperCase())}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900
                         hover:border-blue-600 hover:text-blue-700 transition"
            >
              <Truck className="w-5 h-5 mr-2" /> View Shipment Tracking
            </Link>
          ) : null}
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
              If you opened this from an email, make sure you copied the invoice number correctly and used the sender/receiver email linked to the shipment.
            </p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Header / Hero */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden"
            >
              <div className="p-6 sm:p-8">
                {/* Brand row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* ✅ Logo (expects public/logo.png). If your filename differs, tell me and I’ll adjust. */}
                    <div className="h-12 w-12 rounded-2xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                      <Image
                        src="/logo.png"
                        alt="Exodus Logistics"
                        width={48}
                        height={48}
                        className="object-contain"
                      />
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">Exodus Logistics</p>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        Invoice Details
                      </h1>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-extrabold ${
                        paid
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}
                    >
                      {paid ? <BadgeCheck className="w-4 h-4" /> : <BadgeX className="w-4 h-4" />}
                      {paid ? "PAID" : "UNPAID"}
                    </div>

                    <p className="mt-2 text-xs text-gray-600">Amount</p>
                    <p className="text-lg font-extrabold text-gray-900">
                      {fmtMoney(moneyAmount, moneyCurrency)}
                    </p>
                  </div>
                </div>

                {/* IDs */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <FileText className="w-4 h-4 text-gray-700" />
                      Invoice number
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900 break-all">
                      {invoiceNumber || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Package className="w-4 h-4 text-gray-700" />
                      Shipment ID
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900 break-all">
                      {shipmentId || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Truck className="w-4 h-4 text-gray-700" />
                      Tracking number
                    </div>
                    <p className="mt-2 text-sm font-semibold text-gray-900 break-all">
                      {trackingNumber || "—"}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-700" />
                      Created
                    </div>
                    <p className="mt-2 text-sm text-gray-800 font-semibold">
                      {fmtDate(data.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Updated: <span className="font-semibold">{fmtDate(data.updatedAt)}</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-700" />
                      Route
                    </div>
                    <p className="mt-2 text-sm text-gray-800 font-semibold">
                      {safeStr(data.origin) || "—"} → {safeStr(data.destination) || "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Status: <span className="font-semibold">{statusLabel}</span>
                    </p>
                  </div>

                  {/* ✅ Declared value + weight + dimensions box */}
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Receipt className="w-4 h-4 text-gray-700" />
                      Declaration
                    </div>

                    <p className="mt-2 text-xs text-gray-600">
                      Declared value
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {declaredValue != null && String(declaredValue).trim() !== ""
                        ? `${declaredValue} ${declaredValueCurrency}`
                        : "—"}
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-600">Weight</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {weight != null && String(weight).trim() !== "" ? `${weight} ${weightUnit}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Dimensions</p>
                        <p className="text-sm font-semibold text-gray-900">{dimLine}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* People */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Mail className="w-4 h-4 text-gray-700" />
                      Sender
                    </div>
                    <p className="mt-2 text-sm text-gray-900 font-semibold">
                      {safeStr(data.senderName) || "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 break-all">
                      {safeStr(data.senderEmail) || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Mail className="w-4 h-4 text-gray-700" />
                      Receiver
                    </div>
                    <p className="mt-2 text-sm text-gray-900 font-semibold">
                      {safeStr(data.receiverName) || "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 break-all">
                      {safeStr(data.receiverEmail) || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* footer strip */}
              <div className="px-6 sm:px-8 py-4 bg-blue-50 border-t border-blue-100 text-sm text-gray-700">
                This invoice is linked to a specific shipment and can only be accessed using the correct invoice details.
              </div>
            </motion.div>

            {/* Payment method + Charges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* ✅ Payment Method Block */}
              <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-700" />
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Payment method
                  </h2>
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  Accepted payment methods:
                </p>

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
                    {paid ? (paymentMethod || "Not recorded") : "—"}
                  </p>

                  {!paid ? (
                    <p className="mt-2 text-sm text-gray-700">
                      This invoice is currently <span className="font-extrabold text-amber-700">UNPAID</span>.
                      Please proceed with payment using one of the accepted methods above.
                      Once payment is confirmed, the shipment will be eligible to move to the next stage.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-700">
                      This invoice is <span className="font-extrabold text-green-700">PAID</span>.
                      {paymentMethod
                        ? " Payment was successfully recorded in our system."
                        : " If you need the exact method used, support can confirm it for you."}
                    </p>
                  )}
                </div>
              </div>

              {/* Charges / breakdown */}
              <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-6">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-700" />
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Charges summary
                  </h2>
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  Breakdown may vary depending on route, package value, and service level.
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">Shipping</span>
                    <span className="font-semibold text-gray-900">
                      {fmtMoney(n(data?.charges?.shipping), moneyCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">Insurance</span>
                    <span className="font-semibold text-gray-900">
                      {fmtMoney(n(data?.charges?.insurance), moneyCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">Fuel</span>
                    <span className="font-semibold text-gray-900">
                      {fmtMoney(n(data?.charges?.fuel), moneyCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">Tax</span>
                    <span className="font-semibold text-gray-900">
                      {fmtMoney(n(data?.charges?.tax), moneyCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-gray-700">Discount</span>
                    <span className="font-semibold text-gray-900">
                      {fmtMoney(n(data?.charges?.discount), moneyCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-gray-900 font-extrabold">Total</span>
                    <span className="text-gray-900 font-extrabold">
                      {fmtMoney(
                        n(data?.charges?.total) || n(moneyAmount),
                        moneyCurrency
                      )}
                    </span>
                  </div>
                </div>

                {!paid ? (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    This invoice is unpaid. Please complete payment to avoid delays in processing.
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