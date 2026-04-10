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

        const byCurrency = typeof statsData?.pendingInvoicesByCurrency === 'object' ? statsData.pendingInvoicesByCurrency : {};
        const currencies = Array.isArray(statsData?.pendingInvoicesCurrencies) ? statsData.pendingInvoicesCurrencies : Object.keys(byCurrency).sort();

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
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const pendingInvoiceLines: string[] =
    dash.pendingInvoicesCount > 0
      ? (dash.pendingInvoicesCurrencies.length ? dash.pendingInvoicesCurrencies : Object.keys(dash.pendingInvoicesByCurrency || {}).sort())
          .map(cur => `${cur} ${Number(dash.pendingInvoicesByCurrency?.[cur] || 0).toLocaleString()}`)
      : ['—'];

  const stats = [
    { title: 'Total Shipments', value: String(dash.total), icon: Package, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    { title: 'Pending Invoice', value: pendingInvoiceLines, icon: FileText, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { title: 'In Transit', value: String(dash.inTransit), icon: TrendingUp, iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600' },
    { title: 'Delivered', value: String(dash.delivered), icon: CheckCircle2, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { title: 'Custom Clearance', value: String(dash.custom), icon: AlertCircle, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { title: 'Unclaimed', value: String(dash.unclaimed), icon: MapPin, iconBg: 'bg-red-100', iconColor: 'text-red-600' },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map(({ title, value, icon: Icon, iconBg, iconColor }) => {
          const lines = Array.isArray(value) ? value : [value];
          return (
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
                  {lines.map((line, i) => (
                    <p key={i} className={i === 0
                      ? 'text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-none'
                      : 'text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1'}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { href: `/${locale}/dashboard/track`, icon: Package, title: 'Track Shipment', desc: 'Search by tracking number', bg: 'bg-blue-600' },
            { href: `/${locale}/dashboard/invoices`, icon: FileText, title: 'View Invoices', desc: 'Pending & paid invoices', bg: 'bg-amber-500' },
            { href: `/${locale}/dashboard/history`, icon: Clock, title: 'History', desc: 'Recent activity & updates', bg: 'bg-emerald-600' },
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

      {/* Shipment Tables */}
      <ShipmentsSection title="Newest Shipments" locale={locale} loading={loading} shipments={newestShipments} statusMap={statusMap} />
      <ShipmentsSection title="Recent Activity" locale={locale} loading={loading} shipments={recentShipments} statusMap={statusMap} />
    </div>
  );
}

function ShipmentsSection({ title, locale, loading, shipments, statusMap }: {
  title: string; locale: string; loading: boolean; shipments: Shipment[]; statusMap: Record<string, StatusConfig>;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/10">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        <Link href={`/${locale}/dashboard/track`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition">
          View all <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-2.5">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No shipments yet</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                  {['Shipment ID', 'Tracking #', 'Route', 'Status', 'Date'].map(h => (
                    <th key={h} className="py-2.5 px-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map((s, idx) => {
                  const key = normalizeStatusKey(s.status);
                  const adminColor = (statusMap[key]?.color || '').toLowerCase();
                  const pillClass = colorMap[adminColor] || colorMap[(s.statusColor || '').toLowerCase()] || statusPill[s.status] || statusPill.Created;
                  return (
                    <tr key={`${s.shipmentId}-${idx}`} className="border-b border-gray-50 dark:border-white/5 hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-xs">{s.shipmentId}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-xs">{s.trackingNumber}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {(s.senderCountryCode || '—').toUpperCase()} → {(s.destinationCountryCode || '—').toUpperCase()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link href={`/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition ${pillClass}`}>
                            {s.status}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50 dark:divide-white/5">
            {shipments.map((s, idx) => {
              const key = normalizeStatusKey(s.status);
              const adminColor = (statusMap[key]?.color || '').toLowerCase();
              const pillClass = colorMap[adminColor] || colorMap[(s.statusColor || '').toLowerCase()] || statusPill[s.status] || statusPill.Created;
              return (
                <div key={`${s.shipmentId}-${idx}`} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{s.shipmentId}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">{s.trackingNumber}</p>
                    </div>
                    <Link href={`/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${pillClass}`}>
                        {s.status}
                      </span>
                    </Link>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
                      {(s.senderCountryCode || '—').toUpperCase()} → {(s.destinationCountryCode || '—').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
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