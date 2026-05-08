"use client";

import { useEffect, useState } from "react";
import {
  Loader2, RefreshCw, CheckCircle2, XCircle, Eye,
  FileText, Clock, X, ZoomIn,
} from "lucide-react";
import { createPortal } from "react-dom";

type Receipt = {
  _id: string;
  shipmentId: string;
  paymentMethod: string;
  receiptUrl: string;
  notes: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
  rejectedReason?: string | null;
};

// ─── Image Lightbox ──────────────────────────────────────────────
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm overflow-auto"
      onClick={onClose}>
      <button type="button" onClick={onClose}
        className="fixed top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition z-10">
        <X size={20} />
      </button>
      <div className="min-h-full flex items-center justify-center p-4">
        <img src={src} alt="Preview"
          onClick={e => e.stopPropagation()}
          className="max-w-full h-auto rounded-lg shadow-2xl" />
      </div>
    </div>,
    document.body
  );
}

export default function AdminPaymentReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('pending');
  const [viewing, setViewing] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-receipts', { cache: 'no-store' });
      const json = await res.json();
      setReceipts(json.receipts || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const closeModal = () => {
    setViewing(null);
    setRejectReason('');
  };

  const handleAction = async (id: string, action: 'confirm' | 'reject', reason?: string) => {
    setBusy(id);
    try {
      const res = await fetch('/api/payment-receipts', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectedReason: reason }),
      });
      if (res.ok) {
        await load();
        closeModal();
      }
    } finally { setBusy(null); }
  };

  // Lock body scroll while modal open
  useEffect(() => {
    if (viewing) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [viewing]);

  const filtered = filter === 'all' ? receipts : receipts.filter(r => r.status === filter);

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Payment Receipts</h1>
          <p className="mt-0.5 text-sm text-gray-500">Review and verify payment receipts uploaded by customers.</p>
        </div>
        <button onClick={load}
          className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['pending', 'confirmed', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1.5 opacity-60">
                ({receipts.filter(r => r.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500">No {filter !== 'all' ? filter : ''} receipts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r._id}
              className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 hover:shadow-sm transition">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <img src={r.receiptUrl} alt="receipt" className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{r.shipmentId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-semibold">{r.submittedByName || r.submittedBy}</span> — {r.paymentMethod}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(r.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    r.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-red-100 text-red-700'
                  }`}>{r.status}</span>
                  <button onClick={() => setViewing(r)}
                    className="cursor-pointer text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                    <Eye size={11} /> Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review modal — compact, scrollable, fixed-height with sticky header */}
      {viewing && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeModal}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">

            {/* Sticky header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">Review Receipt</h3>
                <p className="text-[11px] text-gray-500 truncate">{viewing.shipmentId}</p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer shrink-0">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

              {/* Compact info grid */}
              <div className="rounded-xl border border-gray-100 dark:border-white/10 px-3 py-2 text-xs space-y-1.5">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">Customer</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right truncate">{viewing.submittedByName || viewing.submittedBy}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">Method</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right truncate">{viewing.paymentMethod}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500 shrink-0">Submitted</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-right">
                    {new Date(viewing.submittedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              </div>

              {/* Receipt image — click to zoom (no new tab) */}
              <button type="button" onClick={() => setLightboxSrc(viewing.receiptUrl)}
                className="block w-full rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden hover:opacity-95 transition cursor-zoom-in group">
                <div className="relative">
                  <img src={viewing.receiptUrl} alt="Receipt" className="w-full h-auto max-h-72 object-contain bg-gray-50 dark:bg-white/5" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
                    <div className="opacity-0 group-hover:opacity-100 transition w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <ZoomIn size={16} className="text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-white/5 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                  <ZoomIn size={10} /> Click to zoom
                </div>
              </button>

              {viewing.notes && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 mb-0.5">Customer notes</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">{viewing.notes}</p>
                </div>
              )}

              {viewing.status === 'pending' && (
                <div className="border-t border-gray-100 dark:border-white/10 pt-3">
                  <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Rejection Reason <span className="font-normal text-gray-400">(optional — only if rejecting)</span>
                  </label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. The amount on the receipt does not match the invoice."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm resize-none focus:outline-none" />
                  <p className="text-[10px] text-gray-400 mt-1">
                    The reason (if provided) will be included in the cancellation email sent to the customer.
                  </p>
                </div>
              )}

              {viewing.status === 'rejected' && viewing.rejectedReason && (
                <div className="rounded-xl bg-red-50 dark:bg-red-500/10 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase text-red-700 dark:text-red-300 mb-0.5">Rejection reason</p>
                  <p className="text-xs text-red-700 dark:text-red-300">{viewing.rejectedReason}</p>
                </div>
              )}
            </div>

            {/* Sticky footer (only for pending) */}
            {viewing.status === 'pending' && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-white/10 shrink-0 flex gap-2">
                <button onClick={() => handleAction(viewing._id, 'reject', rejectReason)}
                  disabled={busy === viewing._id}
                  className="flex-1 cursor-pointer py-2.5 rounded-xl border border-red-200 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition disabled:opacity-60">
                  {busy === viewing._id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Reject'}
                </button>
                <button onClick={() => handleAction(viewing._id, 'confirm')}
                  disabled={busy === viewing._id}
                  className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-60">
                  {busy === viewing._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Image lightbox */}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc('')} />}
    </div>
  );
}