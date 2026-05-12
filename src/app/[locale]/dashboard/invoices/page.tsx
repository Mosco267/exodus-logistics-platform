"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Search, FileText, ChevronRight, AlertCircle,
  RefreshCw, Calendar, MapPin, CreditCard, ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";

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

function getInvoiceBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return { label: "PAID", bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30", text: "text-green-700 dark:text-green-400" };
  if (s === "overdue") return { label: "OVERDUE", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30", text: "text-red-700 dark:text-red-400" };
  if (s === "cancelled") return { label: "CANCELLED", bg: "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/20", text: "text-gray-700 dark:text-gray-300" };
  return { label: "UNPAID", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
}

const FILTERS: Array<{ id: "all" | "unpaid" | "paid" | "overdue" | "cancelled"; label: string }> = [
  { id: "all", label: "All" },
  { id: "unpaid", label: "Unpaid" },
  { id: "overdue", label: "Overdue" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Cancelled" },
];

const PAGE_SIZE = 10;

// ─── Invoice number auto-format ────────────────────────────────
// Pattern: EXS-INV-YYYY-MM-NNNNNNN
//   - "EXS" and "INV" are letters
//   - "YYYY", "MM", "NNNNNNN" are digits only
//   - Dashes inserted automatically at the correct positions
//
// We accept the user typing anything, strip everything that doesn't fit
// the position rules, and re-insert dashes.
function formatInvoiceInput(raw: string): string {
  // Normalize to uppercase, strip dashes for re-insertion
  const v = raw.toUpperCase();

  // Walk position by position. Allowed pattern:
  //   pos 0-2: letters ("EXS")
  //   pos 3:   dash
  //   pos 4-6: letters ("INV")
  //   pos 7:   dash
  //   pos 8-11: digits (year)
  //   pos 12:  dash
  //   pos 13-14: digits (month)
  //   pos 15:  dash
  //   pos 16+: digits (number)
  //
  // We extract a "core" sequence from the input — letters where letters are
  // expected, digits where digits are expected, ignoring everything else.
  // Then we re-render it with dashes auto-inserted.

  const letters = (v.match(/[A-Z]/g) || []).join("");
  const digits = (v.match(/[0-9]/g) || []).join("");

  // The user can type either "EXSINV..." or with dashes — either way we just
  // care about extracting the letters (up to 6: 3 EXS + 3 INV) and digits.
  const letterPart = letters.slice(0, 6); // EXSINV
  const digitPart = digits.slice(0, 13);  // YYYYMMNNNNNNN

  // Now build with dashes
  let out = "";

  // Letters part 1: EXS
  if (letterPart.length > 0) out += letterPart.slice(0, 3);

  // First dash
  if (letterPart.length > 3 || (letterPart.length === 3 && raw.length > 3)) out += "-";

  // Letters part 2: INV
  if (letterPart.length > 3) out += letterPart.slice(3, 6);

  // Second dash
  if (letterPart.length === 6 && (digitPart.length > 0 || raw.length > 7)) out += "-";

  // Digits part 1: year
  if (digitPart.length > 0) out += digitPart.slice(0, 4);

  // Third dash
  if (digitPart.length >= 4 && (digitPart.length > 4 || raw.length > 12)) out += "-";

  // Digits part 2: month
  if (digitPart.length > 4) out += digitPart.slice(4, 6);

  // Fourth dash
  if (digitPart.length >= 6 && (digitPart.length > 6 || raw.length > 15)) out += "-";

  // Digits part 3: number
  if (digitPart.length > 6) out += digitPart.slice(6, 13);

  return out;
}

export default function DashboardInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

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
      if (!res.ok) { setErr(json?.error || "Failed to load invoices."); return; }
      setInvoices(Array.isArray(json?.shipments) ? json.shipments : []);
      setCounts(json?.counts || { all: 0, paid: 0, unpaid: 0, overdue: 0, cancelled: 0 });
    } catch (e: any) {
      setErr(e?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Apply local filter + search
  const filtered = useMemo(() => {
    let r = invoices;
    if (filter !== "all") r = r.filter(d => d?.invoice?.status === filter);
    if (search.trim()) {
      const v = search.trim().toUpperCase();
      r = r.filter(d => String(d?.invoice?.invoiceNumber || "").toUpperCase().includes(v));
    }
    return r;
  }, [invoices, filter, search]);

  // Suggestions = user's invoice numbers matching the typed text
  const suggestions = useMemo(() => {
    const v = search.trim().toUpperCase();
    if (!v) return invoices.slice(0, 6);
    return invoices
      .filter(d => String(d?.invoice?.invoiceNumber || "").toUpperCase().includes(v))
      .slice(0, 6);
  }, [search, invoices]);

  // Pagination
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

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-5">

      <div>
        <h1 className={`text-2xl font-extrabold ${headerTitleCls}`}>My Invoices</h1>
        <p className={`mt-1 text-sm ${headerSubCls}`}>
          View and manage all invoices for your shipments.
        </p>
      </div>

      {/* Summary cards */}
      {Object.keys(totals).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(totals).slice(0, 2).map(([cur, t]) => (
            <div key={cur} className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" style={{ color: accentSolid }} />
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{cur}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Outstanding</p>
                  <p className="text-base font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{fmtMoney(t.unpaid, cur)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Paid</p>
                  <p className="text-base font-extrabold text-green-700 dark:text-green-400 mt-0.5">{fmtMoney(t.paid, cur)}</p>
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

      {/* Search box with suggestions — taller, auto-format */}
      <div ref={searchRef} className="relative rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wide">
          Search invoice
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
            title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {suggestOpen && suggestions.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden z-30">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/10">
              Your invoices
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading invoices…</p>
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
              {filter === "all" ? "No invoices yet" : `No ${filter} invoices`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {search.trim() ? "No results match your search." : filter === "all" ? "Invoices will appear here once you create a shipment." : "Try a different filter."}
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
                              <Calendar size={10} /> Due {fmtDate(inv.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-extrabold text-gray-900 dark:text-white">
                          {fmtMoney(inv.amount, inv.currency || "USD")}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {fmtDate(d.createdAt)}
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
                  Page {page} of {totalPages} · {filtered.length} invoices
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