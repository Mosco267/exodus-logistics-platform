'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowUpRight, Package, FileText, Clock } from 'lucide-react';

type ShipmentStatus =
  | 'Delivered'
  | 'In Transit'
  | 'Custom Clearance'
  | 'Unclaimed'
  | 'Created';

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
  Delivered: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300',
  'In Transit': 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  'Custom Clearance': 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  Unclaimed: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  Created: 'bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200',
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  green: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  pink: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  slate: "bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200",
  gray: "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-200",
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
    total: 0,
    inTransit: 0,
    delivered: 0,
    custom: 0,
    unclaimed: 0,
    pendingInvoicesCount: 0,
    pendingInvoicesByCurrency: {},
    pendingInvoicesCurrencies: [],
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
          fetch('/api/shipments/recent', { cache: 'no-store' }),   // recent activity (updatedAt)
          fetch('/api/shipments/newest', { cache: 'no-store' }),   // newest (createdAt)
          fetch('/api/dashboard/stats', { cache: 'no-store' }),
          fetch('/api/statuses', { cache: 'no-store' }),
        ]);

        const recentData = await recentRes.json();
        const newestData = await newestRes.json();
        const statsData = await statsRes.json();
        const statusData = await statusRes.json();

        setRecentShipments(Array.isArray(recentData?.results) ? recentData.results : []);
        setNewestShipments(Array.isArray(newestData?.results) ? newestData.results : []);

        const byCurrency =
          typeof statsData?.pendingInvoicesByCurrency === 'object' && statsData?.pendingInvoicesByCurrency
            ? statsData.pendingInvoicesByCurrency
            : {};

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
        setRecentShipments([]);
        setNewestShipments([]);
        setStatusList([]);
        setDash({
          total: 0,
          inTransit: 0,
          delivered: 0,
          custom: 0,
          unclaimed: 0,
          pendingInvoicesCount: 0,
          pendingInvoicesByCurrency: {},
          pendingInvoicesCurrencies: [],
        });
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
        ).map((cur) => `${cur} ${Number(dash.pendingInvoicesByCurrency?.[cur] || 0).toLocaleString()}`)
      : ['—'];

  return (
    <div className="flex flex-col gap-6">
      {/* Top row: Overview + Quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Shipments" value={String(dash.total)} />
          <StatCard title="Pending Invoice" value={pendingInvoiceLines} />
          <StatCard title="In Transit" value={String(dash.inTransit)} />
          <StatCard title="Delivered" value={String(dash.delivered)} />
          <StatCard title="Custom Clearance" value={String(dash.custom)} />
          <StatCard title="Unclaimed" value={String(dash.unclaimed)} />
        </div>

        <div className="rounded-2xl p-6 shadow-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Jump to common tasks.</p>

          <div className="mt-5 grid gap-3">
            <ActionLink
              href={`/${locale}/dashboard/track`}
              icon={<Package className="w-5 h-5" />}
              title="Track a shipment"
              desc="Search by tracking number"
            />
            <ActionLink
              href={`/${locale}/dashboard/invoices`}
              icon={<FileText className="w-5 h-5" />}
              title="View invoices"
              desc="See pending & paid invoices"
            />
            <ActionLink
              href={`/${locale}/dashboard/history`}
              icon={<Clock className="w-5 h-5" />}
              title="History"
              desc="Recent activity and updates"
            />
          </div>
        </div>
      </div>

      {/* TABLE 1: Newest Shipments */}
      <ShipmentsTable
        title="Newest Shipments"
        locale={locale}
        loading={loading}
        shipments={newestShipments}
        statusMap={statusMap}
      />

      {/* TABLE 2: Recent Activity */}
      <ShipmentsTable
        title="Recent Activity"
        locale={locale}
        loading={loading}
        shipments={recentShipments}
        statusMap={statusMap}
      />
    </div>
  );
}

