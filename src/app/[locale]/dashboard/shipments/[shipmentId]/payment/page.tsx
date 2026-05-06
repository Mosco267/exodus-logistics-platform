// src/app/[locale]/dashboard/shipments/[shipmentId]/payment/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft, CheckCircle2, Loader2, Upload, Copy, AlertCircle,
  Clock, CreditCard, ChevronDown, Send,
} from 'lucide-react';
import { createPortal } from 'react-dom';

type Shipment = {
  shipmentId: string;
  trackingNumber: string;
  senderName: string;
  senderCountry?: string;
  senderCountryCode?: string;
  senderState?: string;
  senderCity?: string;
  receiverName: string;
  receiverCountry?: string;
  receiverCountryCode?: string;
  receiverState?: string;
  receiverCity?: string;
  shipmentScope: string;
  invoice: {
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: string;
    paid: boolean;
  };
};

type CryptoWallet = { enabled: boolean; address: string; qrImageUrl: string; network?: string };
type PaymentSettings = {
  crypto: { bitcoin: CryptoWallet; ethereum: CryptoWallet; usdt: CryptoWallet };
  zelle: { enabled: boolean; phone: string; email: string; holderName: string };
  bankTransfer: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; routingNumber: string; swiftCode: string; iban: string; instructions: string };
  paypal: { enabled: boolean; email: string; link: string; useLink: boolean };
  cashApp: { enabled: boolean; cashtag: string; qrImageUrl: string };
  others: { enabled: boolean; instructions: string };
};

type PaymentMethod =
  | 'bitcoin' | 'ethereum' | 'usdt'
  | 'zelle' | 'bank_transfer' | 'paypal' | 'cash_app'
  | 'card' | 'others';

const COUNTDOWN: Record<string, string> = {
  bitcoin: '10–30 minutes',
  ethereum: '5–20 minutes',
  usdt: '5–20 minutes',
  zelle: '10–30 minutes',
  bank_transfer: '1–2 working days',
  paypal: '10–30 minutes',
  cash_app: '10–30 minutes',
  card: 'Instant',
  others: 'Varies by method',
};

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-400/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition cursor-pointer shrink-0">
      <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold text-gray-900 dark:text-white text-right break-all">{value}</span>
        {value && <CopyButton text={value} />}
      </div>
    </div>
  );
}

