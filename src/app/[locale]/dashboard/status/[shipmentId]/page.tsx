'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Truck,
  BadgeCheck,
  Clock,
  MapPin,
  Package,
  ReceiptText,
  Info,
} from 'lucide-react';

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20",
  green: "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/20",
  red: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/20",
  orange: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/20",
  purple: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/20",
  pink: "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-500/20",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/20",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/20",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20",
  rose: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/20",
  slate: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10",
  gray: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/10 dark:text-gray-200 dark:border-white/10",
};

type ShipmentStatusResponse = {
  shipmentId: string;
  trackingNumber: string;
  status: string;
  statusColor?: string;
  statusNote?: string;
  nextStep?: string;
  statusUpdatedAt?: string;
  senderCountryCode?: string;
  destinationCountryCode?: string;

  invoice?: {
    amount?: number;
    currency?: string;
    paid?: boolean;
    paidAt?: string | null;
  };
};

type StatusConfig = {
  key: string;
  label?: string;
  color?: string;
  defaultUpdate?: string;
  nextStep?: string;
  updatedAt?: string;
};

function normalizeStatus(status?: string) {
  return (status ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');
}

function formatMoney(currency: string, amount: number) {
  const cur = (currency || '').toUpperCase();
  return `${cur} ${Number(amount || 0).toLocaleString()}`.trim();
}

function getStatusBadgeClass(status: string) {
  const s = normalizeStatus(status);
  if (s === 'delivered')
    return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/20';
  if (s === 'intransit')
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/20';
  if (s === 'customclearance')
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20';
  if (s === 'unclaimed')
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/20';
  return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10';
}

export default function ShipmentStatusPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const shipmentId = decodeURIComponent((params?.shipmentId as string) || '');

  const [data, setData] = useState<ShipmentStatusResponse | null>(null);
  const [statusConfig, setStatusConfig] = useState<StatusConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        // 1) shipment
        const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { cache: 'no-store' });
        const json = await res.json();
        const shipment = res.ok ? (json?.shipment ?? null) : null;
        setData(shipment);

        // 2) status config (admin-defined)
        const key = shipment?.status ? normalizeStatus(shipment.status) : '';
        if (key) {
          const sres = await fetch(`/api/statuses?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
          const sjson = await sres.json();

          const found: StatusConfig | null =
            (sjson?.status as StatusConfig) ??
            (Array.isArray(sjson?.statuses)
              ? (sjson.statuses.find((x: any) => x?.key === key) as StatusConfig) ?? null
              : null);

          setStatusConfig(found ?? null);
        } else {
          setStatusConfig(null);
        }
      } catch {
        setData(null);
        setStatusConfig(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [shipmentId]);

  const normalized = useMemo(() => normalizeStatus(data?.status), [data?.status]);
  const isInTransit = normalized === 'intransit';

  const routeText = `${(data?.senderCountryCode || '—').toUpperCase()} → ${(data?.destinationCountryCode || '—').toUpperCase()}`;

  // ✅ show 0 properly; only show "—" when amount is missing
  const invoiceCurrency = (data?.invoice?.currency || 'USD').toUpperCase();
  const invoicePaid = Boolean(data?.invoice?.paid);
  const hasInvoiceAmount = typeof data?.invoice?.amount === 'number';
  const invoiceAmount = hasInvoiceAmount ? Number(data!.invoice!.amount) : null;
  const moneyText = hasInvoiceAmount ? formatMoney(invoiceCurrency, invoiceAmount as number) : '—';

  // base fallback text (only used if admin has nothing + shipment has nothing)
  const shipmentUpdateFallback =
    normalized === 'created'
      ? 'Shipment created successfully and is being prepared for dispatch.'
      : normalized === 'intransit'
      ? 'Shipment is in transit and moving toward the destination.'
      : normalized === 'customclearance'
      ? 'Shipment is undergoing customs clearance. Additional verification may be required.'
      : normalized === 'delivered'
      ? 'Shipment has been delivered successfully to the destination.'
      : normalized === 'unclaimed'
      ? 'Shipment is available for pickup but has not yet been claimed.'
      : `Shipment status updated: ${data?.status || '—'}.`;

  const nextStepFallback =
    normalized === 'created'
      ? 'Dispatch will be scheduled once processing is complete.'
      : normalized === 'intransit'
      ? 'Continue tracking for real-time movement updates.'
      : normalized === 'customclearance'
      ? 'We will update you once customs clearance is completed.'
      : normalized === 'delivered'
      ? 'If there are delivery concerns, please contact support with your tracking number.'
      : normalized === 'unclaimed'
      ? 'Please arrange pickup or contact support for assistance.'
      : '';

  // ✅ Priority order:
  // Shipment Update: shipment.statusNote > admin defaultUpdate > built-in fallback
 const shipmentUpdateText =
  statusConfig?.defaultUpdate && statusConfig.defaultUpdate.trim().length > 0
    ? statusConfig.defaultUpdate.trim()
    : (data?.statusNote && data.statusNote.trim().length > 0
        ? data.statusNote.trim()
        : shipmentUpdateFallback);

  // Next Step: shipment.nextStep > admin nextStep > built-in fallback
  const nextStepText =
  statusConfig?.nextStep && statusConfig.nextStep.trim().length > 0
    ? statusConfig.nextStep.trim()
    : (data?.nextStep && data.nextStep.trim().length > 0
        ? data.nextStep.trim()
        : nextStepFallback);

  // Badge color: shipment.statusColor > admin status color > built-in
 const effectiveColor = (statusConfig?.color || data?.statusColor || '').toLowerCase();
const statusBadgeClass = colorMap[effectiveColor] || getStatusBadgeClass(data?.status || '');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white/80 dark:bg-gray-900/60 backdrop-blur px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-700 dark:text-gray-200">Loading shipment…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-white via-blue-50 to-cyan-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="rounded-3xl p-6 bg-white/90 dark:bg-gray-900/70 backdrop-blur border border-gray-100 dark:border-white/10 shadow-md">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Shipment Status</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Shipment not found. Please confirm the shipment ID and try again.
            </p>

            <div className="mt-6">
              <Link
                href={`/${locale}/dashboard`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                           bg-white/70 dark:bg-white/5
                           text-gray-900 dark:text-gray-100 font-semibold
                           hover:bg-blue-600 hover:text-white hover:border-blue-600
                           dark:hover:bg-cyan-500 dark:hover:border-cyan-500 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-gradient-to-br from-white via-blue-50 to-cyan-50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-blue-700/80 dark:text-cyan-300/90">
              DASHBOARD / SHIPMENTS
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Shipment Status
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Track shipment progress and invoice/payment information.
            </p>
          </div>

          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10
                       bg-white/70 dark:bg-gray-900/40 backdrop-blur
                       text-gray-900 dark:text-gray-100 font-semibold
                       hover:bg-blue-600 hover:text-white hover:border-blue-600
                       dark:hover:bg-cyan-500 dark:hover:border-cyan-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {/* Main card */}
        <div className="mt-6 rounded-3xl border border-gray-100 dark:border-white/10 bg-white/85 dark:bg-gray-900/60 backdrop-blur shadow-lg overflow-hidden">
          {/* Top bar */}
          <div className="p-6 border-b border-gray-100 dark:border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}
                >
                  <BadgeCheck className="w-4 h-4" />
                  {data.status || '—'}
                </span>

                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border
                    ${
                      invoicePaid
                        ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/20'
                        : 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/20'
                    }`}
                >
                  <ReceiptText className="w-4 h-4" />
                  {invoicePaid ? 'Invoice Paid' : 'Invoice Pending'}
                  {hasInvoiceAmount ? ` • ${moneyText}` : ''}
                </span>
              </div>

              <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Updated:{' '}
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  {data.statusUpdatedAt ? new Date(data.statusUpdatedAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Summary */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Shipment Summary
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                    <span className="text-gray-500 dark:text-gray-400">Shipment ID</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate whitespace-nowrap">
                      {data.shipmentId}
                    </span>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                    <span className="text-gray-500 dark:text-gray-400">Tracking #</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate whitespace-nowrap">
                      {data.trackingNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] gap-3 items-center">
                    <span className="text-gray-500 dark:text-gray-400">Route</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {routeText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                {isInTransit && (
                  <Link
                    href={`/${locale}/dashboard/track?tracking=${encodeURIComponent(data.trackingNumber)}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                               bg-blue-600 text-white font-semibold shadow-sm
                               hover:bg-blue-700 hover:shadow-md hover:-translate-y-[1px]
                               active:translate-y-0 transition"
                  >
                    <Truck className="w-4 h-4" />
                    Track Shipment
                  </Link>
                )}

                <Link
                  href={`/${locale}/dashboard/invoices`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                             bg-white border border-gray-200 dark:border-white/10 dark:bg-white/5
                             text-gray-900 dark:text-gray-100 font-semibold shadow-sm
                             hover:bg-blue-600 hover:text-white hover:border-blue-600
                             dark:hover:bg-cyan-500 dark:hover:border-cyan-500
                             hover:shadow-md hover:-translate-y-[1px]
                             active:translate-y-0 transition"
                >
                  <ReceiptText className="w-4 h-4" />
                  View Invoice
                </Link>

                <Link
                  href={`/${locale}/dashboard`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                             border border-gray-200 dark:border-white/10
                             bg-white/70 dark:bg-white/5
                             text-gray-900 dark:text-gray-100 font-semibold shadow-sm
                             hover:bg-blue-600 hover:text-white hover:border-blue-600
                             dark:hover:bg-cyan-500 dark:hover:border-cyan-500
                             hover:shadow-md hover:-translate-y-[1px]
                             active:translate-y-0 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Dashboard
                </Link>
              </div>
            </div>

            {/* RIGHT: Details */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Shipment Update</p>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {shipmentUpdateText}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Invoice Information</p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice Status</p>
                    <p className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                      {invoicePaid ? 'Paid' : 'Pending'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="mt-1 font-bold text-gray-900 dark:text-gray-100">
                      {moneyText}
                    </p>
                  </div>

                  {invoicePaid && data.invoice?.paidAt && (
                    <div className="sm:col-span-2 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Recorded</p>
                      <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                        {new Date(data.invoice.paidAt).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {!invoicePaid && (
                    <div className="sm:col-span-2 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-900
                                    dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                      <p className="text-sm font-semibold">
                        Payment is required to avoid processing delays.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {nextStepText && nextStepText.trim().length > 0 && (
                <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 p-5 shadow-sm">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Next Step</p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                    {nextStepText}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-white/60 dark:bg-gray-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Keep your tracking number handy for support requests.
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {data.shipmentId}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}