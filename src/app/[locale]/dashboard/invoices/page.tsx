// src/app/[locale]/dashboard/invoices/page.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Search, FileText, ChevronRight, AlertCircle,
  RefreshCw, Calendar, MapPin, CreditCard, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";
import { useIntl } from "react-intl";

type InvoiceRow = {
  shipmentId: string;
  trackingNumber: string;
  status?: string;
  senderName?: string;
  senderCity?: string;
  senderCountry?: string;
  receiverName?: string;
  receiverCity?: string;
  receiverCountry?: string;
  shipmentScope?: string;
  estimatedDeliveryDate?: string | null;
  estimatedDeliveryDateMin?: string | null;
  createdAt?: string;
  invoice?: {
    invoiceNumber?: string;
    status?: "paid" | "unpaid" | "overdue" | "cancelled";
    amount?: number;
    currency?: string;
    dueDate?: string;
  } | null;
};

function fmtDate(iso?: string | null, bcpLocale = "en-US"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(bcpLocale, { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(amount: any, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} 0.00`;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function joinLoc(...parts: any[]) {
  return parts.map(p => String(p || "").trim()).filter(Boolean).join(", ");
}

const PAGE_SIZE = 10;

// ─── Invoice number auto-format ────────────────────────────────
function formatInvoiceInput(raw: string): string {
  const v = raw.toUpperCase();
  const letters = (v.match(/[A-Z]/g) || []).join("");
  const digits = (v.match(/[0-9]/g) || []).join("");
  const letterPart = letters.slice(0, 6);
  const digitPart = digits.slice(0, 13);

  let out = "";
  if (letterPart.length > 0) out += letterPart.slice(0, 3);
  if (letterPart.length > 3 || (letterPart.length === 3 && raw.length > 3)) out += "-";
  if (letterPart.length > 3) out += letterPart.slice(3, 6);
  if (letterPart.length === 6 && (digitPart.length > 0 || raw.length > 7)) out += "-";
  if (digitPart.length > 0) out += digitPart.slice(0, 4);
  if (digitPart.length >= 4 && (digitPart.length > 4 || raw.length > 12)) out += "-";
  if (digitPart.length > 4) out += digitPart.slice(4, 6);
  if (digitPart.length >= 6 && (digitPart.length > 6 || raw.length > 15)) out += "-";
  if (digitPart.length > 6) out += digitPart.slice(6, 13);
  return out;
}

export default function DashboardInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);

  // BCP-47 locale map for date formatting
  const bcpLocale = useMemo(() => {
    const m: Record<string, string> = {
      en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE",
      zh: "zh-CN", it: "it-IT", ar: "ar-SA", pt: "pt-PT",
      ru: "ru-RU", ja: "ja-JP", ko: "ko-KR", hi: "hi-IN",
    };
    return m[locale] || "en-US";
  }, [locale]);

  // Translated invoice badge labels (reused from History.* keys)
  const getInvoiceBadge = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "paid") return { label: t("History.invoicePaid"), bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30", text: "text-green-700 dark:text-green-400" };
    if (s === "overdue") return { label: t("History.invoiceOverdue"), bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30", text: "text-red-700 dark:text-red-400" };
    if (s === "cancelled") return { label: t("History.invoiceCancelled"), bg: "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/20", text: "text-gray-700 dark:text-gray-300" };
    return { label: t("History.invoiceUnpaid"), bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
  };

  const FILTERS: Array<{ id: "all" | "unpaid" | "paid" | "overdue" | "cancelled"; label: string }> = [
    { id: "all", label: t("Invoices.filterAll") },
    { id: "unpaid", label: t("Invoices.filterUnpaid") },
    { id: "overdue", label: t("Invoices.filterOverdue") },
    { id: "paid", label: t("Invoices.filterPaid") },
    { id: "cancelled", label: t("Invoices.filterCancelled") },
  ];

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

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, paid: 0, unpaid: 0, overdue: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid" | "overdue" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSuggestOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = new URL("/api/user/shipments", window.location.origin);
      url.searchParams.set("type", "invoices");
      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(json?.error || t("Invoices.loadError")); return; }
      setInvoices(Array.isArray(json?.shipments) ? json.shipments : []);
      setCounts(json?.counts || { all: 0, paid: 0, unpaid: 0, overdue: 0, cancelled: 0 });
    } catch (e: any) {
      setErr(e?.message || t("Invoices.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let r = invoices;
    if (filter !== "all") r = r.filter(d => d?.invoice?.status === filter);
    if (search.trim()) {
      const v = search.trim().toUpperCase();
      r = r.filter(d => String(d?.invoice?.invoiceNumber || "").toUpperCase().includes(v));
    }
    return r;
  }, [invoices, filter, search]);

  const suggestions = useMemo(() => {
    const v = search.trim().toUpperCase();
    if (!v) return invoices.slice(0, 6);
    return invoices
      .filter(d => String(d?.invoice?.invoiceNumber || "").toUpperCase().includes(v))
      .slice(0, 6);
  }, [search, invoices]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [filter, search]);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totals = useMemo(() => {
    const byCurrency: Record<string, { paid: number; unpaid: number }> = {};
    invoices.forEach(d => {
      const inv = d?.invoice;
      if (!inv) return;
      const cur = inv.currency || "USD";
      if (!byCurrency[cur]) byCurrency[cur] = { paid: 0, unpaid: 0 };
      const amt = Number(inv.amount) || 0;
      if (inv.status === "paid") byCurrency[cur].paid += amt;
      else if (inv.status === "unpaid" || inv.status === "overdue") byCurrency[cur].unpaid += amt;
    });
    return byCurrency;
  }, [invoices]);

  const headerTitleCls = isMidnight ? "text-white" : "text-gray-900 dark:text-white";
  const headerSubCls = isMidnight ? "text-white/70" : "text-gray-500 dark:text-gray-400";

  // Empty state messages
  const emptyTitle = filter === "all" ? t("Invoices.emptyNone")
    : filter === "unpaid" ? t("Invoices.emptyUnpaid")
    : filter === "overdue" ? t("Invoices.emptyOverdue")
    : filter === "paid" ? t("Invoices.emptyPaid")
    : t("Invoices.emptyCancelled");

  const emptyDesc = search.trim() ? t("Invoices.emptySearchDesc")
    : filter === "all" ? t("Invoices.emptyNoneDesc")
    : t("Invoices.emptyFilterDesc");

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-5">

      <div>
        <h1 className={`text-2xl font-extrabold ${headerTitleCls}`}>{t("Invoices.title")}</h1>
        <p className={`mt-1 text-sm ${headerSubCls}`}>
          {t("Invoices.subtitle")}
        </p>
      </div>

      {/* Summary cards */}
      {Object.keys(totals).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(totals).slice(0, 2).map(([cur, tt]) => (
            <div key={cur} className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" style={{ color: accentSolid }} />
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{cur}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t("Invoices.outstanding")}</p>
                  <p className="text-base font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{fmtMoney(tt.unpaid, cur)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{t("Invoices.paidAmount")}</p>
                  <p className="text-base font-extrabold text-green-700 dark:text-green-400 mt-0.5">{fmtMoney(tt.paid, cur)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map(f => {
          const isActive = filter === f.id;
          const count = (counts as any)[f.id] ?? 0;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-white"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
              }`}
              style={isActive ? { background: accentSolid } : {}}>
              {f.label}
              <span className="ml-1.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Search box with suggestions */}
      <div ref={searchRef} className="relative rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wide">
          {t("Invoices.searchLabel")}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => { setSearch(formatInvoiceInput(e.target.value)); setSuggestOpen(true); }}
              onFocus={() => setSuggestOpen(true)}
              placeholder="EXS-INV-YYYY-MM-NNNNNNN"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:border-gray-400 dark:focus:border-white/30 transition uppercase"
              style={{ fontSize: '16px' }} />
          </div>
          <button onClick={load}
            className="cursor-pointer p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition shrink-0"
            title={t("Invoices.refresh")}>
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {suggestOpen && suggestions.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-30">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
              {t("Invoices.yourInvoices")}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map(d => {
                const inv = d.invoice!;
                const badge = getInvoiceBadge(inv.status);
                return (
                  <button
                    key={inv.invoiceNumber || d.shipmentId}
                    type="button"
                    onMouseDown={() => {
                      setSuggestOpen(false);
                      const slug = encodeURIComponent(d.trackingNumber || d.shipmentId);
                      router.push(`/${locale}/dashboard/invoices/${slug}`);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentSolid}15` }}>
                      <FileText className="w-3.5 h-3.5" style={{ color: accentSolid }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{fmtMoney(inv.amount, inv.currency || "USD")}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentSolid }} />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("Invoices.loading")}</p>
          </div>
        ) : err ? (
          <div className="p-8">
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4">
              <div className="flex items-start gap-2.5 text-red-700 dark:text-red-400 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {err}
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-gray-100 dark:bg-white/5">
              <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {emptyTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {emptyDesc}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/10">
              {paged.map(d => {
                const inv = d.invoice!;
                const badge = getInvoiceBadge(inv.status);
                const fromText = joinLoc(d.senderCity, d.senderCountry) || "—";
                const toText = joinLoc(d.receiverCity, d.receiverCountry) || "—";
                const slug = encodeURIComponent(d.trackingNumber || d.shipmentId);

                return (
                  <Link
                    key={d.shipmentId}
                    href={`/${locale}/dashboard/invoices/${slug}`}
                    className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                    <div className="flex items-center gap-4">

                      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${accentSolid}15` }}>
                        <FileText className="w-5 h-5" style={{ color: accentSolid }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                            {inv.invoiceNumber || d.shipmentId}
                          </p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                          {d.trackingNumber}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 flex-wrap">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={10} className="shrink-0" />
                            <span className="truncate">{fromText} → {toText}</span>
                          </span>
                          {inv.dueDate && (
                            <span className="flex items-center gap-1 shrink-0">
                              <Calendar size={10} /> {t("Invoices.due", { date: fmtDate(inv.dueDate, bcpLocale) })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-extrabold text-gray-900 dark:text-white">
                          {fmtMoney(inv.amount, inv.currency || "USD")}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {fmtDate(d.createdAt, bcpLocale)}
                        </p>
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
                  {t("Invoices.pageInfo", { page, totalPages, count: filtered.length })}
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