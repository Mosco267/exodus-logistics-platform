'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Loader2, Upload, Copy, AlertCircle,
  Clock, CreditCard, ExternalLink, X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  PaymentSettings, CustomMethod,
  getCardBrandLabel, CardBrand,
} from '@/lib/payment-settings';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Stripe-supported brands (Verve and others NOT supported)
const STRIPE_SUPPORTED_BRANDS: CardBrand[] = ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unionpay'];

// PayPal-supported currencies
const PAYPAL_SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'SEK', 'PLN',
  'NOK', 'DKK', 'HKD', 'SGD', 'NZD', 'MXN', 'THB', 'PHP', 'TWD',
  'CZK', 'HUF', 'ILS', 'MYR', 'BRL',
];

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
  destinationCountryCode?: string;
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
  | { type: 'crypto' }
  | { type: 'bitcoin' | 'usdt' | 'ethereum' }
  | { type: 'bankTransfer' }
  | { type: 'paypal' }
  | { type: 'custom'; id: string };

// Better deterministic UUID from shipmentId
function uuidFromSeed(seed: string): string {
  let h1 = 0xdeadbeef ^ seed.length;
  let h2 = 0x41c6ce57 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  let raw = hex(h1) + hex(h2);
  let h3 = Math.imul(h1, 1597334677) ^ Math.imul(h2, 2654435761);
  let h4 = Math.imul(h2, 1597334677) ^ Math.imul(h1, 2654435761);
  raw += hex(h3) + hex(h4);
  const versioned = raw.slice(0, 12) + '4' + raw.slice(13, 16) +
    ((parseInt(raw[16] || '0', 16) & 0x3) | 0x8).toString(16) + raw.slice(17);
  return [
    versioned.slice(0, 8),
    versioned.slice(8, 12),
    versioned.slice(12, 16),
    versioned.slice(16, 20),
    versioned.slice(20, 32),
  ].join('-');
}

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

