// src/app/[locale]/dashboard/history/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Search, Package, MapPin, ChevronRight, AlertCircle,
  RefreshCw, Calendar, CheckCircle2, Clock3, Truck, History as HistoryIcon,
  ChevronLeft, ChevronRight as ChevronRightIcon,
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

const PAGE_SIZE = 10;

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(amount: any, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function joinLoc(...parts: any[]) {
  return parts.map(p => String(p || "").trim()).filter(Boolean).join(", ");
}

function getStatusBadge(status?: string) {
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

export default function DashboardHistoryPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [isMidnight, setIsMidnight] = useState(false);

  useEffect(() => {
    const apply = () => {
      try {
        const t = (localStorage.getItem("exodus_theme_cache") as ThemeId | null) || "default";
        const theme = THEMES.find(x => x.id === t) || THEMES[0];
        setAccentSolid(theme.accent || "#0b3aa4");
        setIsMidnight(t === "midnight");
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
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/user/shipments", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(json?.error || "Failed to load history."); return; }
      setShipments(Array.isArray(json?.shipments) ? json.shipments : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Filter by search — match tracking, shipment ID, sender/receiver name, route
  const filtered = useMemo(() => {
    const v = search.trim().toLowerCase();
    if (!v) return shipments;
    return shipments.filter(s => {
      const haystack = [
        s.trackingNumber, s.shipmentId, s.status,
        s.senderName, s.senderCity, s.senderState, s.senderCountry,
        s.receiverName, s.receiverCity, s.receiverState, s.receiverCountry,
        s.invoice?.invoiceNumber,
      ].map(x => String(x || "").toLowerCase()).join(" ");
      return haystack.includes(v);
    });
  }, [shipments, search]);

  // Sort by most recent activity (statusUpdatedAt > updatedAt > createdAt)
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aT = new Date(a.statusUpdatedAt || a.updatedAt || a.createdAt || 0).getTime();
      const bT = new Date(b.statusUpdatedAt || b.updatedAt || b.createdAt || 0).getTime();
      return bT - aT;
    });
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";
  const headerSubCls = isMidnight ? "text-white/70" : "text-gray-500 dark:text-gray-400";

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <HistoryIcon className="w-6 h-6" style={{ color: accentSolid }} />
          <h1 className={`text-2xl font-extrabold ${headerTitleCls}`}>History</h1>
        </div>
        <p className={`mt-1 text-sm ${headerSubCls}`}>
          All shipments you've ever sent or received, sorted by most recent activity.
        </p>
      </div>

      {/* Search box */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by tracking number, shipment ID, name, or location…"
            autoComplete="off"
            className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition"
            style={{ fontSize: "16px" }} />
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Package className="w-4 h-4 shrink-0" style={{ color: accentSolid }} />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Shipments</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
              {search.trim() ? `${sorted.length} of ${shipments.length}` : shipments.length}
            </span>
          </div>
          <button onClick={load}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
            title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading history…</p>
          </div>
        ) : err ? (
          <div className="p-8">
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4">
              <div className="flex items-start gap-2.5 text-red-700 dark:text-red-400 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
              </div>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gray-100 dark:bg-white/5">
              <HistoryIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {search.trim() ? "No shipments match your search" : "No shipments yet"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {search.trim()
                ? "Try a different search term."
                : "Your shipment history will appear here."}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {paged.map(s => {
                const statusBadge = getStatusBadge(s.status);
                const StatusIcon = statusBadge.icon;
                const invoiceBadge = getInvoiceBadge(s?.invoice?.status);
                const fromText = joinLoc(s.senderCity, s.senderState, s.senderCountry) || "—";
                const toText = joinLoc(s.receiverCity, s.receiverState, s.receiverCountry) || "—";

                return (
                  <Link
                    key={s.shipmentId || s.trackingNumber}
                    href={`/${locale}/dashboard/track/${encodeURIComponent(s.trackingNumber || s.shipmentId)}`}
                    className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                    <div className="flex items-center gap-4">

                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${accentSolid}15` }}>
                        <Package className="w-5 h-5" style={{ color: accentSolid }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                            {s.trackingNumber || s.shipmentId}
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
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {fmtDate(s.statusUpdatedAt || s.updatedAt || s.createdAt)}
                          </span>
                          {s.shipmentMeans && <span>{s.shipmentMeans}</span>}
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end shrink-0">
                        {s?.invoice?.amount != null && (
                          <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {fmtMoney(s.invoice.amount, s.invoice.currency || "USD")}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page {page} of {totalPages} · {sorted.length} {sorted.length === 1 ? "shipment" : "shipments"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    Next <ChevronRightIcon size={12} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}