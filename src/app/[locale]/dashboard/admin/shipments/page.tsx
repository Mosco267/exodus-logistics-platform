'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Copy, Check, MoreVertical, RefreshCw, Plus, ChevronLeft,
  ChevronRight, Search, X, Package, TrendingUp, Clock,
  AlertCircle, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  invoiceNumber?: string;
  senderName?: string;
  senderEmail?: string;
  receiverName?: string;
  receiverEmail?: string;
  senderCountryCode?: string;
  destinationCountryCode?: string;
  senderCountry?: string;
  receiverCountry?: string;
  status?: string;
  statusColor?: string;
  statusNote?: string;
  invoice?: {
    amount?: number;
    currency?: string;
    paid?: boolean;
    paidAt?: string | null;
    status?: string;
    invoiceNumber?: string;
  };
  createdAt?: string;
};

type StatusDoc = { key: string; label: string; color: string; };

const normalizeKey = (v?: string) =>
  (v ?? '').toLowerCase().trim().replace(/[\s_-]+/g, '');

async function copyToClipboard(text: string) {
  const v = String(text || '').trim();
  if (!v) return;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(v);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = v;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(d);
}

function fmtAmount(amount: number, currency: string) {
  const c = (currency || 'USD').toUpperCase();
  return `${c} ${Number(amount || 0).toFixed(2)}`;
}

const PAGE_SIZE = 10;

