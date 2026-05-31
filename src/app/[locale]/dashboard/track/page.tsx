"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Search, Package, MapPin, Truck, ChevronRight,
  AlertCircle, RefreshCw, Calendar, CheckCircle2,
  Clock3, FileText, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";
import { useIntl } from "react-intl";
import {
  getShipmentStatusBadge,
  getInvoiceStatusBadge,
  getShipmentMeansLabel,
} from "@/lib/shipment-utils";

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
function fmtDate(iso?: string | null, bcpLocale = "en-US"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(bcpLocale, { month: "short", day: "numeric", year: "numeric" });
}

function fmtNumber(value: any, decimals = 0): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "—");
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtMoney(amount: any, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function joinLoc(...parts: any[]) {
  return parts.map(p => String(p || "").trim()).filter(Boolean).join(", ");
}

function fmtEstimatedDelivery(maxISO?: string | null, minISO?: string | null, scope?: string | null, bcpLocale = "en-GB"): string {
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

  const fmt = (d: Date) => d.toLocaleDateString(bcpLocale, { day: "2-digit", month: "short" });
  const fmtFull = (d: Date) => d.toLocaleDateString(bcpLocale, { day: "2-digit", month: "short", year: "numeric" });

  if (minD.getTime() === maxD.getTime()) return fmtFull(maxD);
  if (minD.getMonth() === maxD.getMonth() && minD.getFullYear() === maxD.getFullYear()) {
    return `${minD.getDate()}–${maxD.getDate()} ${maxD.toLocaleDateString(bcpLocale, { month: "short", year: "numeric" })}`;
  }
  return `${fmt(minD)} – ${fmtFull(maxD)}`;
}



const PAGE_SIZE = 10;

export default function DashboardTrackPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
   
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  const bcpLocale = useMemo(() => {
    const m: Record<string, string> = {
      en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE",
      zh: "zh-CN", it: "it-IT", ar: "ar-SA", pt: "pt-PT",
      ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN",
    };
    return m[locale] || "en-US";
  }, [locale]);

  


  const [accentSolid, setAccentSolid] = useState("#0b3aa4");
  const [accentGradient, setAccentGradient] = useState("linear-gradient(135deg, #0b3aa4, #0e7490)");
  const [isMidnight, setIsMidnight] = useState(false);

  useEffect(() => {
    const apply = () => {
      try {
        const t = (localStorage.getItem("exodus_theme_cache") as ThemeId | null) || 'default';
        const theme = THEMES.find(x => x.id === t) || THEMES[0];
        setAccentSolid(theme.accent || "#0b3aa4");
        setAccentGradient(theme.sidebar || "linear-gradient(135deg, #0b3aa4, #0e7490)");
        setIsMidnight(t === 'midnight');
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

  // Quick-track (suggestion dropdown)
  const [quickTrack, setQuickTrack] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);

  // Close suggestions on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (quickRef.current && !quickRef.current.contains(e.target as Node)) setSuggestOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/user/shipments", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(json?.error || t("Track.loadError")); return; }
      setShipments(Array.isArray(json?.shipments) ? json.shipments : []);
    } catch (e: any) {
      setErr(e?.message || t("Track.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Suggestions = user's own tracking numbers matching the typed text
  const suggestions = useMemo(() => {
    const v = quickTrack.trim().toUpperCase();
    if (!v) return shipments.slice(0, 6);
    return shipments
      .filter(s => String(s.trackingNumber || "").toUpperCase().includes(v))
      .slice(0, 6);
  }, [quickTrack, shipments]);

  const handleQuickTrack = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = quickTrack.trim().toUpperCase();
    if (!v) return;
    setSuggestOpen(false);
    router.push(`/${locale}/dashboard/track/${encodeURIComponent(v)}`);
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(shipments.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [totalPages, page]);
  const pagedShipments = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return shipments.slice(start, start + PAGE_SIZE);
  }, [shipments, page]);

  // Header text colour — midnight = white always, else default dark/light behavior
  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";
  const headerSubCls = isMidnight ? "text-white/70" : "text-gray-500 dark:text-gray-400";

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-5">

      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h1 className={`text-2xl font-extrabold ${headerTitleCls}`}>{t("Track.title")}</h1>
        <p className={`mt-1 text-sm ${headerSubCls}`}>
          {t("Track.subtitle")}
        </p>
      </div>

      {/* ── Quick-track box with suggestions ──────────────── */}
      <div ref={quickRef} className="relative rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wide">
          {t("Track.quickTrackLabel")}
        </label>
        <form onSubmit={handleQuickTrack} className="flex gap-2">
          <input
            value={quickTrack}
            onChange={e => { setQuickTrack(e.target.value.toUpperCase()); setSuggestOpen(true); }}
            onFocus={() => setSuggestOpen(true)}
            placeholder={t("Track.placeholder")}
            autoComplete="off"
            className="flex-1 px-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition uppercase"
            style={{ fontSize: '16px' }} />
          <button type="submit" disabled={!quickTrack.trim()}
            className="cursor-pointer flex items-center gap-1.5 px-5 py-3.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: accentGradient }}>
            <Search size={15} />
            {t("Track.trackButton")}
          </button>
        </form>

        {/* Suggestions */}
        {suggestOpen && suggestions.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-30">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
              {t("Track.yourShipments")}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map(s => {
                const route = `${joinLoc(s.senderCity, s.senderCountry) || "—"} → ${joinLoc(s.receiverCity, s.receiverCountry) || "—"}`;
                return (
                  <button
                    key={s.trackingNumber}
                    type="button"
                    onMouseDown={() => {
                      setQuickTrack(s.trackingNumber || "");
                      setSuggestOpen(false);
                      router.push(`/${locale}/dashboard/track/${encodeURIComponent(s.trackingNumber || "")}`);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentSolid}15` }}>
                      <Package className="w-3.5 h-3.5" style={{ color: accentSolid }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">{s.trackingNumber}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{route}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── My shipments list ────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Package className="w-4 h-4 shrink-0" style={{ color: accentSolid }} />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t("Track.myShipments")}</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{shipments.length}</span>
          </div>
          <button onClick={load}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition"
            title={t("Track.refresh")}>
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Track.loading")}</p>
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
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("Track.emptyTitle")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("Track.emptyDesc")}
            </p>
            <Link href={`/${locale}/dashboard/shipments/new`}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 transition"
              style={{ background: accentGradient }}>
              {t("Track.createShipment")}
            </Link>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {pagedShipments.map(s => {
                const statusBadge = getShipmentStatusBadge(s.status, intl);
                const StatusIcon = statusBadge.icon;
                const invoiceBadge = getInvoiceStatusBadge(s?.invoice?.status, intl);
                const fromText = joinLoc(s.senderCity, s.senderState, s.senderCountry) || "—";
                const toText = joinLoc(s.receiverCity, s.receiverState, s.receiverCountry) || "—";
                const deliveryStr = fmtEstimatedDelivery(s.estimatedDeliveryDate, s.estimatedDeliveryDateMin, s.shipmentScope, bcpLocale);

                return (
                  <Link
                    key={s.trackingNumber || s.shipmentId}
                    href={`/${locale}/dashboard/track/${encodeURIComponent(s.trackingNumber || s.shipmentId)}`}
                    className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                    <div className="flex items-center gap-4">

                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${accentSolid}15` }}>
                        <Package className="w-5 h-5" style={{ color: accentSolid }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Show tracking number instead of shipmentId */}
                          <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                            {s.trackingNumber || s.shipmentId}
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.bg}`}>
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
                            <span>{t("Track.weightKg", { weight: fmtNumber(s.weightKg) })}</span>
                          )}
                          {s.shipmentMeans && <span>{getShipmentMeansLabel(s.shipmentMeans, intl)}</span>}
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end shrink-0">
                        {s?.invoice?.amount != null && (
                          <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                            {fmtMoney(s.invoice.amount, s.invoice.currency || "USD")}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {fmtDate(s.statusUpdatedAt || s.updatedAt || s.createdAt, bcpLocale)}
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("Track.pageInfo", { page, totalPages, count: shipments.length })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronLeft size={12} /> {t("History.prev")}
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {t("History.next")} <ChevronRightIcon size={12} />
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