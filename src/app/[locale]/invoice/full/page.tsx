"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, Calendar, Mail, MapPin, Package,
  Phone, Printer, FileText, Truck, CreditCard, ShieldCheck,
} from "lucide-react";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "cancelled";

type ApiResponse = {
  company?: { name?: string; address?: string; phone?: string; email?: string };
  invoiceNumber?: string;
  status?: InvoiceStatus;
  currency?: string;
  total?: number;
  paid?: boolean;
  dueDate?: string | null;
  paymentMethod?: string | null;
  breakdown?: {
    declaredValue?: number; shipping?: number; fuel?: number; handling?: number;
    customs?: number; insurance?: number; subtotal?: number; tax?: number;
    discount?: number; total?: number; rates?: any; pricingUsed?: any;
    baseFreight?: number;
  };
  declaredValue?: number;
  shipment?: {
    shipmentId?: string; trackingNumber?: string; originFull?: string;
    destinationFull?: string; status?: string; shipmentType?: string | null;
    serviceLevel?: string | null; weightKg?: number | string | null;
    dimensionsCm?: { length?: any; width?: any; height?: any; unit?: string } | null;
    shipmentMeans?: string | null;
  };
  parties?: { senderName?: string; senderEmail?: string; receiverName?: string; receiverEmail?: string };
  currentStatus?: string;
  lastEventAt?: string | null;
  dates?: { createdAt?: string | null; updatedAt?: string | null };
  estimatedDelivery?: string | null;
  estimatedDeliveryDateMin?: string | null;
  shipmentScope?: string | null;
  error?: string;
};

const ACCEPTED_METHODS = ["Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"];

function safeStr(v: any) { return String(v ?? "").trim(); }

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d);
}

