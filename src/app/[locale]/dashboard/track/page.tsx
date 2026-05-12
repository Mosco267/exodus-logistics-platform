"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Search, Package, MapPin, Truck, ChevronRight,
  AlertCircle, RefreshCw, Calendar, CheckCircle2,
  Clock3, AlertTriangle, FileText,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";

type ShipmentRow = {
  shipmentId: string;
  trackingNumber: string;
  status?: string;
  senderName?: string;
  senderCity?: string;
  senderState?: string;
  senderCountry?: string;
  receiverName?: string;
  receiverCity?: string;
  receiverState?: string;
  receiverCountry?: string;
  shipmentMeans?: string;
  shipmentScope?: string;
  serviceLevel?: string;
  weightKg?: any;
  declaredValue?: any;
  declaredValueCurrency?: string;
  estimatedDeliveryDate?: string | null;
  estimatedDeliveryDateMin?: string | null;
  createdAt?: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
  invoice?: {
    invoiceNumber?: string;
    status?: "paid" | "unpaid" | "overdue" | "cancelled";
    amount?: number;
    currency?: string;
  } | null;
};

// ─── Helpers ──────────────────────────────────────────────────
function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function fmtNumber(value: any, decimals = 0): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtMoney(amount: any, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function joinLoc(...parts: any[]) {
  return parts.map(p => String(p || "").trim()).filter(Boolean).join(", ");
}

// Match admin create-shipment delivery format
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

// ─── Status badge helper ──────────────────────────────────────
function getStatusBadge(status?: string): { label: string; bg: string; text: string; icon: any } {
  const s = String(status || "").toLowerCase();
  if (s === "delivered") return { label: "Delivered", bg: "bg-green-100 dark:bg-green-500/10", text: "text-green-700 dark:text-green-400", icon: CheckCircle2 };
  if (s === "in transit") return { label: "In Transit", bg: "bg-blue-100 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", icon: Truck };
  if (s === "custom clearance") return { label: "Custom Clearance", bg: "bg-amber-100 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", icon: AlertCircle };
  if (s === "unclaimed") return { label: "Unclaimed", bg: "bg-orange-100 dark:bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", icon: Clock3 };
  if (s === "cancelled" || s === "canceled") return { label: "Cancelled", bg: "bg-red-100 dark:bg-red-500/10", text: "text-red-700 dark:text-red-400", icon: AlertCircle };
  return { label: status || "Created", bg: "bg-gray-100 dark:bg-white/10", text: "text-gray-700 dark:text-gray-300", icon: Package };
}

function getInvoiceBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return { label: "PAID", bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30", text: "text-green-700 dark:text-green-400" };
  if (s === "overdue") return { label: "OVERDUE", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30", text: "text-red-700 dark:text-red-400" };
  if (s === "cancelled") return { label: "CANCELLED", bg: "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/20", text: "text-gray-700 dark:text-gray-300" };
  return { label: "UNPAID", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
}

export default function DashboardTrackPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");

  // Read theme accent
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

  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Quick-track (paste any number) — works for shipments outside the user's account too
  const [quickTrack, setQuickTrack] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = new URL("/api/user/shipments", window.location.origin);
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(json?.error || "Failed to load shipments."); return; }
      setShipments(Array.isArray(json?.shipments) ? json.shipments : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load shipments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [debouncedSearch]);

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const v = quickTrack.trim();
    if (!v) return;
    router.push(`/${locale}/dashboard/track/${encodeURIComponent(v)}`);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-5">

      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Track Shipments</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View live tracking for all your shipments, or paste any tracking number to look it up.
        </p>
      </div>

      {/* ── Quick-track box ──────────────────────────────── */}
      <form onSubmit={handleQuickTrack}
        className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wide">
          Track any shipment
        </label>
        <div className="flex gap-2">
          <input
            value={quickTrack}
            onChange={e => setQuickTrack(e.target.value)}
            placeholder="Enter tracking number or shipment ID…"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition"
            style={{ fontSize: '16px' }} />
          <button type="submit" disabled={!quickTrack.trim()}
            className="cursor-pointer flex items-center gap-1.5 px-5 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: accentGradient }}>
            <Search size={15} />
            Track
          </button>
        </div>
      </form>

      {/* ── My shipments list ────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Package className="w-4 h-4 shrink-0" style={{ color: accentSolid }} />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">My Shipments</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{shipments.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none w-32 sm:w-44"
                style={{ fontSize: '14px' }} />
            </div>
            <button onClick={load}
              className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
              title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading shipments…</p>
          </div>
        ) : err ? (
          <div className="p-8">
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4">
              <div className="flex items-start gap-2.5 text-red-700 dark:text-red-400 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
              </div>
            </div>
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gray-100 dark:bg-white/5">
              <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No shipments yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {debouncedSearch ? "No results match your search." : "Create a shipment to see it here."}
            </p>
            {!debouncedSearch && (
              <Link href={`/${locale}/dashboard/shipments/new`}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 transition"
                style={{ background: accentGradient }}>
                Create Shipment
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {shipments.map(s => {
              const statusBadge = getStatusBadge(s.status);
              const StatusIcon = statusBadge.icon;
              const invoiceBadge = getInvoiceBadge(s?.invoice?.status);
              const fromText = joinLoc(s.senderCity, s.senderState, s.senderCountry) || "—";
              const toText = joinLoc(s.receiverCity, s.receiverState, s.receiverCountry) || "—";
              const deliveryStr = fmtEstimatedDelivery(s.estimatedDeliveryDate, s.estimatedDeliveryDateMin, s.shipmentScope);

              return (
                <Link
                  key={s.shipmentId}
                  href={`/${locale}/dashboard/track/${encodeURIComponent(s.trackingNumber || s.shipmentId)}`}
                  className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                  <div className="flex items-center gap-4">

                    {/* Left icon */}
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${accentSolid}15` }}>
                      <Package className="w-5 h-5" style={{ color: accentSolid }} />
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {s.shipmentId || s.trackingNumber}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.bg} ${statusBadge.text}`}>
                          <StatusIcon size={9} />
                          {statusBadge.label}
                        </span>
                        {s?.invoice?.invoiceNumber && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${invoiceBadge.bg} ${invoiceBadge.text}`}>
                            {invoiceBadge.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5 flex-wrap">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{fromText}</span>
                        <ChevronRight size={10} className="shrink-0 opacity-60" />
                        <span className="truncate">{toText}</span>
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                        {s.estimatedDeliveryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} /> {deliveryStr}
                          </span>
                        )}
                        {s.weightKg != null && String(s.weightKg).trim() !== "" && (
                          <span>{fmtNumber(s.weightKg)} kg</span>
                        )}
                        {s.shipmentMeans && <span>{s.shipmentMeans}</span>}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="hidden sm:flex flex-col items-end shrink-0">
                      {s?.invoice?.amount != null && (
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                          {fmtMoney(s.invoice.amount, s.invoice.currency || "USD")}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {fmtDate(s.statusUpdatedAt || s.updatedAt || s.createdAt)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}