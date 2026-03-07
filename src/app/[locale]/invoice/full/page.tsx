"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  FileText,
  Truck,
  CreditCard,
} from "lucide-react";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

type ApiResponse = {
  company?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };

  invoiceNumber?: string;
  status?: InvoiceStatus;
  currency?: string;
  total?: number;
  paid?: boolean;
  dueDate?: string | null;
  paymentMethod?: string | null;

  // ✅ NEW: breakdown contains actual money values (from DB or computed in API)
  breakdown?: {
    declaredValue?: number;

    shipping?: number;
    fuel?: number;
    handling?: number;
    customs?: number;
    insurance?: number;

    subtotal?: number;
    tax?: number;
    discount?: number;
    total?: number;

    // keep rates optional (some docs might still have it)
    rates?: any;
  };

  declaredValue?: number;

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
    senderEmail?: string;
    receiverName?: string;
    receiverEmail?: string;
  };

  dates?: {
    createdAt?: string | null;
    updatedAt?: string | null;
  };

  error?: string;
};

const ACCEPTED_METHODS = [
  "Cryptocurrency",
  "Bank transfer",
  "PayPal",
  "Zelle",
  "Cash",
  "Other",
];

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(amount: number, currency: string) {
  const c = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: c,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num(amount));
  } catch {
    return `${num(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${c}`;
  }
}

function fmtPercentFromDecimal(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  const pct = n * 100;
  const s =
    pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "");
  return `${s}%`;
}

function cleanTel(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() > d.getTime();
}

