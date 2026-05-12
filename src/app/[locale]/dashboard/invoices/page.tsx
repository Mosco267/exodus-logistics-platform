"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Search, FileText, ChevronRight, AlertCircle,
  RefreshCw, Calendar, MapPin, Package, CreditCard,
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

// ─── Helpers ──────────────────────────────────────────────────
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

export default function DashboardInvoicesPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

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

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, paid: 0, unpaid: 0, overdue: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid" | "overdue" | "cancelled">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const url = new URL("/api/user/shipments", window.location.origin);
      url.searchParams.set("type", "invoices");
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch);
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

  useEffect(() => { void load(); }, [debouncedSearch]);

  const filtered = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter(d => d?.invoice?.status === filter);
  }, [invoices, filter]);

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

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">My Invoices</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View and manage all invoices for your shipments.
        </p>
      </div>

      {/* ── Summary cards ───────────────────────────────── */}
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

      {/* ── Filter pills + search ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none w-full sm:w-44"
              style={{ fontSize: '14px' }} />
          </div>
          <button onClick={load}
            className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition shrink-0"
            title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── List ────────────────────────────────────────── */}
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
              {debouncedSearch ? "No results match your search." : filter === "all" ? "Invoices will appear here once you create a shipment." : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {filtered.map(d => {
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
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {inv.invoiceNumber || d.shipmentId}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {d.shipmentId}
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
        )}
      </div>
    </div>
  );
}