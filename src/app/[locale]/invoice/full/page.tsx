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
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  Receipt,
  Truck,
  CreditCard,
} from "lucide-react";

type InvoiceStatus = "paid" | "pending" | "overdue" | "cancelled";

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
  };

  declaredValue?: number;
  declaredValueCurrency?: string;

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

    senderCity?: string | null;
    senderState?: string | null;
    senderCountry?: string | null;

    receiverCity?: string | null;
    receiverState?: string | null;
    receiverCountry?: string | null;
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
    // fallback
    return `${num(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
  }
}

function fmtPercent(v: any) {
  const x = Number(v);
  if (!Number.isFinite(x)) return "0%";
  // keep up to 2dp if needed
  const s = x % 1 === 0 ? String(x) : x.toFixed(2).replace(/\.?0+$/, "");
  return `${s}%`;
}

function cleanTel(phone: string) {
  // keep + and digits
  return phone.replace(/[^\d+]/g, "");
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

      // build GET url to match your API route.ts (GET)
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
  const totalAmount = num(data?.total);

  const declaredValue =
    num(data?.breakdown?.declaredValue ?? data?.declaredValue ?? 0) || 0;

  const rates = {
    shipping: num(data?.breakdown?.rates?.shippingRate ?? 10),
    insurance: num(data?.breakdown?.rates?.insuranceRate ?? 1.5),
    fuel: num(data?.breakdown?.rates?.fuelRate ?? 0.5),
    customs: num(data?.breakdown?.rates?.customsRate ?? 2),
    tax: num(data?.breakdown?.rates?.taxRate ?? 0),
    discount: num(data?.breakdown?.rates?.discountRate ?? 0),
  };

  // Charges calculated from declared value (as requested)
  const calc = useMemo(() => {
    const shipping = declaredValue * (rates.shipping / 100);
    const insurance = declaredValue * (rates.insurance / 100);
    const fuel = declaredValue * (rates.fuel / 100);
    const customs = declaredValue * (rates.customs / 100);
    const tax = declaredValue * (rates.tax / 100);
    const discount = declaredValue * (rates.discount / 100);

    const subtotal = shipping + insurance + fuel + customs + tax - discount;
    const total = totalAmount > 0 ? totalAmount : subtotal;

    return { shipping, insurance, fuel, customs, tax, discount, subtotal, total };
  }, [declaredValue, rates, totalAmount]);

  const status: InvoiceStatus =
    (data?.status as InvoiceStatus) ||
    (data?.paid ? "paid" : "pending");

  const paymentMethod = data?.paymentMethod ? safeStr(data.paymentMethod) : "";

  const dueDate = data?.dueDate ?? null;

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
    ? `${safeStr(dim.length) || "—"} × ${safeStr(dim.width) || "—"} × ${safeStr(dim.height) || "—"} ${dimUnit}`
    : "—";

  const statusBadge = (() => {
    if (status === "paid") return "PAID";
    if (status === "overdue") return "OVERDUE";
    if (status === "cancelled") return "CANCELLED";
    return "PAYMENT PENDING";
  })();

  const statusColor = (() => {
    if (status === "paid") return "bg-green-50 border-green-200 text-green-800";
    if (status === "overdue") return "bg-red-50 border-red-200 text-red-800";
    if (status === "cancelled") return "bg-gray-50 border-gray-200 text-gray-800";
    return "bg-amber-50 border-amber-200 text-amber-800";
  })();

  const paymentMessage = (() => {
    if (status === "paid") {
      return "This invoice has been paid. Thank you — payment has been confirmed in our system.";
    }
    if (status === "overdue") {
      return "This invoice is overdue. Please complete payment as soon as possible to avoid delays in processing.";
    }
    if (status === "cancelled") {
      return "This invoice has been cancelled. If you believe this is an error, please contact support.";
    }
    return "Payment is pending. Please proceed with payment using one of the accepted methods above. Once payment is confirmed, the shipment will be eligible to move to the next stage.";
  })();

  const printNow = () => window.print();

  const backToTrackTarget =
    trackingNumber || shipmentId || (q ? q.toUpperCase() : "");

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-cyan-50 py-10">
      {/* PRINT STYLES (no duplicate header/footer; hide nav/buttons) */}
      <style jsx global>{`
        @media print {
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
          .print-page {
            padding: 0 !important;
            margin: 0 !important;
          }
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 print-page">
        {/* Top nav */}
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
            className="sm:ml-auto inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-blue-700 text-white font-semibold shadow hover:bg-blue-800 transition cursor-pointer"
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
          <>
            {/* Main invoice card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-card avoid-break"
            >
              {/* Header */}
              <div className="relative">
                <div className="bg-gradient-to-r from-white via-blue-900 to-cyan-800">
                  {/* overlay to keep text readable */}
                  <div className="bg-gradient-to-r from-white/85 via-white/10 to-white/0">
                    <div className="p-6 sm:p-8 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/95 border border-white/60 overflow-hidden flex items-center justify-center shadow">
                            {/* If your SVG is in /public/logo.svg, keep this */}
                            <Image
                              src="/logo.svg"
                              alt="Exodus Logistics"
                              width={72}
                              height={72}
                              className="object-contain"
                            />
                          </div>

                          <div className="text-gray-900">
                            <p className="text-sm font-semibold">{companyName}</p>
                            <p className="text-xs text-gray-700 mt-1 max-w-xl">
                              {companyAddress}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                              <a
                                href={`tel:${cleanTel(companyPhone)}`}
                                className="inline-flex items-center gap-2 text-gray-800 hover:text-blue-800 underline underline-offset-2"
                              >
                                <Phone className="w-4 h-4" />
                                {companyPhone}
                              </a>

                              <a
                                href={`mailto:${companyEmail}`}
                                className="inline-flex items-center gap-2 text-gray-800 hover:text-blue-800 underline underline-offset-2"
                              >
                                <Mail className="w-4 h-4" />
                                {companyEmail}
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-700">Invoice number</p>
                          <p className="text-lg sm:text-2xl font-extrabold text-gray-900 tracking-wide break-all">
                            {invoiceNumber || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary row */}
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Created */}
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

                  {/* Shipment identifiers only */}
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

                  {/* Total + due + status */}
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-2xl font-extrabold text-gray-900">
                      {fmtMoney(calc.total, currency)}
                    </p>

                    <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-extrabold ${statusColor}`}>
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
                        : "Please complete payment to move the shipment to the next stage."}
                    </p>
                  </div>
                </div>

                {/* Route + Declared box */}
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
                        <p className="font-semibold text-gray-900">{destinationFull}</p>
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
                      <Receipt className="w-4 h-4 text-gray-700" />
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

                {/* Payment + Charges */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 avoid-break">
                  {/* Payment method */}
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
                      <p className="text-xs text-gray-600">Recorded method</p>
                      <p className="mt-1 text-sm font-extrabold text-gray-900">
                        {paymentMethod ? paymentMethod : "NULL"}
                      </p>

                      <p className="mt-2 text-sm text-gray-700">{paymentMessage}</p>
                    </div>
                  </div>

                  {/* Charges */}
                  <div className="rounded-3xl border border-gray-200 bg-white shadow p-6">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-blue-700" />
                      <h2 className="text-lg font-extrabold text-gray-900">
                        Charges summary
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      Charges are calculated from your declared value.
                    </p>

                    <div className="mt-5 space-y-2 text-sm">
                      <Row label={`Shipping (${fmtPercent(rates.shipping)})`} value={fmtMoney(calc.shipping, currency)} />
                      <Row label={`Insurance (${fmtPercent(rates.insurance)})`} value={fmtMoney(calc.insurance, currency)} />
                      <Row label={`Fuel (${fmtPercent(rates.fuel)})`} value={fmtMoney(calc.fuel, currency)} />
                      <Row label={`Customs (${fmtPercent(rates.customs)})`} value={fmtMoney(calc.customs, currency)} />
                      <Row label={`Tax (${fmtPercent(rates.tax)})`} value={fmtMoney(calc.tax, currency)} />
                      <Row
                        label={`Discount (${fmtPercent(rates.discount)})`}
                        value={fmtMoney(calc.discount, currency)}
                      />

                      <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-gray-900 font-bold">Subtotal</span>
                        <span className="text-gray-900 font-bold">
                          {fmtMoney(calc.subtotal, currency)}
                        </span>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-gray-900 font-extrabold text-lg">Total</span>
                        <span className="text-gray-900 font-extrabold text-2xl">
                          {fmtMoney(calc.total, currency)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`mt-5 rounded-2xl border p-4 text-sm ${
                        status === "paid"
                          ? "border-green-200 bg-green-50 text-green-900"
                          : status === "overdue"
                          ? "border-red-200 bg-red-50 text-red-900"
                          : status === "cancelled"
                          ? "border-gray-200 bg-gray-50 text-gray-800"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}
                    >
                      {status === "paid"
                        ? "Payment confirmed. Thank you — your invoice has been settled."
                        : status === "overdue"
                        ? "This invoice is overdue. Please complete payment as soon as possible."
                        : status === "cancelled"
                        ? "This invoice has been cancelled and is not payable."
                        : "Payment is pending. Please complete payment to avoid delays in processing."}
                    </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-700">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}