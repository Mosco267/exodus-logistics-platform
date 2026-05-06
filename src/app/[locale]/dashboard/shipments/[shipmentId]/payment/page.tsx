'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Loader2, Upload, Copy, AlertCircle,
  Clock, CreditCard, Bitcoin, Building2, DollarSign, ExternalLink,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { loadStripe, Stripe as StripeInstance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  PaymentSettings, CustomMethod,
  detectCardBrand, getCardBrandLabel, getCardCvvLength, getCardMaxLength, CardBrand,
} from '@/lib/payment-settings';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

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

type SelectedMethod =
  | { type: 'card' }
  | { type: 'bitcoin' | 'usdt' | 'ethereum' }
  | { type: 'bankTransfer' }
  | { type: 'paypal' }
  | { type: 'custom'; id: string };

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-400/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition cursor-pointer shrink-0">
      <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function InfoRow({ label, value, copyable = true }: { label: string; value: string; copyable?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold text-gray-900 dark:text-white text-right break-all">{value}</span>
        {copyable && <CopyButton text={value} />}
      </div>
    </div>
  );
}

function ConfirmationBanner({ time }: { time: string }) {
  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl px-4 py-3">
      <Clock size={14} className="text-amber-600 shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-300">Confirmation time: <strong>{time}</strong></p>
    </div>
  );
}

function ReceiptUpload({ onUploaded, accent, onSubmit, submitting }: {
  onUploaded: (url: string) => void;
  accent: string;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        onUploaded(data.url);
        setUploaded(true);
      }
    } catch {}
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-3 border-t border-gray-100 dark:border-white/10 pt-4">
      <div>
        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Upload Payment Receipt</p>
        <p className="text-xs text-gray-500 mb-3">Upload a screenshot or photo of your payment receipt. We'll verify and confirm your payment.</p>
      </div>
      {previewUrl && (
        <img src={previewUrl} alt="Receipt preview" className="w-32 h-32 object-cover rounded-xl border border-gray-200 dark:border-white/10" />
      )}
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition disabled:opacity-60">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : uploaded ? <CheckCircle2 size={14} className="text-green-500" /> : <Upload size={14} />}
        {uploading ? 'Uploading...' : uploaded ? 'Receipt Uploaded — Replace' : 'Upload Receipt'}
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
      {uploaded && (
        <button onClick={onSubmit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
          style={{ background: accent }}>
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {submitting ? 'Submitting...' : 'I Have Paid — Submit Receipt'}
        </button>
      )}
    </div>
  );
}