function ReceiptUpload({ onUpload, uploaded }: { onUpload: (url: string) => void; uploaded: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) onUpload(data.url);
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="border-t border-gray-100 dark:border-white/10 pt-4">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Upload Payment Receipt</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">After making payment, upload a screenshot or photo of your receipt. Your shipment will be confirmed once we verify it.</p>
        {previewUrl && (
          <img src={previewUrl} alt="Receipt preview" className="w-32 h-32 object-cover rounded-xl border border-gray-200 dark:border-white/10 mb-3" />
        )}
        <button type="button" onClick={() => ref.current?.click()}
          disabled={uploading || uploaded}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition disabled:opacity-60">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : uploaded ? <CheckCircle2 size={14} className="text-green-500" /> : <Upload size={14} />}
          {uploading ? 'Uploading...' : uploaded ? 'Receipt Uploaded ✓' : 'Upload Receipt'}
        </button>
        <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const shipmentId = params?.shipmentId as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  useEffect(() => {
    const map: Record<string, string> = {
      default: 'linear-gradient(135deg, #0b3aa4, #0e7490)',
      ocean: 'linear-gradient(135deg, #0e7490, #06b6d4)',
      sunset: 'linear-gradient(135deg, #0b3aa4, #f97316)',
      arctic: 'linear-gradient(135deg, #0284c7, #bae6fd)',
      midnight: 'linear-gradient(135deg, #0f172a, #0e7490)',
    };
    const apply = () => { const c = localStorage.getItem('exodus_theme_cache'); if (c && map[c]) setAccent(map[c]); };
    apply();
    window.addEventListener('storage', apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<'bitcoin' | 'ethereum' | 'usdt'>('bitcoin');

  // Card fake processing
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState(false);

  // Others
  const [othersMethod, setOthersMethod] = useState('');
  const [othersMessage, setOthersMessage] = useState('');
  const [othersSent, setOthersSent] = useState(false);
  const [othersSending, setOthersSending] = useState(false);
  const [othersMessageId, setOthersMessageId] = useState('');

  // Receipt upload
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  // Success modal
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [shipRes, payRes] = await Promise.all([
          fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`),
          fetch('/api/payment-settings'),
        ]);
        const shipData = await shipRes.json();
        const payData = await payRes.json();
        setShipment(shipData.shipment);
        setPaySettings(payData.settings);
      } catch {}
      finally { setLoading(false); }
    };
    if (shipmentId) load();
  }, [shipmentId]);

  const handleCardSubmit = async () => {
    setCardProcessing(true); setCardError(false);
    await new Promise(r => setTimeout(r, 3500));
    setCardProcessing(false); setCardError(true);
  };

  const handleOthersSubmit = async () => {
    if (!othersMethod.trim() || !othersMessage.trim()) return;
    setOthersSending(true);
    try {
      const res = await fetch('/api/admin/payment-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId, paymentMethod: othersMethod, message: othersMessage }),
      });
      const data = await res.json();
      setOthersMessageId(data.id || '');
      setOthersSent(true);
    } catch {}
    finally { setOthersSending(false); }
  };

  const handleReceiptUpload = async (url: string) => {
    setReceiptUrl(url);
    setReceiptUploaded(true);
  };

  const handleSubmitReceipt = async () => {
    if (!receiptUrl) return;
    setSubmittingReceipt(true);
    try {
      // For crypto/zelle/bank/paypal/cashapp — update shipment invoice to pending
      await fetch(`/api/shipments/${encodeURIComponent(shipmentId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice: { status: 'unpaid', paymentMethod: selectedMethod },
        }),
      });
      // Also notify admin
      await fetch('/api/admin/payment-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId,
          paymentMethod: selectedMethod,
          message: `Receipt uploaded for ${selectedMethod} payment. Please verify and confirm.`,
        }),
      });
      setReceiptSubmitted(true);
      setShowDone(true);
    } catch {}
    finally { setSubmittingReceipt(false); }
  };

  const handleOthersReceiptUpload = async (url: string) => {
    setReceiptUrl(url);
    setReceiptUploaded(true);
    // Update the message with receipt
    if (othersMessageId) {
      await fetch('/api/admin/payment-messages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: othersMessageId, action: 'upload_receipt', receiptUrl: url, shipmentId }),
      });
    }
    setReceiptSubmitted(true);
    setShowDone(true);
  };

  if (loading || !shipment || !paySettings) return (
  <div className="fixed inset-0 z-50 flex items-center justify-center"
    style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-3 border-gray-200" />
        <div className="absolute inset-0 rounded-full border-3 border-transparent animate-spin"
          style={{
            borderTopColor: '#0b3aa4',
            borderRightColor: '#0e7490',
          }} />
      </div>
      <p className="text-sm font-semibold text-gray-600">Loading payment details…</p>
    </div>
  </div>
);

  const invoice = shipment.invoice;
  const isMethods = selectedMethod && selectedMethod !== 'card' && selectedMethod !== 'others';
  const cryptoSettings = selectedMethod === 'bitcoin' ? paySettings.crypto.bitcoin
    : selectedMethod === 'ethereum' ? paySettings.crypto.ethereum
    : selectedMethod === 'usdt' ? paySettings.crypto.usdt : null;

  const methods = ([
  { id: 'bitcoin' as PaymentMethod, label: 'Bitcoin (BTC)', emoji: '₿', desc: '10–30 min confirmation', available: paySettings.crypto.bitcoin.enabled },
  { id: 'ethereum' as PaymentMethod, label: 'Ethereum (ETH)', emoji: 'Ξ', desc: '5–20 min confirmation', available: paySettings.crypto.ethereum.enabled },
  { id: 'usdt' as PaymentMethod, label: 'USDT (Tether)', emoji: '₮', desc: '5–20 min confirmation', available: paySettings.crypto.usdt.enabled },
  { id: 'zelle' as PaymentMethod, label: 'Zelle', emoji: '💚', desc: '10–30 min confirmation', available: paySettings.zelle.enabled },
  { id: 'bank_transfer' as PaymentMethod, label: 'Bank Transfer', emoji: '🏦', desc: '1–2 working days', available: paySettings.bankTransfer.enabled },
  { id: 'paypal' as PaymentMethod, label: 'PayPal', emoji: '🅿️', desc: '10–30 min confirmation', available: paySettings.paypal.enabled },
  { id: 'cash_app' as PaymentMethod, label: 'Cash App', emoji: '💵', desc: '10–30 min confirmation', available: paySettings.cashApp.enabled },
  { id: 'card' as PaymentMethod, label: 'Credit / Debit Card', emoji: '💳', desc: 'Instant', available: true },
  { id: 'others' as PaymentMethod, label: 'Other Methods', emoji: '💬', desc: 'Varies', available: paySettings.others.enabled },
] as { id: PaymentMethod; label: string; emoji: string; desc: string; available: boolean }[]).filter(m => m.available);

  return (
    <div className="max-w-xl mx-auto pb-10 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">Complete Payment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Shipment {shipmentId}</p>
        </div>
      </div>

      {/* Invoice summary */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
  {/* Top gradient header */}
  <div className="px-5 py-5 border-b border-gray-100 dark:border-white/10" style={{ background: accent }}>
    <p className="text-xs font-bold text-white/70 uppercase tracking-wide">Total Amount Due</p>
    <p className="text-3xl font-extrabold text-white mt-1">{invoice.currency} {Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    <p className="text-xs text-white/70 mt-1">
      <span className="font-bold uppercase tracking-wide mr-1.5">Country:</span>
      {shipment.shipmentScope === 'local'
        ? (shipment.senderCountry || '—')
        : `${shipment.senderCountry || '—'} → ${shipment.receiverCountry || '—'}`}
    </p>
  </div>

  {/* Body */}
  <div className="px-5 py-4 space-y-2.5 text-sm">

    {/* Numbers */}
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Shipment No</span>
      <span className="font-bold text-gray-900 dark:text-white font-mono text-xs">{shipment.shipmentId}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tracking No</span>
      <span className="font-bold text-gray-900 dark:text-white font-mono text-xs">{shipment.trackingNumber}</span>
    </div>
    <div className="flex justify-between items-center">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice No</span>
      <span className="font-bold text-gray-900 dark:text-white font-mono text-xs">{invoice.invoiceNumber}</span>
    </div>

    <div className="border-t border-gray-100 dark:border-white/10 my-2" />

    {/* From / To */}
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">From</span>
      <span className="font-bold text-gray-900 dark:text-white text-right">{shipment.senderName}</span>
    </div>
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">To</span>
      <span className="font-bold text-gray-900 dark:text-white text-right">{shipment.receiverName}</span>
    </div>

    {/* Route */}
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">Route</span>
      <span className="font-bold text-gray-900 dark:text-white text-right text-xs">
        {shipment.shipmentScope === 'local'
          ? `${shipment.senderState || '—'} → ${shipment.receiverState || '—'}`
          : `${shipment.senderCountryCode || '—'} → ${shipment.receiverCountryCode || '—'}`}
      </span>
    </div>

    <div className="border-t border-gray-100 dark:border-white/10 my-2" />

    {/* Status */}
    <div className="flex justify-between items-center pt-1">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice Status</span>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${invoice.paid ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
        {invoice.paid ? 'Paid' : 'Unpaid'}
      </span>
    </div>
  </div>
</div>

      {/* Method selection */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Choose Payment Method</p>
        <div className="space-y-2">
          {methods.map(m => (
            <button key={m.id} type="button"
              onClick={() => { setSelectedMethod(m.id); setCardError(false); setCardProcessing(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition cursor-pointer text-left"
              style={{
                borderColor: selectedMethod === m.id ? '#0b3aa4' : 'transparent',
                background: selectedMethod === m.id ? 'rgba(11,58,164,0.06)' : '#f9fafb',
              }}>
              <span className="text-xl shrink-0">{m.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{m.label}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} /> {m.desc}</p>
              </div>
              {selectedMethod === m.id && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#0b3aa4' }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Payment details */}
      {selectedMethod && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">

          {/* Crypto */}
          {(selectedMethod === 'bitcoin' || selectedMethod === 'ethereum' || selectedMethod === 'usdt') && cryptoSettings && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Send {invoice.currency} {Number(invoice.amount).toFixed(2)} worth of {selectedMethod === 'bitcoin' ? 'BTC' : selectedMethod === 'ethereum' ? 'ETH' : 'USDT'}</p>
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">Send only <strong>{cryptoSettings.network}</strong> to this address. Sending other tokens may result in permanent loss.</p>
              </div>
              {cryptoSettings.qrImageUrl && (
                <div className="flex justify-center">
                  <img src={cryptoSettings.qrImageUrl} alt="QR Code" className="w-40 h-40 rounded-2xl border border-gray-200 dark:border-white/10 object-cover" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500">Wallet Address</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3">
                  <span className="text-xs font-mono text-gray-700 dark:text-gray-300 flex-1 break-all">{cryptoSettings.address}</span>
                  <CopyButton text={cryptoSettings.address} />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Confirmation time: <strong>{COUNTDOWN[selectedMethod]}</strong></p>
              </div>
              {!receiptSubmitted && (
                <>
                  <ReceiptUpload onUpload={handleReceiptUpload} uploaded={receiptUploaded} />
                  {receiptUploaded && (
                    <button onClick={handleSubmitReceipt} disabled={submittingReceipt}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: accent }}>
                      {submittingReceipt ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {submittingReceipt ? 'Submitting...' : 'I Have Paid — Submit Receipt'}
                    </button>
                  )}
                </>
              )}
              {receiptSubmitted && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-500/10 rounded-xl px-4 py-3">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <p className="text-xs text-green-700 dark:text-green-300 font-semibold">Receipt submitted! We'll confirm your payment within {COUNTDOWN[selectedMethod]}.</p>
                </div>
              )}
            </div>
          )}

          {/* Zelle */}
          {selectedMethod === 'zelle' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Send via Zelle</p>
              <div className="rounded-xl border border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
                <InfoRow label="Send To" value={paySettings.zelle.holderName} />
                {paySettings.zelle.phone && <InfoRow label="Phone" value={paySettings.zelle.phone} />}
                {paySettings.zelle.email && <InfoRow label="Email" value={paySettings.zelle.email} />}
                <InfoRow label="Amount" value={`${invoice.currency} ${Number(invoice.amount).toFixed(2)}`} />
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Confirmation time: <strong>{COUNTDOWN.zelle}</strong></p>
              </div>
              {!receiptSubmitted && (
                <>
                  <ReceiptUpload onUpload={handleReceiptUpload} uploaded={receiptUploaded} />
                  {receiptUploaded && (
                    <button onClick={handleSubmitReceipt} disabled={submittingReceipt}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: accent }}>
                      {submittingReceipt ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {submittingReceipt ? 'Submitting...' : 'I Have Paid — Submit Receipt'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bank Transfer */}
          {selectedMethod === 'bank_transfer' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Bank Transfer Details</p>
              <div className="rounded-xl border border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
                <InfoRow label="Bank Name" value={paySettings.bankTransfer.bankName} />
                <InfoRow label="Account Name" value={paySettings.bankTransfer.accountName} />
                <InfoRow label="Account Number" value={paySettings.bankTransfer.accountNumber} />
                {paySettings.bankTransfer.routingNumber && <InfoRow label="Routing Number" value={paySettings.bankTransfer.routingNumber} />}
                {paySettings.bankTransfer.swiftCode && <InfoRow label="SWIFT / BIC" value={paySettings.bankTransfer.swiftCode} />}
                {paySettings.bankTransfer.iban && <InfoRow label="IBAN" value={paySettings.bankTransfer.iban} />}
                <InfoRow label="Amount" value={`${invoice.currency} ${Number(invoice.amount).toFixed(2)}`} />
                <InfoRow label="Reference" value={shipmentId} />
              </div>
              {paySettings.bankTransfer.instructions && (
                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Instructions</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">{paySettings.bankTransfer.instructions}</p>
                </div>
              )}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Confirmation time: <strong>{COUNTDOWN.bank_transfer}</strong></p>
              </div>
              {!receiptSubmitted && (
                <>
                  <ReceiptUpload onUpload={handleReceiptUpload} uploaded={receiptUploaded} />
                  {receiptUploaded && (
                    <button onClick={handleSubmitReceipt} disabled={submittingReceipt}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: accent }}>
                      {submittingReceipt ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {submittingReceipt ? 'Submitting...' : 'I Have Paid — Submit Receipt'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* PayPal */}
          {selectedMethod === 'paypal' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Pay via PayPal</p>
              <div className="rounded-xl border border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
                {paySettings.paypal.useLink
                  ? <InfoRow label="PayPal.me Link" value={paySettings.paypal.link} />
                  : <InfoRow label="PayPal Email" value={paySettings.paypal.email} />}
                <InfoRow label="Amount" value={`${invoice.currency} ${Number(invoice.amount).toFixed(2)}`} />
              </div>
              {paySettings.paypal.useLink && (
                <a href={paySettings.paypal.link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                  style={{ background: '#0070ba' }}>
                  🅿️ Open PayPal.me
                </a>
              )}
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Confirmation time: <strong>{COUNTDOWN.paypal}</strong></p>
              </div>
              {!receiptSubmitted && (
                <>
                  <ReceiptUpload onUpload={handleReceiptUpload} uploaded={receiptUploaded} />
                  {receiptUploaded && (
                    <button onClick={handleSubmitReceipt} disabled={submittingReceipt}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: accent }}>
                      {submittingReceipt ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {submittingReceipt ? 'Submitting...' : 'I Have Paid — Submit Receipt'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Cash App */}
          {selectedMethod === 'cash_app' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Pay via Cash App</p>
              {paySettings.cashApp.qrImageUrl && (
                <div className="flex justify-center">
                  <img src={paySettings.cashApp.qrImageUrl} alt="Cash App QR" className="w-40 h-40 rounded-2xl border border-gray-200 dark:border-white/10 object-cover" />
                </div>
              )}
              <div className="rounded-xl border border-gray-100 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
                <InfoRow label="$Cashtag" value={paySettings.cashApp.cashtag} />
                <InfoRow label="Amount" value={`${invoice.currency} ${Number(invoice.amount).toFixed(2)}`} />
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Confirmation time: <strong>{COUNTDOWN.cash_app}</strong></p>
              </div>
              {!receiptSubmitted && (
                <>
                  <ReceiptUpload onUpload={handleReceiptUpload} uploaded={receiptUploaded} />
                  {receiptUploaded && (
                    <button onClick={handleSubmitReceipt} disabled={submittingReceipt}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                      style={{ background: accent }}>
                      {submittingReceipt ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      {submittingReceipt ? 'Submitting...' : 'I Have Paid — Submit Receipt'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Card */}
          {selectedMethod === 'card' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Pay with Card</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Card Number</label>
                  <input value={cardNumber}
                    onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                    placeholder="1234 5678 9012 3456" inputMode="numeric"
                    className={inputCls} style={{ fontSize: '16px' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Expiry Date</label>
                    <input value={cardExpiry}
                      onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCardExpiry(v.length > 2 ? `${v.slice(0,2)}/${v.slice(2)}` : v); }}
                      placeholder="MM/YY" className={inputCls} style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">CVV</label>
                    <input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123" inputMode="numeric" className={inputCls} style={{ fontSize: '16px' }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Cardholder Name</label>
                  <input value={cardName} onChange={e => setCardName(e.target.value)}
                    placeholder="Name on card" className={inputCls} style={{ fontSize: '16px' }} />
                </div>
              </div>
              {cardError && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">Card payment unavailable</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">We are currently experiencing issues processing card payments. Please use another payment method. An email has been sent to you with alternative options.</p>
                  </div>
                </div>
              )}
              {!cardError && (
                <button onClick={handleCardSubmit} disabled={cardProcessing || !cardNumber || !cardExpiry || !cardCvv || !cardName}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                  style={{ background: accent }}>
                  {cardProcessing ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><CreditCard size={15} /> Pay {invoice.currency} {Number(invoice.amount).toFixed(2)}</>}
                </button>
              )}
            </div>
          )}

          {/* Others */}
          {selectedMethod === 'others' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Other Payment Method</p>
              {!othersSent ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Tell us which payment method you'd like to use. We'll send you the payment details via email.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Your Payment Method</label>
                    <input value={othersMethod} onChange={e => setOthersMethod(e.target.value)}
                      placeholder="e.g. Western Union, MoneyGram, Wire Transfer..." className={inputCls} style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Additional Notes (optional)</label>
                    <textarea value={othersMessage} onChange={e => setOthersMessage(e.target.value)}
                      rows={3} placeholder="Any additional information..."
                      className={inputCls + ' resize-none'} style={{ fontSize: '16px' }} />
                  </div>
                  <button onClick={handleOthersSubmit} disabled={othersSending || !othersMethod.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
                    style={{ background: accent }}>
                    {othersSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {othersSending ? 'Sending...' : 'Request Payment Details'}
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-green-50 dark:bg-green-500/10 rounded-xl p-4">
                    <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">Request sent!</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">We've received your request to pay via <strong>{othersMethod}</strong>. Payment details will be sent to your email shortly.</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Once you receive payment details and complete payment:</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Upload your receipt below so we can confirm your payment.</p>
                  </div>
                  <ReceiptUpload onUpload={handleOthersReceiptUpload} uploaded={receiptUploaded} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Done modal */}
      {showDone && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-[92%] max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: accent }}>
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Receipt Submitted!</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your payment receipt has been submitted. We'll verify and confirm your payment. This usually takes <strong>{COUNTDOWN[selectedMethod || 'others']}</strong>.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push(`/${locale}/dashboard`)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Dashboard
              </button>
              <button onClick={() => router.push(`/${locale}/dashboard/track?q=${encodeURIComponent(shipmentId)}`)}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 transition"
                style={{ background: accent }}>
                Track Shipment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

