"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowUpRight, Package, FileText, Clock, TrendingUp, MapPin,
  AlertCircle, CheckCircle2, Loader2, History, ChevronRight, Truck, Clock3,
} from "lucide-react";
import { THEMES, type ThemeId } from "@/components/AppearancePanel";

type ShipmentStatus = "Delivered" | "In Transit" | "Custom Clearance" | "Unclaimed" | "Created";

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  senderCity?: string;
  senderState?: string;
  senderCountry?: string;
  senderCountryCode?: string;
  receiverCity?: string;
  receiverState?: string;
  receiverCountry?: string;
  destinationCountryCode?: string;
  status: ShipmentStatus | string;
  statusColor?: string;
  createdAt?: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
  receiverName?: string;
  receiverEmail?: string;
  invoice?: { invoiceNumber?: string; status?: string; amount?: number; currency?: string };
};

type DashStats = {
  total: number;
  inTransit: number;
  delivered: number;
  custom: number;
  unclaimed: number;
  pendingInvoicesCount: number;
  pendingInvoicesByCurrency: Record<string, number>;
  pendingInvoicesCurrencies: string[];
};

type StatusConfig = {
  key: string;
  label?: string;
  color?: string;
};

const colorMap: Record<string, { bg: string; text: string; icon: any }> = {
  blue: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300", text: "text-blue-700 dark:text-blue-300", icon: Truck },
  green: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  red: { bg: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300", text: "text-red-700 dark:text-red-300", icon: AlertCircle },
  orange: { bg: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300", text: "text-orange-700 dark:text-orange-300", icon: AlertCircle },
  yellow: { bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300", text: "text-yellow-700 dark:text-yellow-300", icon: Clock3 },
  purple: { bg: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300", text: "text-purple-700 dark:text-purple-300", icon: Package },
  emerald: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", text: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  slate: { bg: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300", text: "text-slate-700 dark:text-slate-300", icon: Package },
  gray: { bg: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300", text: "text-gray-700 dark:text-gray-300", icon: Package },
};

function getStatusBadge(status?: string, statusMap?: Record<string, StatusConfig>, statusColor?: string) {
  const key = String(status || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
  const adminColor = (statusMap?.[key]?.color || "").toLowerCase();
  const fallbackColor = (statusColor || "").toLowerCase();

  const s = String(status || "").toLowerCase();
  if (adminColor && colorMap[adminColor]) return { ...colorMap[adminColor], label: status || "—" };
  if (fallbackColor && colorMap[fallbackColor]) return { ...colorMap[fallbackColor], label: status || "—" };
  if (s === "delivered") return { ...colorMap.green, label: "Delivered" };
  if (s === "in transit") return { ...colorMap.blue, label: "In Transit" };
  if (s === "custom clearance") return { ...colorMap.orange, label: "Custom Clearance" };
  if (s === "unclaimed") return { ...colorMap.red, label: "Unclaimed" };
  if (s === "cancelled" || s === "canceled") return { ...colorMap.red, label: "Cancelled" };
  return { ...colorMap.slate, label: status || "Created" };
}

// ✅ Invoice badge (matches the history page)
function getInvoiceBadge(status?: string) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return { label: "PAID", bg: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30", text: "text-green-700 dark:text-green-400" };
  if (s === "overdue") return { label: "OVERDUE", bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30", text: "text-red-700 dark:text-red-400" };
  if (s === "cancelled") return { label: "CANCELLED", bg: "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/20", text: "text-gray-700 dark:text-gray-300" };
  return { label: "UNPAID", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30", text: "text-amber-700 dark:text-amber-400" };
}

function joinLoc(...parts: any[]) {
    return parts.map(p => String(p || "").trim()).filter(Boolean).join(", ");
  }
 
  function fmtDate(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
 
  function fmtMoney(amount: any, currency = "USD"): string {
    const n = Number(amount);
    if (!Number.isFinite(n)) return `${currency} 0.00`;
    return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

export default function DashboardHome() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

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

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statusList, setStatusList] = useState<StatusConfig[]>([]);
  const [dash, setDash] = useState<DashStats>({
    total: 0, inTransit: 0, delivered: 0, custom: 0, unclaimed: 0,
    pendingInvoicesCount: 0, pendingInvoicesByCurrency: {}, pendingInvoicesCurrencies: [],
  });
  const [loading, setLoading] = useState(true);

  const statusMap = useMemo(() => {
    const m: Record<string, StatusConfig> = {};
    for (const s of statusList) {
      const k = String(s?.key || "").toLowerCase();
      if (k) m[k] = s;
    }
    return m;
  }, [statusList]);

  useEffect(() => {
    const run = async () => {
      try {
        const [shipsRes, statsRes, statusRes] = await Promise.all([
          fetch("/api/user/shipments", { cache: "no-store" }),
          fetch("/api/dashboard/stats", { cache: "no-store" }),
          fetch("/api/statuses", { cache: "no-store" }),
        ]);
        const shipsData = await shipsRes.json();
        const statsData = await statsRes.json();
        const statusData = await statusRes.json();

        setShipments(Array.isArray(shipsData?.shipments) ? shipsData.shipments : []);

        const byCurrency = typeof statsData?.pendingInvoicesByCurrency === "object" ? statsData.pendingInvoicesByCurrency : {};
        const currencies = Array.isArray(statsData?.pendingInvoicesCurrencies)
          ? statsData.pendingInvoicesCurrencies
          : Object.keys(byCurrency).sort();

        setDash({
          total: Number(statsData?.total || 0),
          inTransit: Number(statsData?.inTransit || 0),
          delivered: Number(statsData?.delivered || 0),
          custom: Number(statsData?.custom || 0),
          unclaimed: Number(statsData?.unclaimed || 0),
          pendingInvoicesCount: Number(statsData?.pendingInvoicesCount || 0),
          pendingInvoicesByCurrency: byCurrency,
          pendingInvoicesCurrencies: currencies,
        });
        setStatusList(Array.isArray(statusData?.statuses) ? statusData.statuses : []);
      } catch {
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const recentHistory = useMemo(() => {
    return [...shipments]
      .sort((a, b) => {
        const aT = new Date(a.statusUpdatedAt || a.updatedAt || a.createdAt || 0).getTime();
        const bT = new Date(b.statusUpdatedAt || b.updatedAt || b.createdAt || 0).getTime();
        return bT - aT;
      })
      .slice(0, 6);
  }, [shipments]);

  const pendingInvoiceDisplay = useMemo(() => {
    if (dash.pendingInvoicesCount === 0) {
      return { primary: "0", hint: "" };
    }
    const orderedCurrencies = dash.pendingInvoicesCurrencies.length
      ? dash.pendingInvoicesCurrencies
      : Object.keys(dash.pendingInvoicesByCurrency || {}).sort();

    const top = orderedCurrencies[0];
    const topAmount = Number(dash.pendingInvoicesByCurrency?.[top] || 0);
    const primary = `${top} ${topAmount.toLocaleString()}`;
    const more = orderedCurrencies.length - 1;
    const hint = more > 0 ? `+${more} more ${more === 1 ? "currency" : "currencies"}` : "";
    return { primary, hint };
  }, [dash]);

  const stats: Array<{
    title: string;
    value: string;
    hint?: string;
    icon: any;
    iconBg: string;
    iconColor: string;
  }> = [
    { title: "Total Shipments", value: String(dash.total), icon: Package, iconBg: "bg-blue-100 dark:bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400" },
    { title: "Pending Invoice", value: pendingInvoiceDisplay.primary, hint: pendingInvoiceDisplay.hint, icon: FileText, iconBg: "bg-amber-100 dark:bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400" },
    { title: "In Transit", value: String(dash.inTransit), icon: TrendingUp, iconBg: "bg-cyan-100 dark:bg-cyan-500/15", iconColor: "text-cyan-600 dark:text-cyan-400" },
    { title: "Delivered", value: String(dash.delivered), icon: CheckCircle2, iconBg: "bg-emerald-100 dark:bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400" },
    { title: "Custom Clearance", value: String(dash.custom), icon: AlertCircle, iconBg: "bg-orange-100 dark:bg-orange-500/15", iconColor: "text-orange-600 dark:text-orange-400" },
    { title: "Unclaimed", value: String(dash.unclaimed), icon: MapPin, iconBg: "bg-red-100 dark:bg-red-500/15", iconColor: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-tour="overview">
        {stats.map(({ title, value, hint, icon: Icon, iconBg, iconColor }) => (
          <div key={title} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 leading-tight">{title}</p>
              <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 dark:bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-none truncate">
                  {value}
                </p>
                {hint && (
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1.5 truncate">
                    {hint}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4" data-tour="quick-actions">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { href: `/${locale}/dashboard/track`, icon: Package, title: "Track Shipment", desc: "Search by tracking number", bg: "bg-blue-600" },
            { href: `/${locale}/dashboard/invoices`, icon: FileText, title: "View Invoices", desc: "Pending & paid invoices", bg: "bg-amber-500" },
            { href: `/${locale}/dashboard/history`, icon: Clock, title: "History", desc: "All shipment history", bg: "bg-emerald-600" },
          ].map(({ href, icon: Icon, title, desc, bg }) => (
            <Link key={title} href={href}
              className="group flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-gray-200 hover:shadow-sm p-3.5 transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Shipment History */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <History className="w-4 h-4 shrink-0" style={{ color: accentSolid }} />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Shipment History</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{shipments.length}</span>
          </div>
          <Link href={`/${locale}/dashboard/history`}
            className="inline-flex items-center gap-1 text-xs font-bold transition hover:opacity-80"
            style={{ color: accentSolid }}>
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: accentSolid }} />
          </div>
        ) : recentHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No shipments yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your shipment history will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/10">
            {recentHistory.map(s => {
              const badge = getStatusBadge(s.status, statusMap, s.statusColor);
              const StatusIcon = badge.icon;
              const invoiceBadge = getInvoiceBadge(s?.invoice?.status);
              const fromText = joinLoc(s.senderCity, s.senderState, s.senderCountry) || "—";
              const toText = joinLoc(s.receiverCity, s.receiverState, s.receiverCountry) || "—";

              return (
                <Link
                  key={s.shipmentId || s.trackingNumber}
                  href={`/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`}
                  className="group block px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                  <div className="flex items-center gap-4">

                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${accentSolid}15` }}>
                      <Package className="w-5 h-5" style={{ color: accentSolid }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                          {s.shipmentId || "—"}
                        </p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg}`}>
                          <StatusIcon size={9} />
                          {badge.label}
                        </span>
                        {/* ✅ Invoice badge — matches history page */}
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
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                        <Clock size={9} />
                        {fmtDate(s.statusUpdatedAt || s.updatedAt || s.createdAt)}
                      </p>
                    </div>
 
                    {/* Amount on desktop — matches history page */}
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
        )}

        {!loading && shipments.length > recentHistory.length && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-white/10 text-center bg-gray-50/50 dark:bg-white/[0.02]">
            <Link href={`/${locale}/dashboard/history`}
              className="inline-flex items-center gap-1.5 text-xs font-bold transition hover:opacity-80"
              style={{ color: accentSolid }}>
              View all {shipments.length} shipments
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}