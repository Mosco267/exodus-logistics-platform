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
  ShieldCheck,
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
    rates?: any;
    pricingUsed?: any;
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
  dates?: { createdAt?: string | null; updatedAt?: string | null };
  error?: string;
};

const ACCEPTED_METHODS = ["Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"];

function safeStr(v: any) { return String(v ?? "").trim(); }

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d);
}

function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// Fix: use "en-US" locale + narrowSymbol to always show "$" not "US$"
function fmtMoney(amount: number, currency: string) {
  const c = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: c,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(num(amount));
  } catch {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency", currency: c,
        minimumFractionDigits: 2, maximumFractionDigits: 2,
      }).format(num(amount));
    } catch {
      return `${num(amount).toFixed(2)} ${c}`;
    }
  }
}

function fmtPercentFromDecimal(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  const pct = n * 100;
  return `${pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function cleanTel(phone: string) { return phone.replace(/[^\d+]/g, ""); }

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
      setLoading(true); setErr(""); setData(null);
      const url = new URL("/api/invoice", window.location.origin);
      if (q) url.searchParams.set("q", q.toUpperCase());
      if (invoice) url.searchParams.set("invoice", invoice.toUpperCase());
      if (email) url.searchParams.set("email", email);

      if (!q && !(invoice && email)) {
        setErr("Invoice details are missing. Please open the invoice from the email link or search again.");
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

  const calc = useMemo(() => {
    const b = data?.breakdown || {};
    const shipping = num(b.shipping);
    const fuel = num(b.fuel);
    const handling = num(b.handling);
    const customs = num(b.customs);
    const insurance = num(b.insurance);
    const discount = num(b.discount);
    const tax = num(b.tax);
    const subtotal = num(b.subtotal) || (shipping + fuel + handling + customs + insurance - discount);
    const total = num(b.total) || (subtotal + tax);
    return { shipping, fuel, handling, customs, insurance, discount, tax, subtotal, total };
  }, [data]);

  const paymentMethodRaw = safeStr(data?.paymentMethod);
  const paymentStatusText = status === "paid" ? "Payment confirmed" : status === "cancelled" ? "Not payable" : status === "overdue" ? "Payment required (Overdue)" : "Payment required";

  const companyName = safeStr(data?.company?.name) || "Exodus Logistics Ltd.";
  const companyAddress = safeStr(data?.company?.address) || "1199 E Calaveras Blvd, California, USA 90201";
  const companyPhone = safeStr(data?.company?.phone) || "+1 (516) 243-7836";
  const companyEmail = safeStr(data?.company?.email) || "support@goexoduslogistics.com";

  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";
  const shipmentType = safeStr(data?.shipment?.shipmentType) || "—";
  const serviceLevel = safeStr(data?.shipment?.serviceLevel) || "—";
  const weightKg = data?.shipment?.weightKg;
  const weightLine = weightKg != null && safeStr(weightKg) !== "" ? `${safeStr(weightKg)} kg` : "—";
  const dim = data?.shipment?.dimensionsCm;
  const dimUnit = safeStr(dim?.unit) || "cm";
  const dimLine = dim ? `${safeStr(dim.length) || "—"} × ${safeStr(dim.width) || "—"} × ${safeStr(dim.height) || "—"} ${dimUnit}` : "—";

  const statusBadge = status === "paid" ? "PAID" : status === "overdue" ? "OVERDUE" : status === "cancelled" ? "CANCELLED" : "UNPAID";
  const statusColor = status === "paid" ? "bg-green-50 border-green-200 text-green-800" : status === "overdue" ? "bg-red-50 border-red-200 text-red-800" : status === "cancelled" ? "bg-gray-50 border-gray-200 text-gray-700" : "bg-amber-50 border-amber-200 text-amber-800";
  const statusDot = status === "paid" ? "bg-green-500" : status === "overdue" ? "bg-red-500" : status === "cancelled" ? "bg-gray-400" : "bg-amber-500";

  const paymentMessage = status === "paid"
    ? "This invoice has been paid. Payment has been confirmed in our system."
    : status === "overdue"
    ? "This invoice is overdue. Please complete payment as soon as possible to avoid delays."
    : status === "cancelled"
    ? "This invoice has been cancelled. Contact support if you believe this is an error."
    : "This invoice is unpaid. Please complete payment using one of the accepted methods below.";

  const printNow = () => window.print();
  const backToTrackTarget = trackingNumber || shipmentId || (q ? q.toUpperCase() : "");

  // Reusable card class
  const card = "rounded-2xl border border-gray-200 bg-white shadow-sm p-4 hover:border-blue-400 hover:shadow-md transition";
  const card5 = "rounded-2xl border border-gray-200 bg-white shadow-sm p-5 hover:border-blue-400 hover:shadow-md transition";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-white">
      <style jsx global>{`
        @media print {
          @page { margin: 0; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          header, nav, footer { display: none !important; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">

        {/* ── TOP NAV ── */}
        <div className="no-print mb-6 flex flex-col sm:flex-row gap-2">
          <Link
            href={`/${locale}/invoice`}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Invoice Search
          </Link>
          {backToTrackTarget && (
            <Link
              href={`/${locale}/track/${encodeURIComponent(backToTrackTarget)}`}
              className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm"
            >
              <Truck className="w-4 h-4" /> Track Shipment
            </Link>
          )}
          <button
            type="button"
            onClick={printNow}
            className="cursor-pointer w-full sm:w-auto sm:ml-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition shadow-sm"
          >
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
              If you opened this from an email, confirm the invoice number and the email linked to the shipment.
            </p>
          </div>
        )}

        {!loading && data && (
          <div className="print-area">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden print-card">

              {/* ── HEADER with white-to-blue gradient ── */}
              <div className="bg-gradient-to-r from-white via-blue-600 to-cyan-600 p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <Image src="/logo.png" alt="Exodus Logistics" width={160} height={50} priority className="h-10 sm:h-14 w-auto object-contain shrink-0" />
                    <div className="min-w-0">
                      <p className="text-blue-900 font-extrabold text-base sm:text-lg leading-tight">{companyName}</p>
                      <p className="text-blue-900/70 text-xs sm:text-sm mt-0.5">{companyAddress}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                        <a href={`tel:${cleanTel(companyPhone)}`} className="cursor-pointer inline-flex items-center gap-1.5 text-blue-900/80 hover:text-blue-900 transition underline underline-offset-2">
                          <Phone className="w-3.5 h-3.5" /> {companyPhone}
                        </a>
                        <a href={`mailto:${companyEmail}`} className="cursor-pointer inline-flex items-center gap-1.5 text-blue-900/80 hover:text-blue-900 transition underline underline-offset-2">
                          <Mail className="w-3.5 h-3.5" /> {companyEmail}
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="md:text-right shrink-0">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Invoice</p>
                    <p className="text-white font-extrabold text-xl sm:text-2xl tracking-wide whitespace-nowrap">{invoiceNumber || "—"}</p>
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
                    <p className="text-sm font-bold text-gray-900">{fmtDate(data?.dates?.updatedAt || null)}</p>
                    <p className="mt-2 text-[10px] text-gray-400">Times in your local timezone</p>
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
                    <p className="text-2xl font-extrabold text-gray-900">{fmtMoney(calc.total, currency)}</p>
                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{statusBadge}
                    </div>
                    {dueDate && (
                      <p className="mt-2 text-xs text-gray-500">Due: <span className="font-semibold text-gray-700">{new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></p>
                    )}
                    <p className="mt-2 text-xs text-gray-600">{status === "paid" ? "Payment confirmed." : status === "cancelled" ? "Not payable." : status === "overdue" ? "Overdue — pay now." : "Payment required."}</p>
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
                      <p className="text-xs text-gray-500">Status: <span className="font-semibold text-gray-700">{safeStr(data?.shipment?.status) || "—"}</span></p>
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

                {/* Payment + Charges */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={card5}>
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Payment</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">Accepted methods:</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {ACCEPTED_METHODS.map((m) => (
                        <span key={m} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">{m}</span>
                      ))}
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">{paymentStatusText}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Recorded Method</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">{paymentMethodRaw || "NULL"}</p>
                      </div>
                      <p className="text-xs text-gray-600 pt-1 border-t border-gray-100">{paymentMessage}</p>
                    </div>
                  </div>

                  <div className={card5}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Charges</h2>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Calculated from declared value.</p>
                    <div className="space-y-2 text-sm">
                      <Row label="Shipping fee" value={fmtMoney(calc.shipping, currency)} />
                      <Row label={`Fuel surcharge (${fmtPercentFromDecimal((data as any)?.breakdown?.pricingUsed?.fuelRate ?? 0)})`} value={fmtMoney(calc.fuel, currency)} />
                      <Row label="Handling fee" value={fmtMoney(calc.handling, currency)} />
                      <Row label="Customs fee" value={fmtMoney(calc.customs, currency)} />
                      <Row label={`Insurance (${fmtPercentFromDecimal((data as any)?.breakdown?.pricingUsed?.insuranceRate ?? 0)})`} value={fmtMoney(calc.insurance, currency)} />
                      <Row label="Tax" value={fmtMoney(calc.tax, currency)} />
                      <Row label="Discount" value={fmtMoney(calc.discount, currency)} />
                      <div className="pt-3 mt-1 border-t border-gray-200 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">Subtotal</span>
                        <span className="font-semibold text-gray-900">{fmtMoney(calc.subtotal, currency)}</span>
                      </div>
                      <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-center justify-between">
                        <span className="text-blue-900 font-extrabold text-base">Total</span>
                        <span className="text-blue-900 font-extrabold text-xl">{fmtMoney(calc.total, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer — centered, no border, professional */}
                <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                  <p className="text-sm font-extrabold text-gray-800 tracking-wide uppercase">
                    Officially Issued by Exodus Logistics Ltd.
                  </p>
                  <p className="text-xs text-gray-500 max-w-lg leading-relaxed">
                    This document is an officially issued, system-generated invoice and is legally valid without a physical signature.
                    To verify the authenticity of this invoice, please reference your{" "}
              
                    <span className="font-semibold text-gray-700">Tracking Number</span> on our official platform at{" "}
                    <a href="https://www.goexoduslogistics.com" className="text-blue-600 underline hover:text-blue-800 transition font-semibold" target="_blank" rel="noopener noreferrer">
                      goexoduslogistics.com
                    </a>.
                    For billing inquiries, disputes, or assistance, please contact our support team at{" "}
                    <a href="mailto:support@goexoduslogistics.com" className="text-blue-600 underline hover:text-blue-800 transition font-semibold">
                      support@goexoduslogistics.com
                    </a>.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    © {new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved. Unauthorized reproduction of this document is strictly prohibited.
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
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="font-semibold text-gray-900 text-sm whitespace-nowrap ml-2">{value}</span>
    </div>
  );
}