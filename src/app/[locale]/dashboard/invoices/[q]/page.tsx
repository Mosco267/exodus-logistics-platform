// src/app/[locale]/dashboard/invoices/[q]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, Calendar, MapPin, Package,
  FileText, Truck, CreditCard, ShieldCheck,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";

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
    declaredValue?: number; shipping?: number; baseFreight?: number; fuel?: number;
    handling?: number; customs?: number; insurance?: number; subtotal?: number;
    tax?: number; discount?: number; total?: number; pricingUsed?: any;
  };
  declaredValue?: number;
  shipment?: {
    shipmentId?: string; trackingNumber?: string; originFull?: string;
    destinationFull?: string; status?: string; shipmentType?: string | null;
    serviceLevel?: string | null; shipmentMeans?: string | null;
    weightKg?: number | string | null;
    dimensionsCm?: { length?: any; width?: any; height?: any; unit?: string } | null;
  };
  parties?: { senderName?: string; senderEmail?: string; receiverName?: string; receiverEmail?: string };
  currentStatus?: string;
  lastEventAt?: string | null;
  dates?: { createdAt?: string | null; updatedAt?: string | null };
  estimatedDelivery?: string | null;
  estimatedDeliveryDateMin?: string | null;
  shipmentScope?: string | null;
  pricingUsed?: any;
  error?: string;
};

const ACCEPTED_METHODS = ["Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"];

function safeStr(v: any) { return String(v ?? "").trim(); }
function num(v: any) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(d);
}

