// src/app/[locale]/dashboard/status/[shipmentId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, Truck, BadgeCheck, Clock, MapPin, Package,
  ReceiptText, Info, Copy, Check, AlertCircle, CheckCircle2,
  ShieldCheck, CornerDownRight, FileText, CreditCard,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";

// ─── Color map for status badges ─────────────────────────────
const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30",
  red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
  orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/30",
  purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/30",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  rose: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  slate: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10",
  gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-200 dark:border-white/10",
};

type ShipmentStatusResponse = {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  statusColor?: string;
  statusNote?: string;
  nextStep?: string;
  statusUpdatedAt?: string;
  senderCountryCode?: string;
  destinationCountryCode?: string;

  // ✅ added invoiceNumber to the type
  invoice?: {
    invoiceNumber?: string;
    amount?: number;
    currency?: string;
    paid?: boolean;
    paidAt?: string | null;
    status?: "paid" | "unpaid" | "overdue" | "cancelled";
  };
};

type StatusConfig = {
  key: string;
  label?: string;
  color?: string;
  defaultUpdate?: string;
  nextStep?: string;
  updatedAt?: string;
};

function normalizeStatus(status?: string) {
  return (status ?? "").toLowerCase().trim().replace(/[\s_-]+/g, "");
}

function formatMoney(currency: string, amount: number) {
  const cur = (currency || "").toUpperCase();
  return `${cur} ${Number(amount || 0).toLocaleString()}`.trim();
}

function getStatusBadgeClass(status: string) {
  const s = normalizeStatus(status);
  if (s === "delivered") return colorMap.green;
  if (s === "intransit") return colorMap.blue;
  if (s === "customclearance") return colorMap.orange;
  if (s === "unclaimed") return colorMap.red;
  if (s === "cancelled" || s === "canceled") return colorMap.red;
  return colorMap.slate;
}

