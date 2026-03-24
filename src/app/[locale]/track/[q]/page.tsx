"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  MapPin,
  Package,
  FileText,
  Copy,
  Check,
  Info,
  CornerDownRight,
  Truck,
  LifeBuoy,
  CheckCircle2,
  CircleDashed,
  Warehouse,
  Plane,
  ShieldCheck,
  Home,
  Clock3,
  AlertTriangle,
  ClipboardList,
  Route,
} from "lucide-react";

type LocationLite = {
  country?: string;
  state?: string;
  city?: string;
  county?: string;
};

type Entry = {
  occurredAt: string;
  note?: string;
  color?: string;
  location?: LocationLite;
};

type GroupedEvent = {
  key?: string;
  label: string;
  color?: string;
  icon?: string;
  occurredAt: string;
  location?: LocationLite;
  entries: Entry[];
};

type TrackApiResponse = {
  shipmentId: string;
  trackingNumber: string;
  currentStatus?: string;
  statusNote?: string;
  nextStep?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  origin?: string | null;
  destination?: string | null;
  currentLocation?: string | null;
  packageDescription?: string | null;
  invoice?: {
    paid: boolean;
    status?: "paid" | "unpaid" | "overdue" | "cancelled";
    amount: number;
    currency: string;
    invoiceNumber?: string;
  } | null;
  events: GroupedEvent[];
  estimatedDelivery?: string | null;
  shipmentMeans?: string | null;
  shipmentScope?: string | null;
  serviceLevel?: string | null;
  shipmentType?: string | null;
  weightKg?: number | string | null;
  dimensionsCm?: { length?: any; width?: any; height?: any; unit?: string } | null;
  carrierName?: string | null;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function fmtEstimatedRange(
  iso?: string | null,
  shipmentScope?: string | null
): { text: string; endDate: Date | null } {
  if (!iso) return { text: "—", endDate: null };
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return { text: "—", endDate: null };
  const end = new Date(start);
  const extraDays = String(shipmentScope || "").toLowerCase() === "local" ? 2 : 3;
  end.setDate(end.getDate() + extraDays);
  const startText = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return { text: `${startText} – ${endText}`, endDate: end };
}

function isDeliveryOverdue(endDate: Date | null): boolean {
  if (!endDate) return false;
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  return Date.now() > endOfDay.getTime();
}

function fmtLoc(loc?: LocationLite): string {
  if (!loc) return "";
  return [loc.city, loc.state, loc.country].map((x) => String(x || "").trim()).filter(Boolean).join(", ");
}

function safeColor(c?: string): string {
  return String(c || "").trim();
}

function getStageIcon(label?: string, iconKey?: string) {
  const key = String(iconKey || "").toLowerCase();
  if (key === "truck") return Truck;
  if (key === "warehouse") return Warehouse;
  if (key === "plane") return Plane;
  if (key === "shield") return ShieldCheck;
  if (key === "home") return Home;
  if (key === "clock") return Clock3;
  if (key === "check") return CheckCircle2;
  if (key === "package") return Package;
  if (key === "route") return Route;
  if (key === "alert") return AlertCircle;
  if (key === "file") return FileText;

  const v = String(label || "").trim().toLowerCase();
  if (v.includes("created")) return Package;
  if (v.includes("pickup") || v.includes("picked")) return Truck;
  if (v.includes("warehouse")) return Warehouse;
  if (v.includes("air") || v.includes("flight") || v.includes("freight")) return Plane;
  if (v.includes("custom")) return ShieldCheck;
  if (v.includes("out for delivery")) return Truck;
  if (v.includes("delivered")) return Home;
  if (v.includes("transit")) return Truck;
  if (v.includes("unclaimed")) return Clock3;
  return CircleDashed;
}

// Fix 3 — icon-only button, no title/tooltip (removes browser "Copy" tooltip)
function CopyIconButton({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition shrink-0"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-600" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  );
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
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export default function TrackResultPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const q = String(params?.q || "").trim();

  const [data, setData] = useState<TrackApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [copiedKey, setCopiedKey] = useState<null | "ship" | "track" | "inv">(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    setData(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(json?.error || "Tracking unavailable. Try again later."); return; }
      setData(json as TrackApiResponse);
      const evs = Array.isArray((json as any)?.events) ? (json as any).events : [];
      setOpenIdx(evs.length ? evs.length - 1 : 0);
    } catch (e: any) {
      setErr(e?.message || "Tracking unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!q) return; void load(); }, [q]);

  const events = useMemo(() => {
    const evs = Array.isArray(data?.events) ? [...(data?.events || [])] : [];
    evs.sort((a, b) => {
      const aKey = String(a?.key || "").toLowerCase();
      const bKey = String(b?.key || "").toLowerCase();
      if (aKey === "created" && bKey !== "created") return -1;
      if (bKey === "created" && aKey !== "created") return 1;
      return new Date(a?.occurredAt || 0).getTime() - new Date(b?.occurredAt || 0).getTime();
    });
    evs.forEach((ev: any) => {
      if (Array.isArray(ev?.entries)) {
        ev.entries.sort((x: any, y: any) => new Date(x?.occurredAt || 0).getTime() - new Date(y?.occurredAt || 0).getTime());
      } else { ev.entries = []; }
    });
    return evs;
  }, [data]);

  const currentIndex = Math.max(0, events.length - 1);

  const invoicePaid = Boolean(data?.invoice?.paid);
  const invoiceStatus = String(data?.invoice?.status || (invoicePaid ? "paid" : "unpaid")).toLowerCase();
  const invoiceAmount = Number(data?.invoice?.amount ?? 0);
  const invoiceCurrency = String(data?.invoice?.currency || "USD");
  const invoiceNumber = String(data?.invoice?.invoiceNumber || "").trim();
  const invoiceQ = data?.trackingNumber || data?.shipmentId || q;

  const { text: estimatedRangeText, endDate: estimatedEndDate } = useMemo(
    () => fmtEstimatedRange(data?.estimatedDelivery, data?.shipmentScope),
    [data?.estimatedDelivery, data?.shipmentScope]
  );

  const deliveryOverdue = useMemo(() => {
    if (!data?.estimatedDelivery) return false;
    if (String(data?.currentStatus || "").toLowerCase() === "delivered") return false;
    return isDeliveryOverdue(estimatedEndDate);
  }, [estimatedEndDate, data?.currentStatus, data?.estimatedDelivery]);

  const handleCopy = async (key: "ship" | "track" | "inv", value: string) => {
    try {
      await copyToClipboard(value);
      setCopiedKey(key);
      window.setTimeout(() => { setCopiedKey((cur) => (cur === key ? null : cur)); }, 1500);
    } catch {}
  };

  const invoiceStatusColor =
    invoiceStatus === "paid" ? "text-green-700 bg-green-50 border-green-200"
    : invoiceStatus === "overdue" ? "text-red-700 bg-red-50 border-red-200"
    : invoiceStatus === "cancelled" ? "text-gray-700 bg-gray-50 border-gray-200"
    : "text-amber-700 bg-amber-50 border-amber-200";

  const invoiceStatusLabel =
    invoiceStatus === "paid" ? "PAID"
    : invoiceStatus === "overdue" ? "OVERDUE"
    : invoiceStatus === "cancelled" ? "CANCELLED"
    : "UNPAID";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">

        <div className="mb-6 flex items-center justify-between gap-2 sm:justify-start sm:flex-wrap">
          <Link href={`/${locale}/track`} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
            <MapPin className="w-4 h-4" /><span>Back to Track</span>
          </Link>
          {invoiceQ && (
            <Link href={`/${locale}/invoice`} className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition shadow-sm">
              <FileText className="w-4 h-4" /><span>View Invoice</span>
            </Link>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Loading tracking information…</p>
          </div>
        )}

        {!loading && err && (
          <div className="rounded-3xl border border-red-100 bg-white p-6 shadow-lg">
            <div className="flex items-center gap-3 text-red-700 font-semibold">
              <AlertCircle className="w-5 h-5 shrink-0" /> {err}
            </div>
            <p className="mt-2 text-sm text-gray-500 pl-8">Please verify your tracking number and try again.</p>
          </div>
        )}

        {!loading && data && (
          <>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
              <div className="p-5 sm:p-7">

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Shipment Number</p>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[240px] sm:max-w-none leading-tight">
                        {data.shipmentId || "—"}
                      </h1>
                      <CopyIconButton value={data.shipmentId} copied={copiedKey === "ship"} onCopy={() => handleCopy("ship", data.shipmentId)} />
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-gray-400 w-20 shrink-0">Tracking No.</span>
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{data.trackingNumber || "—"}</span>
                        <CopyIconButton value={data.trackingNumber} copied={copiedKey === "track"} onCopy={() => handleCopy("track", data.trackingNumber)} />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-gray-400 w-20 shrink-0">Invoice No.</span>
                        <span className="text-sm font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{invoiceNumber || "—"}</span>
                        {invoiceNumber && <CopyIconButton value={invoiceNumber} copied={copiedKey === "inv"} onCopy={() => handleCopy("inv", invoiceNumber)} />}
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Current Status</p>
                    <p className="text-lg sm:text-xl font-extrabold text-blue-700 leading-tight">
                      {data.currentStatus || events[currentIndex]?.label || "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Last updated: <span className="font-semibold text-gray-700">{fmtDate(data.updatedAt || events[currentIndex]?.occurredAt)}</span>
                    </p>
                    {data.estimatedDelivery && (
                      <p className="mt-1 text-xs text-gray-500">
                        Est. delivery: <span className="font-semibold text-gray-700">{estimatedRangeText}</span>
                      </p>
                    )}
                  </div>
                </div>

                {deliveryOverdue && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium leading-relaxed">
                      The estimated delivery date has passed in your local time. Please{" "}
                      <a href="mailto:support@goexoduslogistics.com" className="cursor-pointer font-bold underline hover:text-red-900 transition">contact support</a>{" "}
                      for an updated delivery timeline.
                    </p>
                  </div>
                )}

                {(data.origin || data.statusNote || data.nextStep) && (
                  <div className="mt-4 space-y-2 text-sm border-t border-gray-100 pt-4">
                    {data.origin && (
                      <div className="flex items-start gap-2 text-gray-700">
                        <Truck className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                        <span><span className="font-semibold">Origin:</span> {data.origin}</span>
                      </div>
                    )}
                    {data.statusNote && (
                      <div className="flex items-start gap-2 text-gray-700">
                        <Info className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                        <span><span className="font-semibold">Note:</span> {data.statusNote}</span>
                      </div>
                    )}
                    {data.nextStep && (
                      <div className="flex items-start gap-2 text-gray-700">
                        <CornerDownRight className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
                        <span><span className="font-semibold">Next step:</span> {data.nextStep}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Invoice</p>
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-extrabold ${invoiceStatusColor}`}>{invoiceStatusLabel}</div>
                    <p className="mt-1.5 text-sm font-bold text-gray-900">{invoiceAmount.toFixed(2)} {invoiceCurrency}</p>
                    {invoiceNumber && <p className="mt-1 text-xs text-gray-500 font-medium">{invoiceNumber}</p>}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Destination</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{data.destination || "—"}</p>
                    <p className="mt-1 text-xs text-gray-500"><span className="font-semibold">Current location:</span>{" "}{data.currentLocation || fmtLoc(events[currentIndex]?.location) || "—"}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Delivery</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{estimatedRangeText}</p>
                    <p className="mt-1 text-xs text-gray-500"><span className="font-semibold">Means:</span> {data.shipmentMeans || "—"}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Package</p>
                    </div>
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><span className="font-semibold">Weight:</span> {data.weightKg != null && String(data.weightKg).trim() !== "" ? `${data.weightKg} kg` : "—"}</p>
                      <p><span className="font-semibold">Dimensions:</span> {data.dimensionsCm ? `${data.dimensionsCm.length || "—"} × ${data.dimensionsCm.width || "—"} × ${data.dimensionsCm.height || "—"} cm` : "—"}</p>
                      <p><span className="font-semibold">Type:</span> {data.shipmentType || "—"}</p>
                    </div>
                  </div>

                  {data.packageDescription && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                      <div className="flex items-center gap-2 mb-2">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Description</p>
                      </div>
                      <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{data.packageDescription}</p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2">
                      <LifeBuoy className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Carrier</p>
                    </div>
                    <div className="space-y-1 text-xs text-gray-700">
                      <p><span className="font-semibold">Carrier:</span> {data.carrierName || "Exodus Logistics"}</p>
                      <p><span className="font-semibold">Service:</span> {`${String(data.shipmentScope || "").toLowerCase() === "local" ? "Local" : "International"} ${data.serviceLevel || ""}`.trim() || "—"}</p>
                      <p><span className="font-semibold">Support:</span>{" "}<a href="mailto:support@goexoduslogistics.com" className="cursor-pointer text-blue-700 underline font-semibold hover:text-blue-900 transition">support@goexoduslogistics.com</a></p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Created</p>
                    </div>
                    <p className="text-xs font-bold text-gray-900">{fmtDate(data.createdAt || events[0]?.occurredAt)}</p>
                    <p className="mt-1 text-xs text-gray-500">All times shown in your local timezone.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* TIMELINE */}
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-5 rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-3 mb-1">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-extrabold text-gray-900">Shipment Timeline</h2>
                </div>
                <p className="text-sm text-gray-500 mb-6">Live tracking history. All times are shown in your local timezone.</p>

                {events.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600 text-center">No tracking updates yet.</div>
                ) : (
                  <div className="space-y-0">
                    {events.map((ev, idx) => {
                      const isOpen = openIdx === idx;
                      const stageLoc = fmtLoc(ev.location);
                      const stageWhen = fmtDate(ev.occurredAt);
                      const stageBaseColor = safeColor(ev?.entries?.[0]?.color) || safeColor(ev?.color) || "";
                      const isCompleted = idx < currentIndex;
                      const isCurrent = idx === currentIndex;
                      const labelLower = String(ev.label || "").toLowerCase();
                      const isCancelled = labelLower === "cancelled" || labelLower === "canceled";
                      const isDelivered = labelLower === "delivered";
                      const isLast = idx === events.length - 1;

                      const currentDotColor = isCompleted ? "#22c55e" : safeColor(stageBaseColor) || "#f59e0b";
                      const nextEvent = events[idx + 1];
                      const nextDotColor = !isLast
                        ? (idx + 1 < currentIndex ? "#22c55e" : safeColor(nextEvent?.entries?.[0]?.color) || safeColor(nextEvent?.color) || "#d1d5db")
                        : currentDotColor;

                      return (
                        <div key={`${ev.key || ev.label}-${idx}`} className="flex items-stretch">

                          {/* Fix 2 — rail: dot centred at top of card, line fills gap to next dot */}
                          <div className="flex flex-col items-center shrink-0" style={{ width: "36px" }}>
                            {/* spacer to align dot with card top padding */}
                            <div style={{ height: "20px" }} />
                            {/* dot */}
                            <div
                              className="rounded-full border-[3px] border-white shadow-md flex items-center justify-center z-10 shrink-0"
                              style={{ background: currentDotColor, width: "22px", height: "22px" }}
                            >
                              {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            {/* Fix 2 — line stretches from bottom of dot all the way to next dot; no gap */}
                            {!isLast && (
                              <div
                                className="w-[3px] flex-1 rounded-b-full"
                                style={{
                                  background: `linear-gradient(to bottom, ${currentDotColor} 0%, ${nextDotColor} 100%)`,
                                  minHeight: "12px",
                                }}
                              />
                            )}
                          </div>

                          {/* Fix 1 — card: left margin so it aligns with the boxes below (invoice/dest/loc) */}
                          {/* pb-3 creates the gap between stages so the line runs through it */}
                          <div className="flex-1 min-w-0 pl-2 pb-4">
                            <div className={`rounded-2xl border shadow-sm overflow-hidden transition ${
                              isCompleted ? "border-green-200 bg-green-50/40"
                              : isCurrent && isCancelled ? "border-red-200 bg-red-50/40 shadow-md"
                              : isCurrent && isDelivered ? "border-green-200 bg-green-50/40 shadow-md"
                              : isCurrent ? "border-blue-200 bg-blue-50/40 shadow-md"
                              : "border-gray-200 bg-white"
                            }`}>
                              <button
                                type="button"
                                onClick={() => setOpenIdx((cur) => (cur === idx ? null : idx))}
                                className="cursor-pointer w-full text-left p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border ${
                                      isCompleted ? "bg-green-100 border-green-200 text-green-700"
                                      : isCurrent && isCancelled ? "bg-red-100 border-red-200 text-red-700"
                                      : isCurrent && isDelivered ? "bg-green-100 border-green-200 text-green-700"
                                      : isCurrent ? "bg-blue-100 border-blue-200 text-blue-700"
                                      : "bg-gray-100 border-gray-200 text-gray-500"
                                    }`}>
                                      {(() => {
                                        const Icon = getStageIcon(ev.label, ev.icon);
                                        return <Icon className="w-5 h-5" />;
                                      })()}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-base font-extrabold text-gray-900">{ev.label}</p>
                                        {/* Fix 2 — "Current" → "Current Stage" */}
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                          isCompleted ? "bg-green-100 text-green-700 border-green-200"
                                          : isCurrent && isCancelled ? "bg-red-100 text-red-700 border-red-200"
                                          : isCurrent && isDelivered ? "bg-green-100 text-green-700 border-green-200"
                                          : isCurrent ? "bg-blue-100 text-blue-700 border-blue-200"
                                          : "bg-gray-100 text-gray-500 border-gray-200"
                                        }`}>
                                          {isCompleted ? "Completed"
                                            : isCurrent && isCancelled ? "Cancelled"
                                            : isCurrent && isDelivered ? "Delivered"
                                            : isCurrent ? "Current Stage"
                                            : "Upcoming"}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{stageWhen}{stageLoc ? ` · ${stageLoc}` : ""}</p>
                                    </div>
                                  </div>

                                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform mt-1 ${isOpen ? "rotate-180" : ""}`} />
                                </div>

                                {isOpen && (
                                  <div className="mt-4 border-t border-gray-200 pt-4">
                                    {/* Fix 2 inner line — entries also connect properly */}
                                    <div className="space-y-2">
                                      {(ev.entries || []).map((en, j) => {
                                        const loc = fmtLoc(en.location);
                                        const when = fmtDate(en.occurredAt);
                                        const isLastEntry = j === (ev.entries?.length || 0) - 1;
                                        const entryDotBg = isCompleted && isLastEntry ? "#22c55e" : safeColor(en.color) || "#9ca3af";

                                        return (
                                          <div key={`entry-${j}`} className="relative pl-7">
                                            {!isLastEntry && (
                                              <div className="absolute left-[9px] top-[14px] bottom-[-10px] w-[2px] bg-gray-200 rounded-full" />
                                            )}
                                            <div className="absolute left-[6px] top-[11px]">
                                              <div className="h-3 w-3 rounded-full ring-2 ring-white shadow-sm" style={{ background: entryDotBg }} />
                                            </div>
                                            <div className={`rounded-xl border border-gray-200 bg-white px-4 py-3 ${!isLastEntry ? "mb-2" : ""}`}>
                                              <p className="text-xs font-semibold text-gray-400">{when}{loc ? ` · ${loc}` : ""}</p>
                                              <p className="text-sm text-gray-800 mt-1 leading-relaxed">{en.note?.trim() || "No additional details provided."}</p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Invoice</p>
                                        <p className="mt-0.5 text-xs font-bold text-gray-900">{invoiceStatusLabel} · {invoiceAmount.toFixed(2)} {invoiceCurrency}</p>
                                      </div>
                                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Destination</p>
                                        <p className="mt-0.5 text-xs font-bold text-gray-900">{data.destination || "—"}</p>
                                      </div>
                                      <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Current Location</p>
                                        <p className="mt-0.5 text-xs font-bold text-gray-900">{data.currentLocation || fmtLoc(events[currentIndex]?.location) || "—"}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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