function fmtNumberWithCommas(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(amount: number, currency: string) {
  const c = (currency || "USD").toUpperCase();
  return `${c} ${fmtNumberWithCommas(num(amount), 2)}`;
}

function fmtIntWithCommas(value: any): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return safeStr(value) || "—";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtPercent(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "0%";
  const pct = n < 1 ? n * 100 : n;
  return `${pct % 1 === 0 ? String(pct) : pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function isOverdue(dueDate?: string | null) {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  return Date.now() > d.getTime();
}

function fmtEstimatedDelivery(maxISO?: string | null, minISO?: string | null, scope?: string | null): string {
  if (!maxISO) return "—";
  const maxD = new Date(maxISO);
  if (Number.isNaN(maxD.getTime())) return "—";

  let minD: Date;
  if (minISO) {
    const d = new Date(minISO);
    minD = Number.isNaN(d.getTime()) ? new Date(maxD) : d;
  } else {
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

export default function DashboardInvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const q = String(params?.q || "").trim();

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");

  useEffect(() => {
    const apply = () => {
      try {
        const t = localStorage.getItem("exodus_theme_cache") as ThemeId | null;
        const theme = THEMES.find(x => x.id === t) || THEMES[0];
        setAccentSolid(theme.accent || "#0b3aa4");
        setAccentGradient(theme.sidebar || "linear-gradient(135deg, #0b3aa4, #0e7490)");
      } catch {}
    };
    apply();
    window.addEventListener("storage", apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener("storage", apply); clearInterval(t); };
  }, []);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr(""); setData(null);
      if (!q) {
        setErr("Invoice details are missing.");
        setLoading(false);
        return;
      }
      try {
        const url = new URL("/api/invoice", window.location.origin);
        url.searchParams.set("q", q.toUpperCase());
        const res = await fetch(url.toString(), { method: "GET" });
        const json = (await res.json().catch(() => null)) as ApiResponse | null;
        if (!res.ok) { setErr((json as any)?.error || "Invoice not found."); return; }
        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Invoice unavailable.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [q]);

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

  const originFull = safeStr(data?.shipment?.originFull) || "—";
  const destinationFull = safeStr(data?.shipment?.destinationFull) || "—";
  const shipmentType = safeStr(data?.shipment?.shipmentType) || "—";
  const serviceLevel = safeStr(data?.shipment?.serviceLevel) || "—";
  const shipmentMeans = safeStr(data?.shipment?.shipmentMeans) || "—";
  const weightKg = data?.shipment?.weightKg;
  const weightLine = weightKg != null && safeStr(weightKg) !== "" ? `${fmtIntWithCommas(weightKg)} kg` : "—";
  const dim = data?.shipment?.dimensionsCm;
  const dimUnit = safeStr(dim?.unit) || "cm";
  const dimLine = dim ? `${fmtIntWithCommas(dim.length)} × ${fmtIntWithCommas(dim.width)} × ${fmtIntWithCommas(dim.height)} ${dimUnit}` : "—";

  const estDeliveryStr = useMemo(
    () => fmtEstimatedDelivery(data?.estimatedDelivery, data?.estimatedDeliveryDateMin, data?.shipmentScope),
    [data?.estimatedDelivery, data?.estimatedDeliveryDateMin, data?.shipmentScope]
  );

  const statusBadge = status === "paid" ? "PAID" : status === "overdue" ? "OVERDUE" : status === "cancelled" ? "CANCELLED" : "UNPAID";
  const statusColor = status === "paid" ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-800 dark:text-green-400"
    : status === "overdue" ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-400"
    : status === "cancelled" ? "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/20 text-gray-700 dark:text-gray-300"
    : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-400";
  const statusDot = status === "paid" ? "bg-green-500" : status === "overdue" ? "bg-red-500" : status === "cancelled" ? "bg-gray-400" : "bg-amber-500";

  const paymentMethodLine = paymentMethodRaw && status === "paid"
    ? `Completed via ${paymentMethodRaw}`
    : status === "paid" ? "Payment method not recorded"
    : status === "cancelled" ? "Not applicable"
    : status === "overdue" ? "Awaiting payment — please remit immediately"
    : "Awaiting payment — please complete via the payment page";

  const paymentMessage = status === "paid"
    ? "Payment has been received and confirmed in our system."
    : status === "overdue"
    ? "This invoice is past its due date. Immediate payment is required to avoid shipment delays."
    : status === "cancelled"
    ? "This invoice has been cancelled and is no longer payable."
    : "This invoice is currently outstanding. Please complete payment promptly.";

  const dueDateLine = dueDate
    ? (status === "overdue"
      ? `Overdue since ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : status === "paid"
      ? `Was due ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : `Due by ${new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`)
    : status === "paid" ? "Paid in full" : "No due date set";

  const card = "rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-4";
  const card5 = "rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5";

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-5">

      {/* ── Top nav (print button removed) ──────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => router.push(`/${locale}/dashboard/invoices`)}
          className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
        {(trackingNumber || shipmentId) && (
          <Link href={`/${locale}/dashboard/track/${encodeURIComponent(trackingNumber || shipmentId)}`}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
            <Truck className="w-4 h-4" /> Track Shipment
          </Link>
        )}
        {status === "unpaid" || status === "overdue" ? (
          <Link href={`/${locale}/dashboard/shipments/${encodeURIComponent(shipmentId)}/payment`}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition shadow-sm hover:opacity-90"
            style={{ background: accentGradient }}>
            <CreditCard className="w-4 h-4" /> Pay Now
          </Link>
        ) : null}
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-8 shadow-sm flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Loading invoice…</p>
        </div>
      )}

      {!loading && err && (
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400 font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" /> {err}
          </div>
        </div>
      )}

      {!loading && data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

          {/* Header */}
          <div style={{ background: accentGradient }} className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Invoice</p>
                <p className="text-white font-extrabold text-xl sm:text-2xl tracking-wide mt-0.5">{invoiceNumber || "—"}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold bg-white/10 border-white/30 text-white self-start sm:self-auto">
                <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                {statusBadge}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">

            {/* Top 3 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={card}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" style={{ color: accentSolid }} />
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Dates</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtDate(data?.dates?.createdAt || null)}</p>
                {data?.estimatedDelivery && (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Est. delivery</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{estDeliveryStr}</p>
                  </>
                )}
              </div>

              <div className={card}>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4" style={{ color: accentSolid }} />
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">IDs</p>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Shipment</p>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{shipmentId || "—"}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase mt-1.5">Tracking</p>
                <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{trackingNumber || "—"}</p>
              </div>

              <div className={card}>
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4" style={{ color: accentSolid }} />
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</p>
                </div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{fmtMoney(calc.total, currency)}</p>
                <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${statusColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{statusBadge}
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{dueDateLine}</p>
              </div>
            </div>

            {/* Route + Declaration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={card}>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4" style={{ color: accentSolid }} />
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Route</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">From</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{originFull}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">To</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{destinationFull}</p>
                  </div>
                </div>
              </div>

              <div className={card}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: accentSolid }} />
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Declaration</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div><p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Declared Value</p><p className="font-semibold text-gray-900 dark:text-white">{fmtMoney(declaredValue, currency)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Type</p><p className="font-semibold text-gray-900 dark:text-white">{shipmentType}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Service</p><p className="font-semibold text-gray-900 dark:text-white">{serviceLevel}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Weight</p><p className="font-semibold text-gray-900 dark:text-white">{weightLine}</p></div>
                  <div className="col-span-2"><p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Dimensions</p><p className="font-semibold text-gray-900 dark:text-white">{dimLine}</p></div>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className={card5}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" style={{ color: accentSolid }} />
                <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">Parties</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-1">Sender</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{safeStr(data?.parties?.senderName) || "—"}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm break-all">{safeStr(data?.parties?.senderEmail) || "—"}</p>
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-1">Receiver</p>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{safeStr(data?.parties?.receiverName) || "—"}</p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm break-all">{safeStr(data?.parties?.receiverEmail) || "—"}</p>
                </div>
              </div>
            </div>

            {/* Payment + Charges Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className={card5}>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4" style={{ color: accentSolid }} />
                  <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">Payment</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Accepted methods:</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ACCEPTED_METHODS.map((m) => (
                    <span key={m} className="inline-flex items-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:text-gray-300">{m}</span>
                  ))}
                </div>
                <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Status</p>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">
                      {status === "paid" ? "Confirmed and Received"
                        : status === "overdue" ? "Overdue — Action Required"
                        : status === "cancelled" ? "Invoice Cancelled"
                        : "Outstanding — Awaiting Payment"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">Method</p>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">{paymentMethodLine}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 pt-1.5 border-t border-gray-100 dark:border-white/10 leading-relaxed">{paymentMessage}</p>
                </div>
              </div>

              <div className={card5}>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4" style={{ color: accentSolid }} />
                  <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">Charges</h2>
                </div>

                <div className="rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                    <p className="text-xs font-extrabold uppercase text-gray-500 dark:text-gray-400">Declared Value</p>
                    <p className="text-sm text-gray-900 dark:text-white font-semibold">{fmtNumberWithCommas(declaredValue, 2)} {currency}</p>
                  </div>

                  <div className="p-4 space-y-2.5 text-sm">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Base Freight ({shipmentMeans !== "—" ? shipmentMeans : "Shipping"})</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.baseFreight, 2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Fuel Surcharge ({fmtPercent(fuelRate)})</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.fuel, 2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Insurance ({fmtPercent(insuranceRate)})</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.insurance, 2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Handling</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.handling, 2)}</span>
                    </div>
                    {calc.customs > 0 && (
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Customs</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.customs, 2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2.5 border-t border-gray-100 dark:border-white/10">
                      <span className="font-bold text-gray-900 dark:text-white">Subtotal</span>
                      <span className="font-bold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.subtotal, 2)}</span>
                    </div>
                    {calc.tax > 0 && (
                      <div className="flex justify-between text-gray-700 dark:text-gray-300">
                        <span>Tax</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{fmtNumberWithCommas(calc.tax, 2)}</span>
                      </div>
                    )}
                    {calc.discount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Discount</span>
                        <span className="font-semibold">−{fmtNumberWithCommas(calc.discount, 2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-3 border-t border-gray-100 dark:border-white/10 text-base">
                      <span className="font-extrabold text-gray-900 dark:text-white">Total</span>
                      <span className="font-extrabold" style={{ color: accentSolid }}>
                        {fmtNumberWithCommas(calc.total, 2)} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-2 py-6 flex flex-col items-center text-center gap-2">
              <ShieldCheck className="w-6 h-6" style={{ color: accentSolid }} />
              <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 tracking-wide uppercase">
                Officially Issued by Exodus Logistics Ltd.
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                This document is a system-generated invoice. For questions, contact{" "}
                <a href="mailto:support@goexoduslogistics.com" className="underline font-semibold hover:opacity-80" style={{ color: accentSolid }}>support@goexoduslogistics.com</a>.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}