export default function InvoiceFullPage() {
  const params = useParams();
  const sp = useSearchParams();
  const locale = (params?.locale as string) || "en";

  const q = useMemo(() => safeStr(sp.get("q")), [sp]);
  const invoice = useMemo(() => safeStr(sp.get("invoice")), [sp]);
  const email = useMemo(() => safeStr(sp.get("email")).toLowerCase(), [sp]);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      setData(null);

      const url = new URL("/api/invoice", window.location.origin);
      if (q) url.searchParams.set("q", q.toUpperCase());
      if (invoice) url.searchParams.set("invoice", invoice.toUpperCase());
      if (email) url.searchParams.set("email", email);

      if (!q && !(invoice && email)) {
        setErr(
          "Invoice details are missing. Please open the invoice from the email link or search again with a valid invoice number."
        );
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(url.toString(), { method: "GET" });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;

        if (!res.ok) {
          setErr(
            (json as any)?.error ||
              (json as any)?.message ||
              "Invoice not found. Please verify your details and try again."
          );
          return;
        }

        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Invoice unavailable. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [q, invoice, email]);

  const invoiceNumber = safeStr(data?.invoiceNumber);
  const shipmentId = safeStr(data?.shipment?.shipmentId);
  const trackingNumber = safeStr(data?.shipment?.trackingNumber);

  const currency = safeStr(data?.currency) || "USD";

  // ✅ use breakdown declaredValue if available
  const declaredValue =
    num(data?.breakdown?.declaredValue ?? data?.declaredValue ?? 0) || 0;

  const dueDate = data?.dueDate ?? null;

  // ✅ STATUS:
  // - cancelled stays cancelled
  // - paid stays paid
  // - if unpaid and dueDate passed => overdue
  // - else unpaid
  const statusFromApi = (data?.status as InvoiceStatus) || (data?.paid ? "paid" : "unpaid");
  const status: InvoiceStatus = useMemo(() => {
    if (statusFromApi === "cancelled") return "cancelled";
    if (statusFromApi === "paid") return "paid";
    if (isOverdue(dueDate)) return "overdue";
    return "unpaid";
  }, [statusFromApi, dueDate]);

  // ✅ Use money values coming from API breakdown (matches your lib/pricing.ts)
  const calc = useMemo(() => {
    const b = data?.breakdown || {};

    const shipping = num(b.shipping);
    const fuel = num(b.fuel);
    const handling = num(b.handling);
    const customs = num(b.customs);
    const insurance = num(b.insurance);

    const discount = num(b.discount);
    const tax = num(b.tax);

    const subtotal =
      num(b.subtotal) || (shipping + fuel + handling + customs + insurance - discount);

    const total =
      num(b.total) || (subtotal + tax);

    return { shipping, fuel, handling, customs, insurance, discount, tax, subtotal, total };
  }, [data]);

  const paymentMethodRaw = data?.paymentMethod ? safeStr(data.paymentMethod) : "";
  const paymentMethod =
    status === "paid"
      ? "Payment confirmed"
      : status === "cancelled"
      ? "Not payable"
      : status === "overdue"
      ? "Payment required (Overdue)"
      : "Payment required";

  const paymentMethodLine =
    paymentMethodRaw && status !== "paid" && status !== "cancelled"
      ? paymentMethodRaw
      : "";

  const companyName = safeStr(data?.company?.name) || "Exodus Logistics Ltd.";
  const companyAddress =
    safeStr(data?.company?.address) ||
    "1199 E Calaveras Blvd, California, USA 90201";
  const companyPhone = safeStr(data?.company?.phone) || "+1 (516) 243-7836";
  const companyEmail =
    safeStr(data?.company?.email) || "support@goexoduslogistics.com";

  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";

  const shipmentType = safeStr(data?.shipment?.shipmentType) || "—";
  const serviceLevel = safeStr(data?.shipment?.serviceLevel) || "—";
  const weightKg = data?.shipment?.weightKg;
  const weightLine =
    weightKg != null && safeStr(weightKg) !== "" ? `${safeStr(weightKg)} kg` : "—";

  const dim = data?.shipment?.dimensionsCm;
  const dimUnit = safeStr(dim?.unit) || "cm";
  const dimLine = dim
    ? `${safeStr(dim.length) || "—"} × ${safeStr(dim.width) || "—"} × ${
        safeStr(dim.height) || "—"
      } ${dimUnit}`
    : "—";

  const statusBadge =
    status === "paid"
      ? "PAID"
      : status === "overdue"
      ? "OVERDUE"
      : status === "cancelled"
      ? "CANCELLED"
      : "UNPAID";

  const statusColor =
    status === "paid"
      ? "bg-green-50 border-green-200 text-green-800"
      : status === "overdue"
      ? "bg-red-50 border-red-200 text-red-800"
      : status === "cancelled"
      ? "bg-gray-50 border-gray-200 text-gray-800"
      : "bg-amber-50 border-amber-200 text-amber-800";

  const paymentMessage =
    status === "paid"
      ? "This invoice has been paid. Thank you — payment has been confirmed in our system."
      : status === "overdue"
      ? "This invoice is overdue. Please complete payment as soon as possible to avoid delays in processing."
      : status === "cancelled"
      ? "This invoice has been cancelled. If you believe this is an error, please contact support."
      : "This invoice is unpaid. Please complete payment using one of the accepted methods below. Once payment is confirmed, the shipment will be eligible to move to the next stage.";

  const printNow = () => window.print();
  const backToTrackTarget = trackingNumber || shipmentId || (q ? q.toUpperCase() : "");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-10">
      {/* PRINT: Print ONLY the receipt area */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
          }

          /* Hide EVERYTHING by default */
          body * {
            visibility: hidden !important;
          }

          /* Show ONLY the invoice receipt */
          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          /* extra safety: hide typical site chrome */
          header,
          nav,
          footer {
            display: none !important;
          }

          .no-print {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .print-card {
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4">
        {/* Top nav (screen only) */}
        <div className="no-print mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <Link
            href={`/${locale}/invoice`}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-700 transition"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Invoice Search
          </Link>

          {backToTrackTarget ? (
            <Link
              href={`/${locale}/track/${encodeURIComponent(backToTrackTarget)}`}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-gray-300 bg-white font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-700 transition"
            >
              <Truck className="w-5 h-5 mr-2" /> Track Shipment
            </Link>
          ) : null}

          <button
            type="button"
            onClick={printNow}
            className="sm:ml-auto inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-blue-700 text-white font-semibold shadow hover:bg-blue-800 hover:shadow-lg transition cursor-pointer"
          >
            <Printer className="w-5 h-5 mr-2" />
            Print
          </button>
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
              If you opened this from an email, confirm the invoice number and the sender/receiver email linked to the shipment.
            </p>
          </div>
        )}

        {!loading && data && (
          <div className="print-area">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-card"
            >
              {/* INVOICE HEADER (MATCH TOP HEADER STYLE) */}
              <div className="relative">
                <div className="bg-gradient-to-r from-white via-blue-600 to-cyan-600">
                  {/* subtle overlay for readability */}
                  <div className="bg-black/10">
                    <div className="p-6 sm:p-8">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="flex items-center gap-4">
                            <Image
                              src="/logo.png"
                              alt="Exodus Logistics"
                              width={200}
                              height={70}
                              priority
                              className="h-12 w-auto sm:h-16 object-contain"
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-white font-extrabold text-base sm:text-lg leading-tight">
                              {companyName}
                            </p>
                            <p className="text-white/90 text-xs sm:text-sm mt-1 max-w-2xl">
                              {companyAddress}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm">
                              <a
                                href={`tel:${cleanTel(companyPhone)}`}
                                className="inline-flex items-center gap-2 text-white hover:text-white underline underline-offset-4"
                                style={{ cursor: "pointer" }}
                              >
                                <Phone className="w-4 h-4" />
                                {companyPhone}
                              </a>

                              <a
                                href={`mailto:${companyEmail}`}
                                className="inline-flex items-center gap-2 text-white hover:text-white underline underline-offset-4"
                                style={{ cursor: "pointer" }}
                              >
                                <Mail className="w-4 h-4" />
                                {companyEmail}
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-white/90 text-xs">Invoice number</p>
                          <p className="text-white font-extrabold text-lg sm:text-2xl tracking-wide break-all">
                            {invoiceNumber || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BODY */}
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-700" />
                      Created
                    </div>
                    <p className="mt-2 text-sm text-gray-800 font-semibold">
                      {fmtDate(data?.dates?.createdAt || null)}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Updated:{" "}
                      <span className="font-semibold">
                        {fmtDate(data?.dates?.updatedAt || null)}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <Package className="w-4 h-4 text-gray-700" />
                      Shipment
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-600">Shipment ID</p>
                        <p className="font-semibold text-gray-900 break-all">
                          {shipmentId || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600">Tracking</p>
                        <p className="font-semibold text-gray-900 break-all">
                          {trackingNumber || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600">Invoice number</p>
                        <p className="font-semibold text-gray-900 break-all">
                          {invoiceNumber || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {fmtMoney(calc.total, currency)}
                    </p>

                    <div
                      className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold ${statusColor}`}
                    >
                      {statusBadge}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs text-gray-600">Due date</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {dueDate ? new Date(dueDate).toLocaleDateString() : "—"}
                      </p>
                    </div>

                    <p className="mt-3 text-sm text-gray-700">
                      {status === "paid"
                        ? "Payment has been confirmed."
                        : status === "cancelled"
                        ? "This invoice is not payable."
                        : status === "overdue"
                        ? "This invoice is overdue. Please pay to avoid delays."
                        : "Please complete payment to move the shipment to the next stage."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-700" />
                      Route
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-600">From</p>
                        <p className="font-semibold text-gray-900">{originFull}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">To</p>
                        <p className="font-semibold text-gray-900">
                          {destinationFull}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600">
                        Shipment status:{" "}
                        <span className="font-semibold text-gray-900">
                          {safeStr(data?.shipment?.status) || "—"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <FileText className="w-4 h-4 text-gray-700" />
                      Declaration
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-600">Declared value</p>
                        <p className="font-semibold text-gray-900">
                          {fmtMoney(declaredValue, currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Type</p>
                        <p className="font-semibold text-gray-900">{shipmentType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Service</p>
                        <p className="font-semibold text-gray-900">{serviceLevel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Weight</p>
                        <p className="font-semibold text-gray-900">{weightLine}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-600">Dimensions</p>
                        <p className="font-semibold text-gray-900">{dimLine}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="mt-4 rounded-3xl border border-gray-200 bg-white shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-700" />
                    <h2 className="text-lg font-extrabold text-gray-900">Parties</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Sender */}
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-600">Sender</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {safeStr(data?.parties?.senderName) || "—"}
                      </p>
                      <p className="text-gray-700 break-all">
                        {safeStr(data?.parties?.senderEmail) || "—"}
                      </p>
                    </div>

                    {/* Receiver */}
                    <div className="rounded-2xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-600">Receiver</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {safeStr(data?.parties?.receiverName) || "—"}
                      </p>
                      <p className="text-gray-700 break-all">
                        {safeStr(data?.parties?.receiverEmail) || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-3xl border border-gray-200 bg-white shadow p-6">
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
                      <p className="text-xs text-gray-600">Status</p>
                      <p className="mt-1 text-sm font-extrabold text-gray-900">
                        {paymentMethod}
                      </p>

                      <p className="mt-3 text-xs text-gray-600">Recorded method</p>
                      <p className="mt-1 text-sm font-extrabold text-gray-900">
                        {paymentMethodLine ? paymentMethodLine : "NULL"}
                      </p>

                      <p className="mt-2 text-sm text-gray-700">{paymentMessage}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white shadow p-6">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-700" />
                      <h2 className="text-lg font-extrabold text-gray-900">
                        Charges summary
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      Charges are calculated from your declared value.
                    </p>

                    <div className="mt-5 space-y-2 text-sm">
  <Row label={`Shipping fee`} value={fmtMoney(calc.shipping, currency)} />
  <Row
    label={`Fuel surcharge (${fmtPercentFromDecimal(
      (data as any)?.breakdown?.pricingUsed?.fuelRate ??
        (data as any)?.pricingUsed?.fuelRate ??
        0
    )})`}
    value={fmtMoney(calc.fuel, currency)}
  />
  <Row label={`Handling fee`} value={fmtMoney(calc.handling, currency)} />
  <Row label={`Customs fee`} value={fmtMoney(calc.customs, currency)} />
  <Row
    label={`Insurance (${fmtPercentFromDecimal(
      (data as any)?.breakdown?.pricingUsed?.insuranceRate ??
        (data as any)?.pricingUsed?.insuranceRate ??
        0
    )})`}
    value={fmtMoney(calc.insurance, currency)}
  />
  <Row label={`Tax`} value={fmtMoney(calc.tax, currency)} />
  <Row label={`Discount`} value={fmtMoney(calc.discount, currency)} />

                      <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-gray-900 font-semibold">Subtotal</span>
                        <span className="text-gray-900 font-semibold">
                          {fmtMoney(calc.subtotal, currency)}
                        </span>
                      </div>

                      <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center justify-between">
                        <span className="text-blue-900 font-extrabold text-lg">
                          Total
                        </span>
                        <span className="text-blue-900 font-extrabold text-2xl">
                          {fmtMoney(calc.total, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification / Security note */}
                <div className="mt-6 mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-gray-800">
                    This invoice is system generated and valid without signature.
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    For verification, use your{" "}
                    <span className="font-semibold text-gray-800">shipment ID</span> on our official website.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-700">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}