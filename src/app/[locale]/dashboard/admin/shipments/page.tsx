'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Copy, Check, MoreVertical, RefreshCw, Plus,
  ChevronLeft, ChevronRight, Package,
  AlertCircle, CheckCircle2, XCircle, Loader2, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

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
  status?: string;
  statusColor?: string;
  statusNote?: string;
  createdAt?: string;
  updatedAt?: string;
  invoice?: {
    amount?: number;
    currency?: string;
    paid?: boolean;
    status?: string;
    invoiceNumber?: string;
  };
};

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
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

function fmtAmount(amount: number, currency: string) {
  return `${(currency || 'USD').toUpperCase()} ${Number(amount || 0).toFixed(2)}`;
}

function getInvoiceStatus(s: Shipment): string {
  return String(s?.invoice?.status || (s?.invoice?.paid ? 'paid' : 'unpaid')).toLowerCase();
}

function invoiceBadgeCls(status: string) {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'overdue') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-500 border-gray-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function invoiceBadgeLabel(status: string) {
  if (status === 'paid') return 'Paid';
  if (status === 'overdue') return 'Overdue';
  if (status === 'cancelled') return 'Cancelled';
  return 'Unpaid';
}

const PAGE_SIZE = 10;

export default function AdminShipmentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const focusShipment = searchParams?.get('focusShipment') || '';

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [copiedKey, setCopiedKey] = useState('');
  const [openMenuId, setOpenMenuId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [menuFlip, setMenuFlip] = useState<Record<string, boolean>>({});
const [menuPos, setMenuPos] = useState<{ top: number; right: number; rectBottom: number } | null>(null);
const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu]')) setOpenMenuId('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text); setMsgType(type);
    window.setTimeout(() => setMsg(''), 3500);
  };

  const fetchAll = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch('/api/shipments/recent', { cache: 'no-store' });
      const json = await res.json();
      setShipments(Array.isArray(json?.results) ? json.results : []);
    } catch {
      showMsg('Failed to load shipments.', 'error');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line

  const stats = useMemo(() => ({
    total: shipments.length,
    paid: shipments.filter(s => getInvoiceStatus(s) === 'paid').length,
    unpaid: shipments.filter(s => getInvoiceStatus(s) === 'unpaid').length,
    overdue: shipments.filter(s => getInvoiceStatus(s) === 'overdue').length,
  }), [shipments]);

  const totalPages = Math.ceil(shipments.length / PAGE_SIZE);

  const displayed = useMemo(() => {
    if (showAll) return shipments;
    const start = (currentPage - 1) * PAGE_SIZE;
    return shipments.slice(start, start + PAGE_SIZE);
  }, [shipments, currentPage, showAll]);

  const deleteShipment = async (shipmentId: string) => {
    setDeletingId(shipmentId);
    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);
      if (!res.ok) { showMsg(json?.error || 'Failed to delete.', 'error'); return; }
      setShipments(prev => prev.filter(s => s.shipmentId !== shipmentId));
      showMsg(`Shipment ${shipmentId} deleted.`);
    } catch {
      showMsg('Network error.', 'error');
    } finally {
      setDeletingId(''); setConfirmDeleteId('');
    }
  };

  const btnCls = 'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition';

  const PageNumbers = () => (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
        .reduce<(number | string)[]>((acc, p, i, arr) => {
          if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
          acc.push(p); return acc;
        }, [])
        .map((p, i) => typeof p === 'string'
          ? <span key={`e${i}`} className="px-1 text-gray-300 text-xs">…</span>
          : <button key={p} type="button" onClick={() => setCurrentPage(p as number)}
              className={`cursor-pointer w-8 h-8 rounded-xl text-xs font-bold transition ${
                p === currentPage ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
              }`}>{p}</button>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1400px] mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Shipments</h1>
            <p className="mt-0.5 text-sm text-gray-500">Manage shipments, statuses, invoices and tracking.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchAll(true)} disabled={refreshing}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link href={`/${locale}/dashboard/admin/shipments/new`}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[.98] transition shadow-sm">
              <Plus className="w-4 h-4" /> New Shipment
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Shipments', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', Icon: Package },
            { label: 'Paid', value: stats.paid, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', Icon: CheckCircle2 },
            { label: 'Unpaid', value: stats.unpaid, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', Icon: Clock },
            { label: 'Overdue', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', Icon: AlertCircle },
          ].map(({ label, value, color, bg, border, Icon }) => (
            <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 hover:shadow-sm transition`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Message */}
        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            msgType === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {msgType === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {msg}
          </div>
        )}

        {/* Table card */}
        <div ref={tableRef} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-500">
              {loading ? 'Loading…'
                : showAll ? `All ${shipments.length} shipments`
                : shipments.length === 0 ? 'No shipments'
                : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, shipments.length)} of ${shipments.length} shipments`}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {!showAll && totalPages > 1 && (
                <>
                  <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1} className={btnCls}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <PageNumbers />
                  <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages} className={btnCls}>
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setShowAll(v => !v); setCurrentPage(1); }}
                className={`${btnCls} ${showAll ? '!bg-blue-50 !border-blue-300 !text-blue-700' : ''}`}>
                {showAll ? 'Show Pages' : 'View All'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm font-medium">Loading shipments…</span>
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <Package className="w-10 h-10 text-gray-200" />
              <p className="text-sm font-semibold">No shipments found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1300px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {['#', 'Shipment ID', 'Tracking No.', 'Invoice No.', 'Sender', 'Receiver', 'Route', 'Status', 'Invoice', 'Date', 'Actions'].map(h => (
                      <th key={h} className={`py-3 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'} ${h === '#' ? 'w-10' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map((s, idx) => {
                    const sn = showAll ? idx + 1 : (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const invStatus = getInvoiceStatus(s);
                    const amount = Number(s?.invoice?.amount ?? 0);
                    const currency = String(s?.invoice?.currency || 'USD').toUpperCase();
                    const invNo = String(s?.invoice?.invoiceNumber || s?.invoiceNumber || '').trim();
                    const highlighted = focusShipment === s.shipmentId;

                    return (
                      <tr key={s.shipmentId}
                        className={`group transition ${highlighted ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50/80'}`}>

                        <td className="py-4 px-4 text-xs font-semibold text-gray-300">{sn}</td>

                        {/* Shipment ID */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-xs font-mono">{s.shipmentId}</span>
                            <button type="button"
                              onClick={async () => { await copyToClipboard(s.shipmentId); setCopiedKey(`ship-${s.shipmentId}`); setTimeout(() => setCopiedKey(''), 1200); }}
                              className="cursor-pointer opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition">
                              {copiedKey === `ship-${s.shipmentId}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                            </button>
                          </div>
                        </td>

                        {/* Tracking */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-700 font-mono">{s.trackingNumber || '—'}</span>
                            {s.trackingNumber && (
                              <button type="button"
                                onClick={async () => { await copyToClipboard(s.trackingNumber); setCopiedKey(`track-${s.shipmentId}`); setTimeout(() => setCopiedKey(''), 1200); }}
                                className="cursor-pointer opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition">
                                {copiedKey === `track-${s.shipmentId}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Invoice No */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {invNo ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-gray-700 font-mono">{invNo}</span>
                              <button type="button"
                                onClick={async () => { await copyToClipboard(invNo); setCopiedKey(`inv-${s.shipmentId}`); setTimeout(() => setCopiedKey(''), 1200); }}
                                className="cursor-pointer opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-6 h-6 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition">
                                {copiedKey === `inv-${s.shipmentId}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
                              </button>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>

                        {/* Sender */}
                        <td className="py-4 px-4 whitespace-nowrap max-w-[150px]">
                          <p className="text-xs font-semibold text-gray-900 truncate">{s.senderName || '—'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{s.senderEmail || ''}</p>
                        </td>

                        {/* Receiver */}
                        <td className="py-4 px-4 whitespace-nowrap max-w-[150px]">
                          <p className="text-xs font-semibold text-gray-900 truncate">{s.receiverName || '—'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{s.receiverEmail || ''}</p>
                        </td>

                        {/* Route */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg px-2.5 py-1">
                            {(s.senderCountryCode || '—').toUpperCase()}
                            <span className="text-gray-300 font-normal mx-0.5">→</span>
                            {(s.destinationCountryCode || '—').toUpperCase()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border"
                            style={{
                              backgroundColor: `${s.statusColor || '#e5e7eb'}22`,
                              color: s.statusColor || '#374151',
                              borderColor: `${s.statusColor || '#d1d5db'}55`,
                            }}>
                            {s.status || '—'}
                          </span>
                        </td>

                        {/* Invoice */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-900">{fmtAmount(amount, currency)}</p>
                          <span className={`mt-1 inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${invoiceBadgeCls(invStatus)}`}>
                            {invoiceBadgeLabel(invStatus)}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                          {fmtDate(s.createdAt)}
                        </td>

                        {/* Actions */}
<td className="py-4 px-4 whitespace-nowrap text-right">
  <div className="relative inline-block" data-menu>
    <button type="button"
      onClick={(e) => {
  if (openMenuId === s.shipmentId) { setOpenMenuId(''); return; }
  const rect = e.currentTarget.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  setMenuFlip(prev => ({ ...prev, [s.shipmentId]: spaceBelow < 260 }));
  setMenuPos({ top: rect.bottom + window.scrollY, right: window.innerWidth - rect.right, rectBottom: rect.bottom });
  setOpenMenuId(s.shipmentId);
}}
      className="cursor-pointer inline-flex items-center justify-center h-8 w-8 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition shadow-sm">
      <MoreVertical className="w-4 h-4" />
    </button>

    {openMenuId === s.shipmentId && (
      <div
  className="fixed z-50 w-52 rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
  style={menuPos ? {
    top: menuFlip[s.shipmentId]
      ? menuPos.rectBottom - 260 + window.scrollY
      : menuPos.top + 8,
    right: menuPos.right,
  } : {}}
  data-menu>
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{s.shipmentId}</p>
                                </div>
                                <div className="py-1">
                                  <Link
                                    href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/edit`}
                                    onClick={() => setOpenMenuId('')}
                                    className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                    Edit Shipment
                                  </Link>
                                  <Link
                                    href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/tracking`}
                                    onClick={() => setOpenMenuId('')}
                                    className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                    <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                                    Tracking Update
                                  </Link>
                                  <Link
                                    href={`/${locale}/dashboard/admin/shipments/${encodeURIComponent(s.shipmentId)}/send-email`}
                                    onClick={() => setOpenMenuId('')}
                                    className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                    Send Email
                                  </Link>
                                  <Link
                                    href={`/${locale}/track/${encodeURIComponent(s.trackingNumber || s.shipmentId)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setOpenMenuId('')}
                                    className="cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    View Track Page
                                  </Link>
                                </div>
                                <div className="py-1 border-t border-gray-100">
                                  <button type="button"
                                    onClick={() => { setOpenMenuId(''); setConfirmDeleteId(s.shipmentId); }}
                                    disabled={deletingId === s.shipmentId}
                                    className="cursor-pointer flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50">
                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    {deletingId === s.shipmentId ? 'Deleting…' : 'Delete Shipment'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
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
            <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-gray-400 font-medium">
                Page <span className="font-bold text-gray-700">{currentPage}</span> of <span className="font-bold text-gray-700">{totalPages}</span>
                <span className="mx-2 text-gray-200">·</span>
                <span className="font-bold text-gray-700">{shipments.length}</span> total shipments
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={btnCls}>First</button>
                <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={btnCls}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <PageNumbers />
                <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={btnCls}>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={btnCls}>Last</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Delete shipment?</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              You are about to permanently delete shipment{' '}
              <span className="font-bold text-gray-800">{confirmDeleteId}</span>.
              This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmDeleteId('')}
                className="cursor-pointer px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="button" onClick={() => deleteShipment(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="cursor-pointer px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition flex items-center gap-2">
                {deletingId === confirmDeleteId
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}