export default function AdminShipmentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  const [copiedKey, setCopiedKey] = useState('');
  const [openMenuId, setOpenMenuId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statuses, setStatuses] = useState<StatusDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  

  // Close menu on outside click
 useEffect(() => {
  if (!openMenuId) return;
  function handleClick() { setOpenMenuId(''); }
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [openMenuId]);

  // Focus shipment from URL param
  const focusShipment = searchParams?.get('focusShipment') || '';

  const statusByKey = useMemo(() => {
    const m: Record<string, StatusDoc> = {};
    for (const s of statuses) m[normalizeKey(s.key)] = s;
    return m;
  }, [statuses]);

  const fetchAll = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setMsg('');
    try {
      const [shipRes, statusRes] = await Promise.all([
        fetch('/api/shipments/recent', { cache: 'no-store' }),
        fetch('/api/statuses', { cache: 'no-store' }),
      ]);
      const shipJson = await shipRes.json();
      const statusJson = await statusRes.json();
      const list: Shipment[] = Array.isArray(shipJson?.results) ? shipJson.results : [];
      setShipments(list);
      setStatuses(Array.isArray(statusJson?.statuses) ? statusJson.statuses : []);
    } catch {
      setMsg('Failed to load shipments.');
      setMsgType('error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  // Stats
  const stats = useMemo(() => {
    const total = shipments.length;
    const paid = shipments.filter(s => s.invoice?.status === 'paid' || s.invoice?.paid).length;
    const unpaid = shipments.filter(s => {
      const st = String(s.invoice?.status || '').toLowerCase();
      return st === 'unpaid' || (!s.invoice?.paid && st !== 'overdue' && st !== 'cancelled');
    }).length;
    const overdue = shipments.filter(s => String(s.invoice?.status || '').toLowerCase() === 'overdue').length;
    return { total, paid, unpaid, overdue };
  }, [shipments]);

  // Search + filter
  const filtered = useMemo(() => {
    if (!search.trim()) return shipments;
    const q = search.toLowerCase().trim();
    return shipments.filter(s =>
      s.shipmentId?.toLowerCase().includes(q) ||
      s.trackingNumber?.toLowerCase().includes(q) ||
      s.senderName?.toLowerCase().includes(q) ||
      s.receiverName?.toLowerCase().includes(q) ||
      s.senderEmail?.toLowerCase().includes(q) ||
      s.receiverEmail?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q) ||
      String(s.invoice?.invoiceNumber || s.invoiceNumber || '').toLowerCase().includes(q)
    );
  }, [shipments, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const displayed = useMemo(() => {
    if (showAll) return filtered;
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage, showAll]);

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [search]);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text);
    setMsgType(type);
    window.setTimeout(() => setMsg(''), 3000);
  };

  const deleteShipment = async (shipmentId: string) => {
    setDeletingId(shipmentId);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok) { showMsg(json?.error || 'Failed to delete.', 'error'); return; }
      setShipments(prev => prev.filter(s => s.shipmentId !== shipmentId));
      showMsg(`Shipment ${shipmentId} deleted.`);
    } catch {
      showMsg('Network error while deleting.', 'error');
    } finally {
      setDeletingId('');
      setConfirmDeleteId('');
    }
  };

  const invoiceBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'overdue') return 'bg-red-50 text-red-700 border-red-200';
    if (s === 'cancelled') return 'bg-gray-100 text-gray-600 border-gray-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const invoiceLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'Paid';
    if (s === 'overdue') return 'Overdue';
    if (s === 'cancelled') return 'Cancelled';
    return 'Unpaid';
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* ── PAGE HEADER ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Shipments</h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Manage all shipments, statuses, invoices and tracking.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <Link
                href={`/${locale}/dashboard/admin/shipments/new`}
                className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[.98] transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Shipment
              </Link>
            </div>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Shipments', value: stats.total, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Paid', value: stats.paid, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Unpaid', value: stats.unpaid, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Overdue', value: stats.overdue, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
              <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── TABLE CARD ── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Table toolbar */}
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search shipments…"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition placeholder:text-gray-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-xs text-gray-500 hidden sm:block">
                {showAll
                  ? `${filtered.length} shipments`
                  : `${Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </span>
              {!showAll && totalPages > 1 && (
                <>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) => p === '...'
                        ? <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-xs">…</span>
                        : (
                          <button key={p} type="button" onClick={() => setCurrentPage(p as number)}
                            className={`cursor-pointer w-8 h-8 rounded-lg text-xs font-bold transition ${
                              p === currentPage
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                            }`}>
                            {p}
                          </button>
                        )
                      )}
                  </div>
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setShowAll(v => !v); setCurrentPage(1); }}
                className="cursor-pointer px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition">
                {showAll ? 'Show Pages' : 'View All'}
              </button>
            </div>
          </div>

          {/* Message banner */}
          {msg && (
            <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
              msgType === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {msgType === 'error'
                ? <XCircle className="w-4 h-4 shrink-0" />
                : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {msg}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Loading shipments…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Package className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-semibold">
                {search ? 'No shipments match your search.' : 'No shipments found.'}
              </p>
              {search && (
                <button type="button" onClick={() => setSearch('')}
                  className="cursor-pointer text-xs text-blue-600 hover:underline font-semibold">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide w-10">#</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Shipment ID</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Tracking / Invoice</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Sender</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Receiver</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Route</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Invoice</th>
                    <th className="py-3 px-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Created</th>
                    <th className="py-3 px-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((s, idx) => {
                    const serialNumber = showAll
                      ? idx + 1
                      : (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const invoiceStatus = String(s?.invoice?.status || (s?.invoice?.paid ? 'paid' : 'unpaid')).toLowerCase();
                    const amount = Number(s?.invoice?.amount ?? 0);
                    const currency = String(s?.invoice?.currency || 'USD').toUpperCase();
                    const invNo = String(s?.invoiceNumber || s?.invoice?.invoiceNumber || '').trim();
                    const isHighlighted = focusShipment && s.shipmentId === focusShipment;

                    return (
                      <tr
                        key={s.shipmentId}
                        className={`group hover:bg-blue-50/40 transition ${isHighlighted ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
                      >
                        {/* S/N */}
                        <td className="py-3.5 px-4 text-xs font-semibold text-gray-300 whitespace-nowrap">
                          {serialNumber}
                        </td>

                        {/* Shipment ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-xs">{s.shipmentId}</span>
                            <button type="button"
                              onClick={async () => {
                                await copyToClipboard(s.shipmentId);
                                setCopiedKey(`ship-${s.shipmentId}`);
                                setTimeout(() => setCopiedKey(''), 1200);
                              }}
                              className="cursor-pointer opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-gray-200 p-1 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-600 transition">
                              {copiedKey === `ship-${s.shipmentId}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        {/* Tracking + Invoice */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-800 text-xs">{s.trackingNumber}</span>
                            <button type="button"
                              onClick={async () => {
                                await copyToClipboard(s.trackingNumber);
                                setCopiedKey(`track-${s.shipmentId}`);
                                setTimeout(() => setCopiedKey(''), 1200);
                              }}
                              className="cursor-pointer opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-gray-200 p-1 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-600 transition">
                              {copiedKey === `track-${s.shipmentId}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {invNo && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] text-gray-400">{invNo}</span>
                              <button type="button"
                                onClick={async () => {
                                  await copyToClipboard(invNo);
                                  setCopiedKey(`inv-${s.shipmentId}`);
                                  setTimeout(() => setCopiedKey(''), 1200);
                                }}
                                className="cursor-pointer opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-lg border border-gray-200 p-0.5 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-600 transition">
                                {copiedKey === `inv-${s.shipmentId}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Sender */}
                        <td className="py-3.5 px-4 whitespace-nowrap max-w-[160px]">
                          <p className="font-semibold text-gray-900 text-xs truncate">{s.senderName || '—'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{s.senderEmail || '—'}</p>
                        </td>

                        {/* Receiver */}
                        <td className="py-3.5 px-4 whitespace-nowrap max-w-[160px]">
                          <p className="font-semibold text-gray-900 text-xs truncate">{s.receiverName || '—'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{s.receiverEmail || '—'}</p>
                        </td>

                        {/* Route */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg px-2.5 py-1">
                            <span>{(s.senderCountryCode || '—').toUpperCase()}</span>
                            <span className="text-gray-400">→</span>
                            <span>{(s.destinationCountryCode || '—').toUpperCase()}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border"
                            style={{
                              backgroundColor: `${s.statusColor || '#e5e7eb'}22`,
                              color: s.statusColor || '#374151',
                              borderColor: `${s.statusColor || '#d1d5db'}55`,
                            }}
                          >
                            {s.status || '—'}
                          </span>
                          {s.statusNote && (
                            <p className="mt-1 text-[10px] text-gray-400 max-w-[140px] truncate">{s.statusNote}</p>
                          )}
                        </td>

                        {/* Invoice */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-900">{fmtAmount(amount, currency)}</p>
                          <span className={`mt-1 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${invoiceBadge(invoiceStatus)}`}>
                            {invoiceLabel(invoiceStatus)}
                          </span>
                        </td>

                        {/* Created */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                          {fmtDate(s.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(prev => prev === s.shipmentId ? '' : s.shipmentId)}
                            className="cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition shadow-sm"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === s.shipmentId && (
                            <div className="absolute right-4 top-12 z-30 w-48 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden ring-1 ring-black/5">
                              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{s.shipmentId}</p>
                              </div>
                              <div className="py-1">
                                <Link
                                  href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/edit`}
                                  onClick={() => setOpenMenuId('')}
                                  className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  Edit Shipment
                                </Link>
                                <Link
                                  href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/tracking`}
                                  onClick={() => setOpenMenuId('')}
                                  className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                  Tracking
                                </Link>
                                <Link
                                  href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/send-email`}
                                  onClick={() => setOpenMenuId('')}
                                  className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                  Send Email
                                </Link>
                                <Link
                                  href={`/${locale}/track/${encodeURIComponent(s.trackingNumber || s.shipmentId)}`}
                                  target="_blank"
                                  onClick={() => setOpenMenuId('')}
                                  className="cursor-pointer flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  View Tracking Page
                                </Link>
                              </div>
                              <div className="py-1 border-t border-gray-100">
                                <button
                                  type="button"
                                  onClick={() => { setOpenMenuId(''); setConfirmDeleteId(s.shipmentId); }}
                                  disabled={deletingId === s.shipmentId}
                                  className="cursor-pointer flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  {deletingId === s.shipmentId ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom pagination */}
          {!loading && !showAll && totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-400 font-medium">
                Showing <span className="font-bold text-gray-600">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-gray-600">{filtered.length}</span> shipments
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => p === '...'
                      ? <span key={`ell-${i}`} className="px-1 text-gray-300 text-xs">…</span>
                      : (
                        <button key={p} type="button" onClick={() => setCurrentPage(p as number)}
                          className={`cursor-pointer w-8 h-8 rounded-xl text-xs font-bold transition ${
                            p === currentPage
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                          }`}>
                          {p}
                        </button>
                      )
                    )}
                </div>
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Delete shipment?</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              You are about to permanently delete shipment{' '}
              <span className="font-bold text-gray-800">{confirmDeleteId}</span>.
              This action cannot be undone and the shipment will no longer be trackable.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId('')}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteShipment(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="cursor-pointer px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2"
              >
                {deletingId === confirmDeleteId
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  : 'Delete Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}