function InfoRow({ label, value, copyable = true, truncate = false }: {
  label: string; value: string; copyable?: boolean; truncate?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        <span
          className={`text-xs font-bold text-gray-900 dark:text-white text-right ${truncate ? 'truncate max-w-[160px]' : 'break-all'}`}
          title={truncate ? value : undefined}>
          {value}
        </span>
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

  const handleRemove = () => {
    setPreviewUrl('');
    setUploaded(false);
    onUploaded('');
    if (ref.current) ref.current.value = '';
  };

  return (
    <div className="space-y-4 border-t border-gray-100 dark:border-white/10 pt-5">
      <div className="text-center">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-1">Upload Payment Receipt</p>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">Upload a screenshot or photo of your payment receipt. We'll verify and confirm your payment.</p>
      </div>

      {previewUrl && (
        <div className="flex justify-center">
          <div className="relative inline-block">
            <img src={previewUrl} alt="Receipt preview" className="w-40 h-40 object-cover rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm" />
            <button type="button" onClick={handleRemove}
              className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition cursor-pointer">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/20 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition disabled:opacity-60">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : uploaded ? <CheckCircle2 size={14} className="text-green-500" /> : <Upload size={14} />}
          {uploading ? 'Uploading' : uploaded ? 'Replace Receipt' : 'Upload Receipt'}
        </button>
      </div>

      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />

      {uploaded && (
        <button onClick={onSubmit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 hover:shadow-lg cursor-pointer disabled:opacity-60"
          style={{ background: accent }}>
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {submitting ? 'Submitting' : 'I Have Paid Submit Receipt'}
        </button>
      )}
    </div>
  );
}

// Stripe Card Form with strict brand validation
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
  const [brandError, setBrandError] = useState('');

  const handleChange = (event: any) => {
    if (event.complete === false && event.value?.type === 'card') {
      const brand = event.value?.payment_method?.card?.brand;
      if (brand && brand !== 'unknown' && !STRIPE_SUPPORTED_BRANDS.includes(brand as CardBrand)) {
        setBrandError(`${brand.toUpperCase()} cards are not supported. We only accept Visa, Mastercard, American Express, Discover, JCB, Diners Club, and UnionPay.`);
      } else {
        setBrandError('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    if (brandError) return;
    setProcessing(true); setError('');
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (submitError) {
        const msg = submitError.message || 'Payment failed';
        // Detect Stripe rejecting unsupported card type
        if (msg.toLowerCase().includes('card') && (msg.toLowerCase().includes('not supported') || msg.toLowerCase().includes('declined'))) {
          setError(`Your card was not accepted. We only accept Visa, Mastercard, American Express, Discover, JCB, Diners Club, and UnionPay. Cards like Verve are not currently supported.`);
        } else {
          setError(msg);
        }
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
      {/* Supported cards badge */}
      <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Accepted Cards</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { code: 'VISA', color: 'bg-blue-100 text-blue-700 border-blue-200' },
            { code: 'MASTERCARD', color: 'bg-red-100 text-red-700 border-red-200' },
            { code: 'AMEX', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
            { code: 'DISCOVER', color: 'bg-orange-100 text-orange-700 border-orange-200' },
            { code: 'JCB', color: 'bg-purple-100 text-purple-700 border-purple-200' },
            { code: 'DINERS', color: 'bg-slate-100 text-slate-700 border-slate-200' },
            { code: 'UNIONPAY', color: 'bg-rose-100 text-rose-700 border-rose-200' },
          ].map(b => (
            <span key={b.code} className={`text-[10px] font-bold px-2 py-1 rounded-md border ${b.color}`}>
              {b.code}
            </span>
          ))}
        </div>
      </div>

      {/* Themed Stripe element wrapper */}
      <div className="rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-4 shadow-sm">
        <PaymentElement onChange={handleChange} />
      </div>

      {brandError && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-200 dark:border-red-500/30">
          <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400 font-semibold">{brandError}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-xl p-3 border border-red-100 dark:border-red-500/20">
          <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <button onClick={handleSubmit} disabled={processing || !stripe || !!brandError}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 hover:shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: accent }}>
        {processing ? <><Loader2 size={15} className="animate-spin" /> Processing</> : <><CreditCard size={15} /> Pay {currency} {amount.toFixed(2)}</>}
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

  // Extract primary color from accent gradient (used for Stripe theme + spinner)
  const themeColors = useMemo(() => {
    const matches = accent.match(/#[0-9a-fA-F]{6}/g) || ['#0b3aa4', '#0e7490'];
    return { primary: matches[0], secondary: matches[1] || matches[0] };
  }, [accent]);

  // Data
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [paySettings, setPaySettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Selection
  const [selected, setSelected] = useState<SelectedMethod | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Stripe
  const [stripeClientSecret, setStripeClientSecret] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [stripeError, setStripeError] = useState('');

  // Receipt
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  // Success
  const [showDone, setShowDone] = useState(false);
  const [doneTitle, setDoneTitle] = useState('Payment Successful!');
  const [doneMessage, setDoneMessage] = useState('');

  // Payment reference
  const paymentReference = useMemo(() => {
    if (!shipment) return '';
    return uuidFromSeed(shipment.shipmentId);
  }, [shipment]);

  // Auto-scroll
  useEffect(() => {
    if (selected && detailsRef.current) {
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selected]);

  // Load
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

  // Stripe intent
  useEffect(() => {
    if (selected?.type !== 'card' || !shipment || stripeClientSecret) return;
    setCreatingIntent(true);
    setStripeError('');
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipmentId }),
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to initialize payment');
        return data;
      })
      .then(data => {
        if (data.clientSecret) setStripeClientSecret(data.clientSecret);
        else throw new Error('No client secret returned');
      })
      .catch(err => {
        console.error('Stripe init failed:', err);
        setStripeError(err.message || 'Failed to load card payment');
      })
      .finally(() => setCreatingIntent(false));
  }, [selected, shipment, shipmentId, stripeClientSecret]);

  const submitReceipt = async (paymentMethod: string) => {
    if (!receiptUrl) return;
    setSubmittingReceipt(true);
    try {
      const res = await fetch('/api/payment-receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId, paymentMethod, receiptUrl, reference: paymentReference }),
      });
      if (res.ok) {
        setReceiptSubmitted(true);
        setDoneTitle('Receipt Submitted!');
        setDoneMessage('Your payment receipt has been submitted. We\'ll verify and confirm your payment shortly.');
        setShowDone(true);
      }
    } finally { setSubmittingReceipt(false); }
  };

  // Themed loading spinner
  if (loading || !shipment || !paySettings) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f4ff 40%, #fff7ed 100%)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin"
            style={{ borderTopColor: themeColors.primary, borderRightColor: themeColors.secondary }} />
        </div>
        <p className="text-sm font-semibold text-gray-600">Loading payment details</p>
      </div>
    </div>
  );

  const invoice = shipment.invoice;
  const formatAmount = (n: number) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Build methods
  const methods: Array<{ key: string; label: string; emoji: string; logoUrl?: string; desc: string; method: SelectedMethod }> = [];
  if (paySettings.card.enabled) {
    methods.push({ key: 'card', label: 'Credit / Debit Card', emoji: '💳', desc: paySettings.card.confirmationTime, method: { type: 'card' } });
  }
  const cryptoEnabled = paySettings.bitcoin.enabled || paySettings.usdt.enabled || paySettings.ethereum.enabled;
  if (cryptoEnabled) {
    methods.push({ key: 'crypto', label: 'Cryptocurrency', emoji: '🪙', desc: 'Bitcoin, USDT, Ethereum', method: { type: 'crypto' } });
  }
  if (paySettings.bankTransfer.enabled) {
    methods.push({ key: 'bankTransfer', label: 'Bank Transfer', emoji: '🏦', desc: paySettings.bankTransfer.confirmationTime, method: { type: 'bankTransfer' } });
  }
  if (paySettings.paypal.enabled) {
    methods.push({ key: 'paypal', label: 'PayPal', emoji: '🅿️', desc: paySettings.paypal.confirmationTime, method: { type: 'paypal' } });
  }
  for (const cm of paySettings.customMethods) {
    methods.push({
      key: cm.id,
      label: cm.name,
      emoji: cm.emoji,
      logoUrl: cm.logoImageUrl,
      desc: cm.confirmationTime,
      method: { type: 'custom', id: cm.id },
    });
  }

  const selectedKey = selected?.type === 'custom' ? selected.id
    : (selected?.type === 'bitcoin' || selected?.type === 'usdt' || selected?.type === 'ethereum') ? 'crypto'
    : selected?.type || '';

  const selectedCustom: CustomMethod | undefined = selected?.type === 'custom'
    ? paySettings.customMethods.find(m => m.id === selected.id)
    : undefined;

  // Build PayPal URL with currency preserved
  const buildPaypalUrl = () => {
    let url = paySettings.paypal.link.trim();
    if (!url) return '';
    const amt = invoice.amount.toFixed(2);
    const cur = invoice.currency.toUpperCase();
    if (!url.startsWith('http')) {
      const cleaned = url.replace(/^@/, '').replace(/^paypal\.me\//i, '');
      url = `https://www.paypal.me/${encodeURIComponent(cleaned)}/${amt}${cur}`;
    } else {
      url = url.replace(/\/+$/, '');
      url = `${url}/${amt}${cur}`;
    }
    return url;
  };

  const isPaypalCurrencySupported = PAYPAL_SUPPORTED_CURRENCIES.includes(invoice.currency.toUpperCase());

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
              ? (shipment.senderCountry || '')
              : `${shipment.senderCountry || ''} → ${shipment.receiverCountry || ''}`}
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
                ? `${shipment.senderState || shipment.senderCity || ''} → ${shipment.receiverState || shipment.receiverCity || ''}`
                : `${shipment.senderCountryCode || shipment.senderCountry || ''} → ${shipment.destinationCountryCode || shipment.receiverCountry || ''}`}
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
              {methods.map(m => {
                const isSelected = selectedKey === m.key;
                return (
                  <button key={m.key} type="button"
                    onClick={() => {
                      setSelected(m.method);
                      setReceiptUrl('');
                      setReceiptSubmitted(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition cursor-pointer text-left hover:opacity-95 hover:shadow-sm"
                    style={{
                      borderColor: isSelected ? 'transparent' : '#e5e7eb',
                      background: isSelected ? accent : '#f9fafb',
                    }}>
                    {m.logoUrl ? (
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
                        <img src={m.logoUrl} alt={m.label} className="w-full h-full object-contain p-1" />
                      </div>
                    ) : (
                      <span className="text-xl shrink-0">{m.emoji}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{m.label}</p>
                      <p className={`text-xs flex items-center gap-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        <Clock size={10} /> {m.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                        <CheckCircle2 size={12} className="text-blue-600" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method-specific UI */}
          {selected && (
            <div ref={detailsRef} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5 scroll-mt-20">

              {/* Card with Stripe */}
              {selected.type === 'card' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Pay with Card</p>
                  {creatingIntent ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
                        <div className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin"
                          style={{ borderTopColor: themeColors.primary, borderRightColor: themeColors.secondary }} />
                      </div>
                      <p className="text-xs text-gray-500">Initializing secure payment</p>
                    </div>
                  ) : stripeError ? (
                    <div className="flex items-start gap-2 bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-100 dark:border-red-500/20">
                      <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">Card payment unavailable</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{stripeError}</p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">Please try another payment method or contact support.</p>
                      </div>
                    </div>
                  ) : !stripePromise ? (
                    <p className="text-xs text-red-600">Stripe is not configured.</p>
                  ) : stripeClientSecret ? (
                    <Elements stripe={stripePromise} options={{
                      clientSecret: stripeClientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: themeColors.primary,
                          colorBackground: '#ffffff',
                          colorText: '#111827',
                          colorDanger: '#dc2626',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          borderRadius: '12px',
                          fontSizeBase: '14px',
                          spacingUnit: '4px',
                        },
                        rules: {
                          '.Input': {
                            border: '1px solid #e5e7eb',
                            boxShadow: 'none',
                            padding: '12px 14px',
                          },
                          '.Input:focus': {
                            border: `1px solid ${themeColors.primary}`,
                            boxShadow: `0 0 0 1px ${themeColors.primary}`,
                          },
                          '.Label': {
                            fontWeight: '700',
                            fontSize: '12px',
                            color: '#6b7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          },
                          '.Tab': {
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                          },
                          '.Tab--selected': {
                            border: `1px solid ${themeColors.primary}`,
                            boxShadow: `0 0 0 1px ${themeColors.primary}`,
                          },
                        },
                      },
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
                  ) : null}
                </div>
              )}

              {/* Crypto coin picker */}
              {selected.type === 'crypto' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Choose Cryptocurrency</p>
                  <p className="text-xs text-gray-500">Select which coin you'd like to pay with.</p>
                  <div className="space-y-2">
                    {paySettings.bitcoin.enabled && (
                      <button onClick={() => setSelected({ type: 'bitcoin' })}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-gray-100 dark:border-white/10 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/5 transition cursor-pointer text-left">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.png" alt="BTC" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Bitcoin (BTC)</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {paySettings.bitcoin.confirmationTime}</p>
                        </div>
                      </button>
                    )}
                    {paySettings.usdt.enabled && (
                      <button onClick={() => setSelected({ type: 'usdt' })}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-gray-100 dark:border-white/10 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition cursor-pointer text-left">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src="https://cryptologos.cc/logos/tether-usdt-logo.png" alt="USDT" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">USDT (Tether)</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {paySettings.usdt.confirmationTime} · {paySettings.usdt.network}</p>
                        </div>
                      </button>
                    )}
                    {paySettings.ethereum.enabled && (
                      <button onClick={() => setSelected({ type: 'ethereum' })}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 border-gray-100 dark:border-white/10 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition cursor-pointer text-left">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png" alt="ETH" className="w-7 h-7 object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Ethereum (ETH)</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={10} /> {paySettings.ethereum.confirmationTime}</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Crypto details */}
              {(selected.type === 'bitcoin' || selected.type === 'usdt' || selected.type === 'ethereum') && !receiptSubmitted && (() => {
                const c = paySettings[selected.type];
                const sym = selected.type === 'bitcoin' ? 'BTC' : selected.type === 'usdt' ? 'USDT' : 'ETH';
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        Send {invoice.currency} {formatAmount(invoice.amount)} worth of {sym}
                      </p>
                    </div>
                    <button onClick={() => setSelected({ type: 'crypto' })}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                      <ArrowLeft size={11} /> Choose different coin
                    </button>
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
                    <div className="rounded-xl border border-gray-100 dark:border-white/10 px-3 divide-y divide-gray-100 dark:divide-white/5">
                      <InfoRow label="Reference" value={paymentReference} truncate />
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
                    <InfoRow label="Reference" value={paymentReference} truncate />
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
                    <InfoRow label="Reference" value={paymentReference} truncate />
                  </div>

                  {!isPaypalCurrencySupported && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                      <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        PayPal does not support <strong>{invoice.currency}</strong>. Please use another payment method, or contact support for assistance with currency conversion.
                      </p>
                    </div>
                  )}

                  {paySettings.paypal.useLink && paySettings.paypal.link && isPaypalCurrencySupported && (
                    <a href={buildPaypalUrl()} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 hover:shadow-lg"
                      style={{ background: '#0070ba' }}>
                      Open PayPal <ExternalLink size={14} />
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
                  <div className="flex items-center gap-3">
                    {selectedCustom.logoImageUrl ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0">
                        <img src={selectedCustom.logoImageUrl} alt={selectedCustom.name} className="w-full h-full object-contain p-1" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-2xl shrink-0">
                        {selectedCustom.emoji}
                      </div>
                    )}
                    <p className="text-sm font-bold text-gray-900 dark:text-white">Pay via {selectedCustom.name}</p>
                  </div>
                  {selectedCustom.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">{selectedCustom.description}</p>
                  )}
                  {selectedCustom.qrImageUrl && (
                    <div className="flex justify-center">
                      <img src={selectedCustom.qrImageUrl} alt="QR" className="w-44 h-44 rounded-2xl border border-gray-200 dark:border-white/10 object-cover" />
                    </div>
                  )}
                  <div className="rounded-xl border border-gray-100 dark:border-white/10 px-3 divide-y divide-gray-100 dark:divide-white/5">
                    {selectedCustom.fields.map((f, idx) => (
                      <InfoRow key={idx} label={f.label} value={f.value} />
                    ))}
                    <InfoRow label="Amount" value={`${invoice.currency} ${formatAmount(invoice.amount)}`} copyable={false} />
                    <InfoRow label="Reference" value={paymentReference} truncate />
                  </div>
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