function ShipmentsTable({
  title,
  locale,
  loading,
  shipments,
  statusMap,
}: {
  title: string;
  locale: string;
  loading: boolean;
  shipments: Shipment[];
  statusMap: Record<string, StatusConfig>;
}) {
  return (
    <div className="rounded-2xl shadow-md p-6 overflow-x-auto bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>

        <Link
          href={`/${locale}/dashboard/track`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-cyan-300 dark:hover:text-cyan-200 transition cursor-pointer"
        >
          View all <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading shipments…</div>
      ) : (
        <table className="mt-4 w-full text-sm border-collapse min-w-[860px]">
          <colgroup>
            <col className="w-[240px]" />
            <col className="w-[220px]" />
            <col className="w-[140px]" />
            <col className="w-[160px]" />
            <col className="w-[140px]" />
          </colgroup>

          <thead className="border-b border-gray-200 dark:border-white/10">
            <tr className="text-gray-700 dark:text-gray-200">
              <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Shipment ID</th>
              <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Tracking #</th>
              <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Route</th>
              <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Status</th>
              <th className="py-3 px-4 text-left font-semibold whitespace-nowrap">Created</th>
            </tr>
          </thead>

          <tbody className="text-gray-800 dark:text-gray-100">
            {shipments.map((s, idx) => {
              const statusHref = `/${locale}/dashboard/status/${encodeURIComponent(s.shipmentId)}`;

              const key = normalizeStatusKey(s.status);
              const adminColor = (statusMap[key]?.color || '').toLowerCase();
              const fallbackColor = (s.statusColor || '').toLowerCase();
              const pillClass =
                colorMap[adminColor] ||
                colorMap[fallbackColor] ||
                statusPill[s.status] ||
                statusPill.Created;

              return (
                <tr
                  key={`${s.shipmentId}-${idx}`}
                  className="border-b border-gray-100 dark:border-white/10 hover:bg-blue-50/70 dark:hover:bg-white/5 transition"
                >
                  <td className="py-3 px-4 font-semibold whitespace-nowrap align-middle">{s.shipmentId}</td>

                  <td className="py-3 px-4 whitespace-nowrap align-middle">{s.trackingNumber}</td>

                  <td className="py-3 px-4 whitespace-nowrap align-middle">
                    {(s.senderCountryCode || '—').toUpperCase()} → {(s.destinationCountryCode || '—').toUpperCase()}
                  </td>

                  <td className="py-3 pl-2 pr-4 whitespace-nowrap align-middle text-left">
                    <Link href={statusHref} className="inline-flex">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold cursor-pointer
                        ${pillClass}
                        transition
                        hover:bg-blue-600 hover:text-white dark:hover:bg-cyan-500`}
                      >
                        {s.status}
                      </span>
                    </Link>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap align-middle text-gray-600 dark:text-gray-300">
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              );
            })}

            {shipments.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-sm text-gray-600 dark:text-gray-300">
                  No shipments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | string[] }) {
  const lines = Array.isArray(value) ? value : [value];

  return (
    <div className="rounded-2xl p-6 shadow-md border border-gray-100 bg-white dark:bg-gray-900 dark:border-white/10">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>

      <div className="mt-2 space-y-1">
        {lines.map((line, i) => (
          <p
            key={`${title}-${i}`}
            className={
              i === 0
                ? "text-3xl font-extrabold text-gray-900 dark:text-gray-100"
                : "text-base font-semibold text-gray-700 dark:text-gray-300"
            }
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 opacity-90" />
    </div>
  );
}

function ActionLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:bg-white hover:shadow-sm transition cursor-pointer
               dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10"
    >
      <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center dark:bg-white/10 dark:border-white/10">
        <span className="text-blue-700 dark:text-cyan-300">{icon}</span>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{desc}</p>
      </div>

      <ArrowUpRight className="ml-auto w-4 h-4 text-gray-400 group-hover:text-blue-700 dark:group-hover:text-cyan-300 transition" />
    </Link>
  );
}