function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// ─── Comma formatting helpers ─────────────────────────────────────
function fmtNumberWithCommas(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtMoney(amount: number, currency: string) {
  const c = (currency || "USD").toUpperCase();
  return `${c} ${fmtNumberWithCommas(num(amount), 2)}`;
}

function fmtIntWithCommas(value: any): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return safeStr(value) || "—";
  // Show as-is if integer; otherwise up to 2 decimals
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtPercent(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "0%";
  const pct = n < 1 ? n * 100 : n;
  return `${pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function cleanTel(phone: string) { return phone.replace(/[^\d+]/g, ""); }

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() > d.getTime();
}

// ─── Estimated delivery formatter (mirrors admin create-shipment) ───
// Uses real min/max from API if available; falls back to +2/+3 days
function fmtEstimatedDelivery(
  maxISO?: string | null,
  minISO?: string | null,
  scope?: string | null
): string {
  if (!maxISO) return "—";
  const maxD = new Date(maxISO);
  if (Number.isNaN(maxD.getTime())) return "—";

  let minD: Date;
  if (minISO) {
    const d = new Date(minISO);
    minD = Number.isNaN(d.getTime()) ? new Date(maxD) : d;
  } else {
    // Fallback: extrapolate min from max
    const extra = String(scope || "").toLowerCase() === "local" ? 2 : 3;
    minD = new Date(maxD);
    minD.setDate(minD.getDate() - extra);
  }

  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const fmtFull = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (minD.getTime() === maxD.getTime()) return fmtFull(maxD);
  if (minD.getMonth() === maxD.getMonth() && minD.getFullYear() === maxD.getFullYear()) {
    return `${minD.getDate()}–${maxD.getDate()} ${maxD.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
  }
  return `${fmt(minD)} – ${fmtFull(maxD)}`;
}

export default function InvoiceFullPage() {
  const router = useRouter();
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
      setLoading(true); setErr(""); setData(null);
      const url = new URL("/api/invoice", window.location.origin);
      if (q) url.searchParams.set("q", q.toUpperCase());
      if (invoice) url.searchParams.set("invoice", invoice.toUpperCase());
      if (email) url.searchParams.set("email", email);
      if (!q && !(invoice && email)) {
        setErr("Invoice details are missing. Please open the invoice from your email or search again.");
        setLoading(false); return;
      }
      try {
        const res = await fetch(url.toString(), { method: "GET" });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;
        if (!res.ok) { setErr((json as any)?.error || "Invoice not found. Please verify your details and try again."); return; }
        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Invoice unavailable. Please try again later.");
      } finally { setLoading(false); }
    };
    void load();
  }, [q, invoice, email]);

  const invoiceNumber = safeStr(data?.invoiceNumber);
  const shipmentId = safeStr(data?.shipment?.shipmentId);
  const trackingNumber = safeStr(data?.shipment?.trackingNumber);
  const currency = safeStr(data?.currency) || "USD";
  const declaredValue = num(data?.breakdown?.declaredValue ?? data?.declaredValue ?? 0);
  const dueDate = data?.dueDate ?? null;

  const statusFromApi = (data?.status as InvoiceStatus) || (data?.paid ? "paid" : "unpaid");
  const status: InvoiceStatus = useMemo(() => {
    if (statusFromApi === "cancelled") return "cancelled";
    if (statusFromApi === "paid") return "paid";
    if (statusFromApi === "overdue") return "overdue";
    if (statusFromApi === "unpaid" && isOverdue(dueDate)) return "overdue";
    return "unpaid";
  }, [statusFromApi, dueDate]);

  // ─── Breakdown values (mirrors admin create-shipment Invoice Preview) ───
  const calc = useMemo(() => {
    const b = data?.breakdown || {};
    const baseFreight = num(b.baseFreight ?? b.shipping);
    const fuel = num(b.fuel);
    const handling = num(b.handling);
    const customs = num(b.customs);
    const insurance = num(b.insurance);
    const discount = num(b.discount);
    const tax = num(b.tax);
    const subtotal = num(b.subtotal) || (baseFreight + fuel + handling + customs + insurance - discount);
    const total = num(b.total) || (subtotal + tax);
    return { baseFreight, fuel, handling, customs, insurance, discount, tax, subtotal, total };
  }, [data]);

  const pricingUsed = (data as any)?.pricingUsed || (data as any)?.breakdown?.pricingUsed || {};
  const fuelRate = pricingUsed?.fuelSurchargeRate ?? pricingUsed?.fuelRate ?? pricingUsed?.fuel ?? 0;
  const insuranceRate = pricingUsed?.insuranceRate ?? pricingUsed?.insurance ?? pricingUsed?.insurancePercent ?? 0;

  const paymentMethodRaw = safeStr(data?.paymentMethod);

  const companyName = safeStr(data?.company?.name) || "Exodus Logistics Ltd.";
  const companyAddress = safeStr(data?.company?.address) || "1199 E Calaveras Blvd, California, USA 90201";
  const companyPhone = safeStr(data?.company?.phone) || "+1 (516) 243-7836";
  const companyEmail = safeStr(data?.company?.email) || "support@goexoduslogistics.com";

  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";
  const shipmentType = safeStr(data?.shipment?.shipmentType) || "—";
  const serviceLevel = safeStr(data?.shipment?.serviceLevel) || "—";
  const shipmentMeans = safeStr(data?.shipment?.shipmentMeans) || "—";
  const weightKg = data?.shipment?.weightKg;
  const weightLine = weightKg != null && safeStr(weightKg) !== ""
    ? `${fmtIntWithCommas(weightKg)} kg`
    : "—";
  const dim = data?.shipment?.dimensionsCm;
  const dimUnit = safeStr(dim?.unit) || "cm";
  const dimLine = dim
    ? `${fmtIntWithCommas(dim.length)} × ${fmtIntWithCommas(dim.width)} × ${fmtIntWithCommas(dim.height)} ${dimUnit}`
    : "—";

  // Estimated delivery (using new format, with real min if available)
  const estDeliveryStr = useMemo(
    () => fmtEstimatedDelivery(
      data?.estimatedDelivery,
      data?.estimatedDeliveryDateMin,
      data?.shipmentScope,
    ),
    [data?.estimatedDelivery, data?.estimatedDeliveryDateMin, data?.shipmentScope]
  );

  const statusBadge = status === "paid" ? "PAID" : status === "overdue" ? "OVERDUE" : status === "cancelled" ? "CANCELLED" : "UNPAID";
  const statusColor = status === "paid" ? "bg-green-50 border-green-200 text-green-800" : status === "overdue" ? "bg-red-50 border-red-200 text-red-800" : status === "cancelled" ? "bg-gray-50 border-gray-200 text-gray-700" : "bg-amber-50 border-amber-200 text-amber-800";
  const statusDot = status === "paid" ? "bg-green-500" : status === "overdue" ? "bg-red-500" : status === "cancelled" ? "bg-gray-400" : "bg-amber-500";

  const paymentMethodLine = paymentMethodRaw
    ? `Completed via ${paymentMethodRaw}`
    : status === "paid" ? "Payment method not recorded"
    : status === "cancelled" ? "Not applicable"
    : status === "overdue" ? "Awaiting payment — please remit immediately"
    : "Awaiting payment — choose a method above";

  const paymentMessage = status === "paid"
    ? "Payment has been received and confirmed in our system. No further action is required. A receipt has been issued for your records."
    : status === "overdue"
    ? "This invoice is past its due date. Immediate payment is required to avoid shipment delays or cancellation. Please contact our support team if you need assistance."
    : status === "cancelled"
    ? "This invoice has been cancelled and is no longer payable. If you wish to reinstate your shipment or believe this is an error, please reach out to our support team."
    : "This invoice is currently outstanding. Please complete your payment at the earliest opportunity to ensure your shipment is processed and dispatched without delay.";

  const dueDateLine = dueDate
    ? (status === "overdue"
      ? `Overdue since ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : status === "paid"
      ? `Was due ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : `Due by ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`)
    : status === "paid" ? "Paid in full" : "No due date set";

  const printNow = () => window.print();
  const backToTrackTarget = trackingNumber || shipmentId || (q ? q.toUpperCase() : "");

  const card = "rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:border-blue-400 hover:shadow-md transition";
  const card5 = "rounded-2xl border border-gray-200 bg-white shadow-sm p-5 hover:border-blue-400 hover:shadow-md transition";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-white">
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          header, nav, footer { display: none !important; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-white * { color: white !important; }
          .print-white > div {
            display: flex !important; flex-direction: row !important;
            align-items: center !important; justify-content: space-between !important; text-align: left !important;
          }
          .print-white > div > div:first-child {
            display: flex !important; flex-direction: row !important; align-items: center !important; gap: 16px !important;
          }
          .print-white > div > div:first-child > div { text-align: left !important; }
          .print-white > div > div:first-child > div > div {
            display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: flex-start !important;
          }
          .print-white img { height: 40px !important; width: auto !important; content: url('/logo.svg') !important; }
          .print-white > div > div:last-child { text-align: right !important; min-width: 200px !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">

        {/* ── TOP NAV ── */}
        <div className="no-print mb-6 flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={() => router.replace(`/${locale}/invoice`)}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Invoice Search
          </button>
          {backToTrackTarget && (
            <Link href={`/${locale}/track/${encodeURIComponent(backToTrackTarget)}`}
              className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
              <Truck className="w-4 h-4" /> Track Shipment
            </Link>
          )}
          <button type="button" onClick={printNow}
            className="cursor-pointer w-full sm:w-auto sm:ml-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow-sm">
            <Printer className="w-4 h-4" /> Print Invoice
          </button>
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg flex items-center gap-3 print-card">
            <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Loading invoice…</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-lg print-card">
            <div className="flex items-center gap-3 text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" /> {err}
            </div>
            <p className="mt-2 text-sm text-gray-500 pl-8">
              If you opened this from an email, confirm the invoice number and the email address linked to the shipment.
            </p>
          </div>
        )}

        {!loading && data && (
          <div className="print-area">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-card">

              {/* ── INVOICE HEADER ── */}
              <div
                style={{ background: "linear-gradient(to right, #1d4ed8 0%, #0891b2 100%)" }}
                className="p-6 sm:p-8 print-white"
              >
                <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left gap-5">

                  <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-4 min-w-0">
                    <Image
                      src="/logo.svg"
                      alt="Exodus Logistics"
                      width={160} height={50} priority
                      className="h-10 sm:h-14 w-auto object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-white font-extrabold text-base sm:text-lg leading-tight">{companyName}</p>
                      <p className="text-white/80 text-xs sm:text-sm mt-0.5">{companyAddress}</p>
                      <div className="mt-2 flex flex-col items-center md:items-start md:flex-row flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm">
                        <a href={`tel:${cleanTel(companyPhone)}`}
                          className="cursor-pointer inline-flex items-center gap-1.5 text-white hover:text-white/80 transition underline underline-offset-2">
                          <Phone className="w-3.5 h-3.5 shrink-0" /> {companyPhone}
                        </a>
                        <a href={`mailto:${companyEmail}`}
                          className="cursor-pointer inline-flex items-center gap-1.5 text-white hover:text-white/80 transition underline underline-offset-2">
                          <Mail className="w-3.5 h-3.5 shrink-0" /> {companyEmail}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 md:text-right">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Invoice</p>
                    <p className="text-white font-extrabold text-xl sm:text-2xl tracking-wide">{invoiceNumber || "—"}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold bg-white/10 border-white/30 text-white">
                      <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                      {statusBadge}
                    </div>
                  </div>

                </div>
              </div>

              {/* ── BODY ── */}
              <div className="p-5 sm:p-8 space-y-5">

                {/* Top 3 summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={card}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Dates</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-0.5">Created</p>
                    <p className="text-sm font-bold text-gray-900">{fmtDate(data?.dates?.createdAt || null)}</p>
                    <p className="text-xs text-gray-500 mt-2 mb-0.5">Last updated</p>
                    <p className="text-sm font-bold text-gray-900">{fmtDate(data?.lastEventAt || data?.dates?.updatedAt || null)}</p>
                    {data?.estimatedDelivery && (
                      <>
                        <p className="text-xs text-gray-500 mt-2 mb-0.5">Est. delivery</p>
                        <p className="text-sm font-bold text-gray-900">{estDeliveryStr}</p>
                      </>
                    )}
                    <p className="mt-2 text-[10px] text-gray-400">Times shown in your local timezone</p>
                  </div>

                  <div className={card}>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Shipment IDs</p>
                    </div>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Shipment No.</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{shipmentId || "—"}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-2">Tracking No.</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{trackingNumber || "—"}</p>
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-2">Invoice No.</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{invoiceNumber || "—"}</p>
                  </div>

                  <div className={card}>
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Amount Due</p>
                    </div>
                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{fmtMoney(calc.total, currency)}</p>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{statusBadge}
                    </div>
                    <p className="mt-2 text-xs text-gray-600 font-medium">{dueDateLine}</p>
                    <p className="mt-1 text-xs text-gray-500">{status === "paid" ? "Thank you for your payment." : status === "cancelled" ? "This invoice is no longer active." : status === "overdue" ? "Immediate payment required." : "Please complete payment promptly."}</p>
                  </div>
                </div>

                {/* Route + Declaration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Route</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">From</p>
                        <p className="font-semibold text-gray-900">{originFull}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">To</p>
                        <p className="font-semibold text-gray-900">{destinationFull}</p>
                      </div>
                      <p className="text-xs text-gray-500">Status: <span className="font-semibold text-gray-700">{safeStr(data?.currentStatus || data?.shipment?.status) || "—"}</span></p>
                    </div>
                  </div>

                  <div className={card}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Declaration</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Declared Value</p><p className="font-semibold text-gray-900">{fmtMoney(declaredValue, currency)}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Type</p><p className="font-semibold text-gray-900">{shipmentType}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Service</p><p className="font-semibold text-gray-900">{serviceLevel}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Weight</p><p className="font-semibold text-gray-900">{weightLine}</p></div>
                      <div className="col-span-2"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Dimensions</p><p className="font-semibold text-gray-900">{dimLine}</p></div>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className={card5}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Parties</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Sender</p>
                      <p className="font-semibold text-gray-900 text-sm">{safeStr(data?.parties?.senderName) || "—"}</p>
                      <p className="text-gray-600 text-sm break-all">{safeStr(data?.parties?.senderEmail) || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Receiver</p>
                      <p className="font-semibold text-gray-900 text-sm">{safeStr(data?.parties?.receiverName) || "—"}</p>
                      <p className="text-gray-600 text-sm break-all">{safeStr(data?.parties?.receiverEmail) || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Payment + Charges Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={card5}>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Payment</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Accepted payment methods:</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ACCEPTED_METHODS.map((m) => (
                        <span key={m} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">{m}</span>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Payment Status</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                          {status === "paid" ? "Confirmed and Received"
                            : status === "overdue" ? "Overdue — Action Required"
                            : status === "cancelled" ? "Invoice Cancelled"
                            : "Outstanding — Awaiting Payment"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Recorded Payment Method</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">{paymentMethodLine}</p>
                      </div>
                      <p className="text-xs text-gray-600 pt-2 border-t border-gray-100 leading-relaxed">{paymentMessage}</p>
                    </div>
                  </div>

                  {/* ─── Charges Breakdown (mirrors admin create-shipment style) ─── */}
                  <div className={card5}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Charges Breakdown</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                      Computed using full pricing rules for this shipment.
                    </p>

                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                        <p className="font-extrabold text-gray-900">Declared Value</p>
                        <p className="text-sm text-gray-700">{fmtNumberWithCommas(declaredValue, 2)} {currency}</p>
                      </div>

                      <div className="p-5 space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span>Base Freight ({shipmentMeans !== "—" ? shipmentMeans : "Shipping"})</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.baseFreight, 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fuel Surcharge ({fmtPercent(fuelRate)})</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.fuel, 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Insurance ({fmtPercent(insuranceRate)})</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.insurance, 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Handling</span>
                          <span className="font-semibold">{fmtNumberWithCommas(calc.handling, 2)}</span>
                        </div>
                        {calc.customs > 0 && (
                          <div className="flex justify-between">
                            <span>Customs</span>
                            <span className="font-semibold">{fmtNumberWithCommas(calc.customs, 2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-3 border-t">
                          <span className="font-bold">Subtotal</span>
                          <span className="font-bold">{fmtNumberWithCommas(calc.subtotal, 2)}</span>
                        </div>
                        {calc.tax > 0 && (
                          <div className="flex justify-between">
                            <span>Tax</span>
                            <span className="font-semibold">{fmtNumberWithCommas(calc.tax, 2)}</span>
                          </div>
                        )}
                        {calc.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span className="font-semibold">−{fmtNumberWithCommas(calc.discount, 2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-4 border-t text-lg">
                          <span className="font-extrabold text-gray-900">Total</span>
                          <span className="font-extrabold text-blue-700">
                            {fmtNumberWithCommas(calc.total, 2)} {currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                  <p className="text-sm font-extrabold text-gray-800 tracking-wide uppercase">
                    Officially Issued by Exodus Logistics Ltd.
                  </p>
                  <p className="text-xs text-gray-500 max-w-lg leading-relaxed">
                    This document is an officially issued, system-generated invoice and is legally valid without a physical signature.
                    To verify the authenticity of this invoice, please reference your{" "}
                    <span className="font-semibold text-gray-700">Tracking Number</span> on our official platform at{" "}
                    <a href="https://www.goexoduslogistics.com" target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 transition font-semibold">goexoduslogistics.com</a>.
                    For billing inquiries, disputes, or any assistance, please contact our support team at{" "}
                    <a href="mailto:support@goexoduslogistics.com"
                      className="text-blue-600 underline hover:text-blue-800 transition font-semibold">support@goexoduslogistics.com</a>.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    ©️ {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved. Unauthorized reproduction of this document is strictly prohibited.
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