'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight, Package, FileText, Clock, TrendingUp, MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type ShipmentStatus = 'Delivered' | 'In Transit' | 'Custom Clearance' | 'Unclaimed' | 'Created';

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  senderCountryCode?: string;
  destinationCountryCode?: string;
  status: ShipmentStatus | string;
  statusColor?: string;
  createdAt?: string;
  updatedAt?: string;
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
  defaultUpdate?: string;
  nextStep?: string;
  updatedAt?: string;
};

const statusPill: Record<string, string> = {
  Delivered: 'bg-emerald-100 text-emerald-700',
  'In Transit': 'bg-blue-100 text-blue-700',
  'Custom Clearance': 'bg-amber-100 text-amber-700',
  Unclaimed: 'bg-red-100 text-red-700',
  Created: 'bg-slate-100 text-slate-600',
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-amber-100 text-amber-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  rose: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
  gray: 'bg-gray-100 text-gray-600',
};

function normalizeStatusKey(status?: string) {
  return (status ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');
}

export default function DashboardHome() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [recentShipments, setRecentShipments] = useState<Shipment[]>([]);
  const [newestShipments, setNewestShipments] = useState<Shipment[]>([]);
  const [statusList, setStatusList] = useState<StatusConfig[]>([]);
  const [dash, setDash] = useState<DashStats>({
    total: 0, inTransit: 0, delivered: 0, custom: 0, unclaimed: 0,
    pendingInvoicesCount: 0, pendingInvoicesByCurrency: {}, pendingInvoicesCurrencies: [],
  });
  const [loading, setLoading] = useState(true);

  const statusMap = useMemo(() => {
    const m: Record<string, StatusConfig> = {};
    for (const s of statusList) {
      const k = String(s?.key || '').toLowerCase();
      if (k) m[k] = s;
    }
    return m;
  }, [statusList]);

  useEffect(() => {
    const run = async () => {
      try {
        const [recentRes, newestRes, statsRes, statusRes] = await Promise.all([
          fetch('/api/shipments/recent', { cache: 'no-store' }),
          fetch('/api/shipments/newest', { cache: 'no-store' }),
          fetch('/api/dashboard/stats', { cache: 'no-store' }),
          fetch('/api/statuses', { cache: 'no-store' }),
        ]);

        const recentData = await recentRes.json();
        const newestData = await newestRes.json();
        const statsData = await statsRes.json();
        const statusData = await statusRes.json();

        setRecentShipments(Array.isArray(recentData?.results) ? recentData.results : []);
        setNewestShipments(Array.isArray(newestData?.results) ? newestData.results : []);

        const byCurrency = typeof statsData?.pendingInvoicesByCurrency === 'object'
          ? statsData.pendingInvoicesByCurrency : {};
        const currencies = Array.isArray(statsData?.pendingInvoicesCurrencies)
          ? statsData.pendingInvoicesCurrencies : Object.keys(byCurrency).sort();

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
        setRecentShipments([]);
        setNewestShipments([]);
        setStatusList([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const pendingInvoiceLines: string[] =
    dash.pendingInvoicesCount > 0
      ? (dash.pendingInvoicesCurrencies.length
          ? dash.pendingInvoicesCurrencies
          : Object.keys(dash.pendingInvoicesByCurrency || {}).sort()
        ).map(cur => `${cur} ${Number(dash.pendingInvoicesByCurrency?.[cur] || 0).toLocaleString()}`)
      : ['—'];

  const stats = [
    {
      title: 'Total Shipments',
      value: String(dash.total),
      icon: Package,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Pending Invoice',
      value: pendingInvoiceLines,
      icon: FileText,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'In Transit',
      value: String(dash.inTransit),
      icon: TrendingUp,
      gradient: 'from-cyan-500 to-blue-500',
      bg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
    },
    {
      title: 'Delivered',
      value: String(dash.delivered),
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Custom Clearance',
      value: String(dash.custom),
      icon: AlertCircle,
      gradient: 'from-orange-500 to-amber-500',
      bg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      title: 'Unclaimed',
      value: String(dash.unclaimed),
      icon: MapPin,
      gradient: 'from-red-500 to-rose-500',
      bg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {stats.map(({ title, value, icon: Icon, gradient, bg, iconColor }) => {
          const lines = Array.isArray(value) ? value : [value];
          return (
            <div key={title}
              className="relative bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm overflow-hidden">
              {/* Top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient}`} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">{title}</p>
                  <div className="mt-2">
                    {lines.map((line, i) => (
                      <p key={i} className={i === 0
                        ? 'text-2xl sm:text-3xl font-extrabold text-gray-900 leading-none'
                        : 'text-sm font-semibold text-gray-600 mt-1'}>
                        {loading ? (
                          <span className="inline-block w-12 h-6 bg-gray-100 rounded animate-pulse" />
                        ) : line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
                </div>
              </div>
              <div className={`mt-3 h-1 w-10 rounded-full bg-gradient-to-r ${gradient}`} />
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Quick Actions</h3>
            <p className="text-xs text-gray-500 mt-0.5">Jump to common tasks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: `/${locale}/dashboard/track`, icon: Package, title: 'Track Shipment', desc: 'Search by tracking number', gradient: 'from-blue-500 to-blue-600' },
            { href: `/${locale}/dashboard/invoices`, icon: FileText, title: 'View Invoices', desc: 'Pending & paid invoices', gradient: 'from-amber-500 to-orange-500' },
            { href: `/${locale}/dashboard/history`, icon: Clock, title: 'History', desc: 'Recent activity & updates', gradient: 'from-emerald-500 to-green-500' },
          ].map(({ href, icon: Icon, title, desc, gradient }) => (
            <Link key={title} href={href}
              className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-blue-200 hover:shadow-md p-4 transition-all duration-200">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 truncate">{desc}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Newest Shipments */}
      <ShipmentsSection
        title="Newest Shipments"
        locale={locale}
        loading={loading}
        shipments={newestShipments}
        statusMap={statusMap}
      />

      {/* Recent Activity */}
      <ShipmentsSection
        title="Recent Activity"
        locale={locale}
        loading={loading}
        shipments={recentShipments}
        statusMap={statusMap}
      />
    </div>
  );
}

function ShipmentsSection({
  title, locale, loading, shipments, statusMap,
}: {
  title: string;
  locale: string;
  loading: boolean;
  shipments: Shipment[];
  statusMap: Record<string, StatusConfig>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <Link href={`/${locale}/dashboard/track`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition">
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-500">No shipments yet</p>
          <p className="text-xs text-gray-400 mt-1">Your shipments will appear here</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Shipment ID</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Tracking #</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Route</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="py-3 px-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s, idx) => {
                  const statusHref = `/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`;
                  const key = normalizeStatusKey(s.status);
                  const adminColor = (statusMap[key]?.color || '').toLowerCase();
                  const fallbackColor = (s.statusColor || '').toLowerCase();
                  const pillClass = colorMap[adminColor] || colorMap[fallbackColor] || statusPill[s.status] || statusPill.Created;

                  return (
                    <tr key={`${s.shipmentId}-${idx}`}
                      className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors duration-150">
                      <td className="py-3.5 px-5 font-bold text-gray-900 whitespace-nowrap">{s.shipmentId}</td>
                      <td className="py-3.5 px-5 text-gray-600 whitespace-nowrap font-mono text-xs">{s.trackingNumber}</td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className="text-gray-500 text-xs font-semibold">
                          {(s.senderCountryCode || '—').toUpperCase()}
                          <span className="mx-1.5 text-gray-300">→</span>
                          {(s.destinationCountryCode || '—').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <Link href={statusHref}>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition ${pillClass}`}>
                            {s.status}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-5 text-gray-500 text-xs whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {shipments.map((s, idx) => {
              const statusHref = `/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`;
              const key = normalizeStatusKey(s.status);
              const adminColor = (statusMap[key]?.color || '').toLowerCase();
              const fallbackColor = (s.statusColor || '').toLowerCase();
              const pillClass = colorMap[adminColor] || colorMap[fallbackColor] || statusPill[s.status] || statusPill.Created;

              return (
                <div key={`${s.shipmentId}-${idx}`} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{s.shipmentId}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{s.trackingNumber}</p>
                    </div>
                    <Link href={statusHref}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${pillClass}`}>
                        {s.status}
                      </span>
                    </Link>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-xs font-semibold text-gray-400">
                      {(s.senderCountryCode || '—').toUpperCase()}
                      <span className="mx-1.5">→</span>
                      {(s.destinationCountryCode || '—').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}