// Card brand badge
function CardBrandBadge({ brand }: { brand: CardBrand }) {
  if (brand === 'unknown') return null;
  const colors: Record<CardBrand, string> = {
    visa: 'bg-blue-100 text-blue-700 border-blue-200',
    mastercard: 'bg-red-100 text-red-700 border-red-200',
    amex: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    discover: 'bg-orange-100 text-orange-700 border-orange-200',
    jcb: 'bg-purple-100 text-purple-700 border-purple-200',
    diners: 'bg-slate-100 text-slate-700 border-slate-200',
    verve: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    unionpay: 'bg-rose-100 text-rose-700 border-rose-200',
    unknown: '',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${colors[brand]}`}>
      {getCardBrandLabel(brand)}
    </span>
  );
}

// Stripe payment form (uses real Stripe Elements)
function StripeCardForm({ shipmentId, amount, currency, accent, onSuccess }: {
  shipmentId: string;
  amount: number;
  currency: string;
  accent: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setProcessing(true); setError('');
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });
      if (submitError) {
        setError(submitError.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (e: any) {
      setError(e.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-100 dark:border-red-500/20">
          <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}
      <button onClick={handleSubmit} disabled={processing || !stripe}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
        style={{ background: accent }}>
        {processing ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><CreditCard size={15} /> Pay {currency} {amount.toFixed(2)}</>}
      </button>
    </div>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const shipmentId = params?.shipmentId as string;
  const router = useRouter();

  // Theme
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
    const t = setInterval(apply, 1000);
    return () => clearInterval(t);
  }, []);

  // Data
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selected, setSelected] = useState<SelectedMethod | null>(null);

  // Stripe
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);

  // Receipt
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  // Success
  const [showDone, setShowDone] = useState(false);
  const [doneTitle, setDoneTitle] = useState('Payment Successful!');
  const [doneMessage, setDoneMessage] = useState('');

  // Card brand
  const [cardBrand, setCardBrand] = useState<CardBrand>('unknown');

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
      } catch (e) {
        console.error('Load failed:', e);
      }
      finally { setLoading(false); }
    };
    if (shipmentId) load();
  }, [shipmentId]);

  // Create Stripe intent when card selected
  useEffect(() => {
    if (selected?.type !== 'card' || !shipment || stripeClientSecret) return;
    setCreatingIntent(true);
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) setStripeClientSecret(data.clientSecret);
      })
      .catch(() => {})
      .finally(() => setCreatingIntent(false));
  }, [selected, shipment, shipmentId, stripeClientSecret]);

  const submitReceipt = async (paymentMethod: string) => {
    if (!receiptUrl) return;
    setSubmittingReceipt(true);
    try {
      const res = await fetch('/api/payment-receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId, paymentMethod, receiptUrl }),
      });
      if (res.ok) {
        setReceiptSubmitted(true);
        setDoneTitle('Receipt Submitted!');
        setDoneMessage('Your payment receipt has been submitted. We\'ll verify and confirm your payment shortly.');
        setShowDone(true);
      }
    } finally { setSubmittingReceipt(false); }
  };

  if (loading || !shipment || !paySettings) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin"
            style={{ borderTopColor: '#0b3aa4', borderRightColor: '#0e7490' }} />
        </div>
        <p className="text-sm font-semibold text-gray-600">Loading payment details…</p>
      </div>
    </div>
  );

  const invoice = shipment.invoice;
  const formatAmount = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build available methods
  const methods: Array<{ key: string; label: string; emoji: string; desc: string; method: SelectedMethod }> = [];
  if (paySettings.card.enabled) {
    methods.push({ key: 'card', label: 'Credit / Debit Card', emoji: '💳', desc: paySettings.card.confirmationTime, method: { type: 'card' } });
  }
  if (paySettings.bitcoin.enabled) {
    methods.push({ key: 'bitcoin', label: 'Bitcoin (BTC)', emoji: '₿', desc: paySettings.bitcoin.confirmationTime, method: { type: 'bitcoin' } });
  }
  if (paySettings.usdt.enabled) {
    methods.push({ key: 'usdt', label: `USDT (${paySettings.usdt.network})`, emoji: '₮', desc: paySettings.usdt.confirmationTime, method: { type: 'usdt' } });
  }
  if (paySettings.ethereum.enabled) {
    methods.push({ key: 'ethereum', label: 'Ethereum (ETH)', emoji: 'Ξ', desc: paySettings.ethereum.confirmationTime, method: { type: 'ethereum' } });
  }
  if (paySettings.bankTransfer.enabled) {
    methods.push({ key: 'bankTransfer', label: 'Bank Transfer', emoji: '🏦', desc: paySettings.bankTransfer.confirmationTime, method: { type: 'bankTransfer' } });
  }
  if (paySettings.paypal.enabled) {
    methods.push({ key: 'paypal', label: 'PayPal', emoji: '🅿️', desc: paySettings.paypal.confirmationTime, method: { type: 'paypal' } });
  }
  for (const cm of paySettings.customMethods) {
    methods.push({ key: cm.id, label: cm.name, emoji: cm.emoji, desc: cm.confirmationTime, method: { type: 'custom', id: cm.id } });
  }

  const selectedKey = selected?.type === 'custom' ? selected.id : selected?.type || '';
  const selectedCustom: CustomMethod | undefined = selected?.type === 'custom'
    ? paySettings.customMethods.find(m => m.id === selected.id)
    : undefined;

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
        <div className="px-5 py-5 border-b border-gray-100 dark:border-white/10" style={{ background: accent }}>
          <p className="text-xs font-bold text-white/70 uppercase tracking-wide">Total Amount Due</p>
          <p className="text-3xl font-extrabold text-white mt-1">{invoice.currency} {formatAmount(invoice.amount)}</p>
          <p className="text-xs text-white/70 mt-1">
            <span className="font-bold uppercase tracking-wide mr-1.5">Country:</span>
            {shipment.shipmentScope === 'local'
              ? (shipment.senderCountry || '—')
              : `${shipment.senderCountry || '—'} → ${shipment.receiverCountry || '—'}`}
          </p>
        </div>
        <div className="px-5 py-4 space-y-2.5 text-sm">
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

          <div className="flex justify-between items-start gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">From</span>
            <span className="font-bold text-gray-900 dark:text-white text-right">{shipment.senderName}</span>
          </div>
          <div className="flex justify-between items-start gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">To</span>
            <span className="font-bold text-gray-900 dark:text-white text-right">{shipment.receiverName}</span>
          </div>
          <div className="flex justify-between items-start gap-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">Route</span>
            <span className="font-bold text-gray-900 dark:text-white text-right text-xs">
              {shipment.shipmentScope === 'local'
                ? `${shipment.senderState || '—'} → ${shipment.receiverState || '—'}`
                : `${shipment.senderCountryCode || '—'} → ${shipment.receiverCountryCode || '—'}`}
            </span>
          </div>

          <div className="border-t border-gray-100 dark:border-white/10 my-2" />

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${invoice.paid
                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'
            }`}>
              {invoice.paid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
      </div>

      {invoice.paid ? (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-green-700 dark:text-green-400">Payment Confirmed</p>
              <p className="text-sm text-green-600 dark:text-green-300 mt-1">This invoice has been paid. No further action needed.</p>
            </div>
          </div>
        </div>
      ) : methods.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-bold text-amber-700 dark:text-amber-400">Payment unavailable</p>
              <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">No payment methods are currently configured. Please contact support.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Method selection */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Choose Payment Method</p>
            <div className="space-y-2">
              {methods.map(m => (
                <button key={m.key} type="button"
                  onClick={() => {
                    setSelected(m.method);
                    setReceiptUrl('');
                    setReceiptSubmitted(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition cursor-pointer text-left"
                  style={{
                    borderColor: selectedKey === m.key ? '#0b3aa4' : 'transparent',
                    background: selectedKey === m.key ? 'rgba(11,58,164,0.06)' : '#f9fafb',
                  }}>
                  <span className="text-xl shrink-0">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m.label}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} /> {m.desc}</p>
                  </div>
                  {selectedKey === m.key && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#0b3aa4' }}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Method-specific UI */}
          {selected && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">

              {/* Card with Stripe */}
              {selected.type === 'card' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Pay with Card</p>
                  {creatingIntent || !stripeClientSecret ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                  ) : !stripePromise ? (
                    <p className="text-xs text-red-600">Stripe is not configured. Please contact support.</p>
                  ) : (
                    <Elements stripe={stripePromise} options={{
                      clientSecret: stripeClientSecret,
                      appearance: { theme: 'stripe' },
                    }}>
                      <StripeCardForm
                        shipmentId={shipmentId}
                        amount={invoice.amount}
                        currency={invoice.currency}
                        accent={accent}
                        onSuccess={() => {
                          setDoneTitle('Payment Successful!');
                          setDoneMessage('Your payment was processed successfully. The shipment will now move to the next stage.');
                          setShowDone(true);
                        }} />
                    </Elements>
                  )}
                </div>
              )}

              {/* Crypto */}
              {(selected.type === 'bitcoin' || selected.type === 'usdt' || selected.type === 'ethereum') && !receiptSubmitted && (() => {
                const c = paySettings[selected.type];
                const sym = selected.type === 'bitcoin' ? 'BTC' : selected.type === 'usdt' ? 'USDT' : 'ETH';
                return (
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      Send {invoice.currency} {formatAmount(invoice.amount)} worth of {sym}
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3 flex items-start gap-2">
                      <AlertCircle size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        Send only <strong>{sym}</strong> on the <strong>{c.network}</strong> network. Sending other tokens or wrong network may result in permanent loss.
                      </p>
                    </div>
                    {c.qrImageUrl && (
                      <div className="flex justify-center">
                        <img src={c.qrImageUrl} alt="QR Code" className="w-44 h-44 rounded-2xl border border-gray-200 dark:border-white/10 object-cover" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500">Wallet Address</p>
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-2.5">
                        <span className="text-xs font-mono text-gray-700 dark:text-gray-300 flex-1 break-all">{c.walletAddress}</span>
                        <CopyButton text={c.walletAddress} />
                      </div>
                    </div>
                    <ConfirmationBanner time={c.confirmationTime} />
                    <ReceiptUpload
                      onUploaded={url => setReceiptUrl(url)}
                      accent={accent}
                      onSubmit={() => submitReceipt(selected.type)}
                      submitting={submittingReceipt} />
                  </div>
                );
              })()}

              {/* Bank Transfer */}
              {selected.type === 'bankTransfer' && !receiptSubmitted && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Bank Transfer Details</p>
                  <div className="rounded-xl border border-gray-100 dark:border-white/10 px-3 divide-y divide-gray-100 dark:divide-white/5">
                    <InfoRow label="Bank Name" value={paySettings.bankTransfer.bankName} />
                    <InfoRow label="Account Holder" value={paySettings.bankTransfer.accountName} />
                    <InfoRow label="Account Number" value={paySettings.bankTransfer.accountNumber} />
                    <InfoRow label="Routing Number" value={paySettings.bankTransfer.routingNumber} />
                    <InfoRow label="SWIFT / BIC" value={paySettings.bankTransfer.swiftCode} />
                    <InfoRow label="IBAN" value={paySettings.bankTransfer.iban} />
                    <InfoRow label="Branch Address" value={paySettings.bankTransfer.branchAddress} copyable={false} />
                    <InfoRow label="Amount" value={`${invoice.currency} ${formatAmount(invoice.amount)}`} copyable={false} />
                    <InfoRow label="Reference" value={shipmentId} />
                  </div>
                  {paySettings.bankTransfer.instructions && (
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Instructions</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 whitespace-pre-line">{paySettings.bankTransfer.instructions}</p>
                    </div>
                  )}
                  <ConfirmationBanner time={paySettings.bankTransfer.confirmationTime} />
                  <ReceiptUpload
                    onUploaded={url => setReceiptUrl(url)}
                    accent={accent}
                    onSubmit={() => submitReceipt('bankTransfer')}
                    submitting={submittingReceipt} />
                </div>
              )}

              {/* PayPal */}
              {selected.type === 'paypal' && !receiptSubmitted && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Pay via PayPal</p>
                  <div className="rounded-xl border border-gray-100 dark:border-white/10 px-3 divide-y divide-gray-100 dark:divide-white/5">
                    {paySettings.paypal.useLink
                      ? <InfoRow label="PayPal.me Link" value={paySettings.paypal.link} />
                      : <InfoRow label="PayPal Email" value={paySettings.paypal.email} />}
                    <InfoRow label="Amount" value={`${invoice.currency} ${formatAmount(invoice.amount)}`} copyable={false} />
                    <InfoRow label="Reference" value={shipmentId} />
                  </div>
                  {paySettings.paypal.useLink && paySettings.paypal.link && (
                    <a href={paySettings.paypal.link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                      style={{ background: '#0070ba' }}>
                      Open PayPal.me <ExternalLink size={14} />
                    </a>
                  )}
                  <ConfirmationBanner time={paySettings.paypal.confirmationTime} />
                  <ReceiptUpload
                    onUploaded={url => setReceiptUrl(url)}
                    accent={accent}
                    onSubmit={() => submitReceipt('paypal')}
                    submitting={submittingReceipt} />
                </div>
              )}

              {/* Custom method */}
              {selected.type === 'custom' && selectedCustom && !receiptSubmitted && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Pay via {selectedCustom.name}</p>
                  {selectedCustom.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">{selectedCustom.description}</p>
                  )}
                  {selectedCustom.qrImageUrl && (
                    <div className="flex justify-center">
                      <img src={selectedCustom.qrImageUrl} alt="QR" className="w-44 h-44 rounded-2xl border border-gray-200 dark:border-white/10 object-cover" />
                    </div>
                  )}
                  {selectedCustom.fields.length > 0 && (
                    <div className="rounded-xl border border-gray-100 dark:border-white/10 px-3 divide-y divide-gray-100 dark:divide-white/5">
                      {selectedCustom.fields.map((f, idx) => (
                        <InfoRow key={idx} label={f.label} value={f.value} />
                      ))}
                      <InfoRow label="Amount" value={`${invoice.currency} ${formatAmount(invoice.amount)}`} copyable={false} />
                    </div>
                  )}
                  {selectedCustom.instructions && (
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Instructions</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 whitespace-pre-line">{selectedCustom.instructions}</p>
                    </div>
                  )}
                  <ConfirmationBanner time={selectedCustom.confirmationTime} />
                  <ReceiptUpload
                    onUploaded={url => setReceiptUrl(url)}
                    accent={accent}
                    onSubmit={() => submitReceipt(`custom_${selectedCustom.id}`)}
                    submitting={submittingReceipt} />
                </div>
              )}

              {receiptSubmitted && (
                <div className="flex items-start gap-3 bg-green-50 dark:bg-green-500/10 rounded-xl p-4">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">Receipt submitted</p>
                    <p className="text-xs text-green-600 dark:text-green-300 mt-1">We'll verify and confirm your payment shortly. You'll receive an email once it's confirmed.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Success modal */}
      {showDone && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-[92%] max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: accent }}>
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{doneTitle}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{doneMessage}</p>
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