async function copyToClipboard(text: string) {
  const v = String(text || "").trim();
  if (!v) return;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(v);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = v;
  ta.style.position = "fixed"; ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

function CopyButton({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : "Copy"}
      title={copied ? "Copied" : "Copy"}
      className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ShipmentStatusPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const shipmentId = decodeURIComponent((params?.shipmentId as string) || "");

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");

  useEffect(() => {
    const apply = () => {
      try {
        const t = (localStorage.getItem("exodus_theme_cache") as ThemeId | null) || "default";
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

  const [data, setData] = useState<ShipmentStatusResponse | null>(null);
  const [statusConfig, setStatusConfig] = useState<StatusConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<null | "ship" | "track" | "inv">(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { cache: "no-store" });
        const json = await res.json();
        const shipment = res.ok ? (json?.shipment ?? null) : null;
        setData(shipment);

        const key = shipment?.status ? normalizeStatus(shipment.status) : "";
        if (key) {
          const sres = await fetch(`/api/statuses?key=${encodeURIComponent(key)}`, { cache: "no-store" });
          const sjson = await sres.json();

          const found: StatusConfig | null =
            (sjson?.status as StatusConfig) ??
            (Array.isArray(sjson?.statuses)
              ? (sjson.statuses.find((x: any) => x?.key === key) as StatusConfig) ?? null
              : null);

          setStatusConfig(found ?? null);
        } else {
          setStatusConfig(null);
        }
      } catch {
        setData(null);
        setStatusConfig(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [shipmentId]);

  const normalized = useMemo(() => normalizeStatus(data?.status), [data?.status]);

  const invoiceCurrency = (data?.invoice?.currency || "USD").toUpperCase();
  const invoicePaid = Boolean(data?.invoice?.paid);
  const hasInvoiceAmount = typeof data?.invoice?.amount === "number";
  const invoiceAmount = hasInvoiceAmount ? Number(data!.invoice!.amount) : null;
  const moneyText = hasInvoiceAmount ? formatMoney(invoiceCurrency, invoiceAmount as number) : "—";
  const invoiceNumber = String(data?.invoice?.invoiceNumber || "").trim();

  const routeText = `${(data?.senderCountryCode || "—").toUpperCase()} → ${(data?.destinationCountryCode || "—").toUpperCase()}`;

  const shipmentUpdateFallback =
    normalized === "created"
      ? "Shipment created successfully and is being prepared for dispatch."
      : normalized === "intransit"
      ? "Shipment is in transit and moving toward the destination."
      : normalized === "customclearance"
      ? "Shipment is undergoing customs clearance. Additional verification may be required."
      : normalized === "delivered"
      ? "Shipment has been delivered successfully to the destination."
      : normalized === "unclaimed"
      ? "Shipment is available for pickup but has not yet been claimed."
      : `Shipment status updated: ${data?.status || "—"}.`;

  const nextStepFallback =
    normalized === "created"
      ? "Dispatch will be scheduled once processing is complete."
      : normalized === "intransit"
      ? "Continue tracking for real-time movement updates."
      : normalized === "customclearance"
      ? "We will update you once customs clearance is completed."
      : normalized === "delivered"
      ? "If there are delivery concerns, please contact support with your tracking number."
      : normalized === "unclaimed"
      ? "Please arrange pickup or contact support for assistance."
      : "";

  const shipmentUpdateText =
    statusConfig?.defaultUpdate && statusConfig.defaultUpdate.trim().length > 0
      ? statusConfig.defaultUpdate.trim()
      : (data?.statusNote && data.statusNote.trim().length > 0
          ? data.statusNote.trim()
          : shipmentUpdateFallback);

  const nextStepText =
    statusConfig?.nextStep && statusConfig.nextStep.trim().length > 0
      ? statusConfig.nextStep.trim()
      : (data?.nextStep && data.nextStep.trim().length > 0
          ? data.nextStep.trim()
          : nextStepFallback);

  const effectiveColor = (statusConfig?.color || data?.statusColor || "").toLowerCase();
  const statusBadgeClass = colorMap[effectiveColor] || getStatusBadgeClass(data?.status || "");

  const handleCopy = async (key: "ship" | "track" | "inv", value: string) => {
    try {
      await copyToClipboard(value);
      setCopiedKey(key);
      window.setTimeout(() => { setCopiedKey((cur) => (cur === key ? null : cur)); }, 1500);
    } catch {}
  };

  // ─── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-8 shadow-sm flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Loading shipment status…</p>
        </div>
      </div>
    );
  }

  // ─── Error / not found ──────────────────────────────────
  if (!data) {
    return (
      <div className="max-w-4xl mx-auto pb-12 space-y-5">
        <Link href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400 font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" /> Shipment not found
          </div>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400/80 pl-8">
            Please confirm the shipment ID and try again.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main content ───────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-5">

      {/* ── Top nav ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Link href={`/${locale}/dashboard/history`}
          className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Back to History
        </Link>
        {data.trackingNumber && (
          <Link href={`/${locale}/dashboard/track/${encodeURIComponent(data.trackingNumber)}`}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
            <Truck className="w-4 h-4" /> Track Shipment
          </Link>
        )}
        {invoiceNumber && (
          <Link href={`/${locale}/dashboard/invoices/${encodeURIComponent(invoiceNumber)}`}
            className="cursor-pointer w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:opacity-90 transition shadow-sm">
            <FileText className="w-4 h-4" /> View Invoice
          </Link>
        )}
        {!invoicePaid && invoiceNumber && (
          <Link href={`/${locale}/dashboard/shipments/${encodeURIComponent(data.shipmentId)}/payment`}
            className="cursor-pointer w-full sm:w-auto sm:ml-auto justify-center inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-bold transition shadow-sm hover:opacity-90"
            style={{ background: accentGradient }}>
            <CreditCard className="w-4 h-4" /> Pay Now
          </Link>
        )}
      </div>

      {/* ── Main status card ────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

        {/* Gradient header */}
        <div style={{ background: accentGradient }} className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Shipment Status</p>
              <div className="flex items-center gap-2 mt-1">
                <h1 className="text-white font-extrabold text-xl sm:text-2xl tracking-wide whitespace-nowrap overflow-hidden text-ellipsis max-w-[260px] sm:max-w-none">
                  {data.shipmentId || "—"}
                </h1>
                <CopyButton value={data.shipmentId} copied={copiedKey === "ship"} onCopy={() => handleCopy("ship", data.shipmentId)} />
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold ${statusBadgeClass}`}>
                <BadgeCheck className="w-3.5 h-3.5" />
                {data.status || "—"}
              </span>
              {data.statusUpdatedAt && (
                <p className="text-[11px] text-white/80 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(data.statusUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">

          {/* Top 3 cards: Route, IDs, Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Route */}
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4" style={{ color: accentSolid }} />
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Route</p>
              </div>
              <p className="text-base font-extrabold text-gray-900 dark:text-white tracking-wide">{routeText}</p>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Origin → Destination</p>
            </div>

            {/* IDs */}
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4" style={{ color: accentSolid }} />
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">References</p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Tracking</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{data.trackingNumber || "—"}</p>
                    <CopyButton value={data.trackingNumber} copied={copiedKey === "track"} onCopy={() => handleCopy("track", data.trackingNumber)} />
                  </div>
                </div>
                {invoiceNumber && (
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">Invoice</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{invoiceNumber}</p>
                      <CopyButton value={invoiceNumber} copied={copiedKey === "inv"} onCopy={() => handleCopy("inv", invoiceNumber)} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice amount + status */}
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" style={{ color: accentSolid }} />
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Invoice</p>
              </div>
              <p className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{moneyText}</p>
              <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${
                invoicePaid
                  ? "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400"
                  : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${invoicePaid ? "bg-green-500" : "bg-amber-500"}`} />
                {invoicePaid ? "PAID" : "PENDING"}
              </div>
              {invoicePaid && data.invoice?.paidAt && (
                <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  Paid {new Date(data.invoice.paidAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Shipment Update */}
          <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" style={{ color: accentSolid }} />
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">Status Update</h2>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {shipmentUpdateText}
            </p>
          </div>

          {/* Next Step */}
          {nextStepText && nextStepText.trim().length > 0 && (
            <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CornerDownRight className="w-4 h-4" style={{ color: accentSolid }} />
                <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">Next Step</h2>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {nextStepText}
              </p>
            </div>
          )}

          {/* Payment reminder banner — only when unpaid */}
          {!invoicePaid && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Payment required
                </p>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                  Complete payment to avoid processing delays. Use the Pay Now button at the top of this page.
                </p>
              </div>
            </div>
          )}

          {/* Delivered confirmation banner — only when delivered */}
          {normalized === "delivered" && (
            <div className="rounded-xl border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-green-900 dark:text-green-200">
                  Shipment delivered
                </p>
                <p className="mt-0.5 text-xs text-green-800 dark:text-green-300/80 leading-relaxed">
                  This shipment has been successfully delivered. If there are concerns, contact support with your tracking number.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-2 py-5 flex flex-col items-center text-center gap-2 border-t border-gray-100 dark:border-white/10 mt-2">
            <ShieldCheck className="w-5 h-5" style={{ color: accentSolid }} />
            <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 tracking-wide uppercase">
              Officially Issued by Exodus Logistics Ltd.
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
              For questions about this shipment, contact{" "}
              <a href="mailto:support@goexoduslogistics.com" className="underline font-semibold hover:opacity-80" style={{ color: accentSolid }}>
                support@goexoduslogistics.com
              </a>.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}