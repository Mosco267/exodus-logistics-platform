'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Loader2, Upload, Copy, AlertCircle,
  Clock, CreditCard, ExternalLink, X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  PaymentSettings, CustomMethod,
  detectCardBrand, getCardBrandLabel, getCardCvvLength, getCardMaxLength, CardBrand,
} from '@/lib/payment-settings';
import { COUNTRIES_WITH_STATES, getCountryByName } from '@/lib/countriesData';

// Supported card brands (Verve and others NOT supported)
const SUPPORTED_BRANDS: CardBrand[] = ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners'];

// PayPal-supported currencies
const PAYPAL_SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'SEK', 'PLN',
  'NOK', 'DKK', 'HKD', 'SGD', 'NZD', 'MXN', 'THB', 'PHP', 'TWD',
  'CZK', 'HUF', 'ILS', 'MYR', 'BRL',
];

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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}>
      <button type="button" onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition z-10">
        <X size={20} />
      </button>
      <img src={src} alt="Preview"
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
    </div>,
    document.body
  );
}

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

// Luhn algorithm for card validation
function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, '');
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (isNaN(n)) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// Format card number with spaces
function formatCardNumber(value: string, brand: CardBrand): string {
  const digits = value.replace(/\D/g, '');
  if (brand === 'amex') {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(' ')
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

// Format expiry as MM/YY
function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

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

  const [lightboxOpen, setLightboxOpen] = useState(false);

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
      <img src={previewUrl} alt="Receipt preview"
        onClick={() => setLightboxOpen(true)}
        className="w-40 h-40 object-cover rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm cursor-zoom-in hover:opacity-90 transition" />
      <button type="button" onClick={handleRemove}
        className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition cursor-pointer">
        <X size={14} />
      </button>
    </div>
  </div>
)}
 
{lightboxOpen && previewUrl && (
  <ImageLightbox src={previewUrl} onClose={() => setLightboxOpen(false)} />
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

// Country-specific ZIP/postal validation
function validateZipForCountry(zip: string, countryCode: string): string {
  const z = zip.trim();
  if (!z) return 'Postal code is required';

  const patterns: Record<string, { regex: RegExp; example: string }> = {
    US: { regex: /^\d{5}(-\d{4})?$/, example: '12345 or 12345-6789' },
    CA: { regex: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, example: 'A1A 1A1' },
    GB: { regex: /^[A-Z]{1,2}\d{1,2}[A-Z]? ?\d[A-Z]{2}$/i, example: 'SW1A 1AA' },
    AU: { regex: /^\d{4}$/, example: '1234' },
    NZ: { regex: /^\d{4}$/, example: '1234' },
    IE: { regex: /^[A-Z]\d{2} ?[A-Z0-9]{4}$/i, example: 'D02 X285' },
    NG: { regex: /^\d{6}$/, example: '100001' },
    IN: { regex: /^\d{6}$/, example: '110001' },
    DE: { regex: /^\d{5}$/, example: '10115' },
    FR: { regex: /^\d{5}$/, example: '75001' },
    IT: { regex: /^\d{5}$/, example: '00100' },
    ES: { regex: /^\d{5}$/, example: '28001' },
    NL: { regex: /^\d{4} ?[A-Z]{2}$/i, example: '1011 AA' },
    JP: { regex: /^\d{3}-?\d{4}$/, example: '100-0001' },
    BR: { regex: /^\d{5}-?\d{3}$/, example: '01310-100' },
    MX: { regex: /^\d{5}$/, example: '01000' },
    PT: { regex: /^\d{4}-?\d{3}$/, example: '1000-001' },
    PL: { regex: /^\d{2}-?\d{3}$/, example: '00-001' },
    RU: { regex: /^\d{6}$/, example: '101000' },
    CN: { regex: /^\d{6}$/, example: '100000' },
    KR: { regex: /^\d{5}$/, example: '03187' },
    SG: { regex: /^\d{6}$/, example: '238859' },
    MY: { regex: /^\d{5}$/, example: '50000' },
    TH: { regex: /^\d{5}$/, example: '10100' },
    PH: { regex: /^\d{4}$/, example: '1000' },
    ID: { regex: /^\d{5}$/, example: '10110' },
    ZA: { regex: /^\d{4}$/, example: '0001' },
    EG: { regex: /^\d{5}$/, example: '11511' },
    AE: { regex: /^\d{5,6}$/, example: '00000' },
    SA: { regex: /^\d{5}(-\d{4})?$/, example: '11564' },
    IL: { regex: /^\d{5}(\d{2})?$/, example: '9999999' },
    TR: { regex: /^\d{5}$/, example: '34000' },
    CH: { regex: /^\d{4}$/, example: '8001' },
    AT: { regex: /^\d{4}$/, example: '1010' },
    BE: { regex: /^\d{4}$/, example: '1000' },
    SE: { regex: /^\d{3} ?\d{2}$/, example: '111 22' },
    NO: { regex: /^\d{4}$/, example: '0001' },
    DK: { regex: /^\d{4}$/, example: '1000' },
    FI: { regex: /^\d{5}$/, example: '00100' },
    GR: { regex: /^\d{3} ?\d{2}$/, example: '104 31' },
    CZ: { regex: /^\d{3} ?\d{2}$/, example: '110 00' },
    HU: { regex: /^\d{4}$/, example: '1011' },
  };

  const p = patterns[countryCode];
  if (p && !p.regex.test(z)) return `Invalid postal code (e.g. ${p.example})`;
  if (z.length < 3 || z.length > 12) return 'Postal code must be 3-12 characters';
  return '';
}

// Format currency amount with commas
function formatAmountWithCommas(n: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Demo card form with real validation but fake processing
function CardFormDemo({ amount, currency, accent, themePrimary, onSwitchMethod }: {
  amount: number;
  currency: string;
  accent: string;
  themePrimary: string;
  onSwitchMethod: () => void;
}) {
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [country, setCountry] = useState('United States');
const [countryCode, setCountryCode] = useState('US');
const [stateValue, setStateValue] = useState('');
const [city, setCity] = useState('');
const [billingAddress, setBillingAddress] = useState('');
const [zipCode, setZipCode] = useState('');
const [touched, setTouched] = useState({
  name: false, number: false, expiry: false, cvv: false, zip: false, state: false, city: false, address: false,
});

// Auto-set user's country from profile on mount
// Auto-set user's country from profile on mount
useEffect(() => {
  fetch('/api/user/profile')
    .then(r => r.json())
    .then(data => {
      if (data.country) {
        const entry = getCountryByName(data.country);
        if (entry) {
          setCountry(entry.name);
          setCountryCode(entry.code);
        }
      }
    })
    .catch(() => {});
}, []);

  // Country/state dropdowns
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryRef = useRef<HTMLDivElement>(null);
  const [stateOpen, setStateOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const stateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false);
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const brand = useMemo(() => detectCardBrand(cardNumber), [cardNumber]);
  const brandLabel = getCardBrandLabel(brand);
  const cvvLength = getCardCvvLength(brand);
  const maxLength = getCardMaxLength(brand);
  const cardInputMax = brand === 'amex' ? 17 : brand === 'diners' ? 16 : 19;

  const cardDigits = cardNumber.replace(/\s/g, '');

  const countryEntry = getCountryByName(country);
  const states = countryEntry?.states || [];
  const hasStates = states.length > 0;

  const filteredCountries = useMemo(() =>
    COUNTRIES_WITH_STATES.filter(c =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase())
    ), [countrySearch]);

  const filteredStates = useMemo(() =>
    states.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())),
    [states, stateSearch]
  );

  const nameError =
    touched.name && !cardName.trim() ? 'Cardholder name is required'
    : touched.name && !/^[a-zA-Z\s'-]+$/.test(cardName.trim()) ? 'Name can only contain letters'
    : '';

  const numberError =
    touched.number && !cardDigits ? 'Card number is required'
    : touched.number && cardDigits.length < maxLength ? `Card number must be ${maxLength} digits`
    : touched.number && brand === 'unknown' ? 'This card type is not recognized'
    : touched.number && !SUPPORTED_BRANDS.includes(brand) ? `${brandLabel || 'This card type'} is not supported. We accept Visa, Mastercard, American Express, Discover, JCB, and Diners Club.`
    : touched.number && !luhnCheck(cardDigits) ? 'Card number is invalid'
    : '';

  const expiryError = (() => {
    if (!touched.expiry) return '';
    const digits = expiry.replace(/\D/g, '');
    if (digits.length < 4) return 'Enter expiry as MM/YY';
    const mm = parseInt(digits.slice(0, 2), 10);
    const yy = parseInt(digits.slice(2, 4), 10);
    if (mm < 1 || mm > 12) return 'Invalid month';
    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMM = now.getMonth() + 1;
    if (yy < currentYY || (yy === currentYY && mm < currentMM)) return 'Card has expired';
    if (yy > currentYY + 20) return 'Invalid year';
    return '';
  })();

  const cvvError =
    touched.cvv && !cvv ? 'CVV is required'
    : touched.cvv && cvv.length !== cvvLength ? `CVV must be ${cvvLength} digits`
    : '';

 const zipError = touched.zip ? validateZipForCountry(zipCode, countryCode) : '';
const stateError = touched.state && hasStates && !stateValue.trim() ? 'State / Province is required' : '';
const cityError = touched.city && !city.trim() ? 'City is required' : '';
const addressError = touched.address && !billingAddress.trim() ? 'Billing address is required' : '';

const isValid =
  !!cardName.trim() &&
  /^[a-zA-Z\s'-]+$/.test(cardName.trim()) &&
  cardDigits.length === maxLength &&
  SUPPORTED_BRANDS.includes(brand) &&
  luhnCheck(cardDigits) &&
  expiry.replace(/\D/g, '').length === 4 &&
  !expiryError &&
  cvv.length === cvvLength &&
  !!city.trim() &&
  !!billingAddress.trim() &&
  !!zipCode.trim() &&
  !validateZipForCountry(zipCode, countryCode) &&
  (!hasStates || !!stateValue.trim());

  const handleSubmit = async () => {
  setTouched({ name: true, number: true, expiry: true, cvv: true, zip: true, state: true, city: true, address: true });
    if (!isValid) return;

    setProcessing(true);
    setPaymentError('');

    await new Promise(resolve => setTimeout(resolve, 5000));

    setProcessing(false);
    setPaymentError('Payment processor unreachable. Please try another payment method.');
  };

  const handleRetry = () => {
  setPaymentError('');
  setTouched({ name: false, number: false, expiry: false, cvv: false, zip: false, state: false, city: false, address: false });
  setCardNumber('');
  setExpiry('');
  setCvv('');
};

  const baseInputCls = "w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none transition";
  const getInputCls = (err: string) => `${baseInputCls} ${err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-white/10'}`;

  // Card brand logo renderer
  const renderBrandLogo = (b: CardBrand, size: 'sm' | 'lg' = 'sm') => {
  const containerCls = size === 'lg' ? 'h-7 w-12' : 'h-6 w-10';

  const logos: Record<string, React.ReactNode> = {
    visa: (
      <div className={`${containerCls} rounded bg-white border border-gray-200 flex items-center justify-center px-1`}>
        <span className="font-extrabold italic text-[10px] tracking-tight" style={{ color: '#1A1F71', fontFamily: 'Arial, sans-serif' }}>
          VISA
        </span>
      </div>
    ),
    mastercard: (
      <div className={`${containerCls} rounded bg-white border border-gray-200 flex items-center justify-center`}>
        <svg viewBox="0 0 100 62" className="h-5" xmlns="http://www.w3.org/2000/svg">
          <circle cx="35" cy="31" r="26" fill="#EB001B" />
          <circle cx="65" cy="31" r="26" fill="#F79E1B" />
          <path fill="#FF5F00" d="M50 11a26 26 0 0 1 0 40 26 26 0 0 1 0-40z" />
        </svg>
      </div>
    ),
    amex: (
      <div className={`${containerCls} rounded bg-[#006FCF] flex items-center justify-center px-1`}>
        <span className="text-white text-[8px] font-extrabold tracking-tight">AMEX</span>
      </div>
    ),
    discover: (
      <div className={`${containerCls} rounded bg-white border border-gray-200 flex items-center justify-center px-1 relative overflow-hidden`}>
        <span className="text-[7px] font-extrabold text-gray-800 tracking-tight">DISCOVER</span>
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />
      </div>
    ),
    jcb: (
      <div className={`${containerCls} rounded overflow-hidden flex items-center justify-center`}>
        <div className="flex h-full w-full">
          <div className="flex-1 bg-[#0E4C96] flex items-center justify-center text-white text-[7px] font-extrabold">J</div>
          <div className="flex-1 bg-[#D02A2A] flex items-center justify-center text-white text-[7px] font-extrabold">C</div>
          <div className="flex-1 bg-[#239E47] flex items-center justify-center text-white text-[7px] font-extrabold">B</div>
        </div>
      </div>
    ),
    diners: (
      <div className={`${containerCls} rounded bg-white border border-gray-200 flex items-center justify-center px-0.5`}>
        <span className="text-[6px] font-bold text-gray-700 leading-tight text-center">DINERS<br />CLUB</span>
      </div>
    ),
  };

  return logos[b] || null;
};

  return (
    <div className="space-y-4">
      {/* Supported cards row */}
      <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Accepted Cards</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners'] as CardBrand[]).map(b => (
  <div key={b}>{renderBrandLogo(b)}</div>
))}
        </div>
      </div>

      

      {/* Card form */}
<>
          {/* Cardholder Name */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardName}
              onChange={e => setCardName(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, name: true }))}
              placeholder="Name as it appears on card"
              disabled={processing}
              className={getInputCls(nameError)}
              style={{ fontSize: '16px' }}
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          {/* Card Number with brand logo */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                maxLength={cardInputMax}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const detectedBrand = detectCardBrand(digits);
                  const limit = getCardMaxLength(detectedBrand);
                  const trimmed = digits.slice(0, limit);
                  setCardNumber(formatCardNumber(trimmed, detectedBrand));
                }}
                onBlur={() => setTouched(t => ({ ...t, number: true }))}
                placeholder={brand === 'amex' ? '1234 567890 12345' : '1234 5678 9012 3456'}
                disabled={processing}
                className={getInputCls(numberError) + ' pr-16 font-mono'}
                style={{ fontSize: '16px' }}
              />
              {brand !== 'unknown' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {renderBrandLogo(brand, 'sm')}
                </div>
              )}
            </div>
            {numberError && <p className="text-xs text-red-500 mt-1">{numberError}</p>}
          </div>

          {/* Expiry + CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                Expiry (MM/YY)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                onBlur={() => setTouched(t => ({ ...t, expiry: true }))}
                placeholder="MM/YY"
                maxLength={5}
                disabled={processing}
                className={getInputCls(expiryError) + ' font-mono'}
                style={{ fontSize: '16px' }}
              />
              {expiryError && <p className="text-xs text-red-500 mt-1">{expiryError}</p>}
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                CVV {brand === 'amex' ? '(4 digits)' : '(3 digits)'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, cvvLength))}
                onBlur={() => setTouched(t => ({ ...t, cvv: true }))}
                placeholder={brand === 'amex' ? '1234' : '123'}
                maxLength={cvvLength}
                disabled={processing}
                className={getInputCls(cvvError) + ' font-mono'}
                style={{ fontSize: '16px' }}
              />
              {cvvError && <p className="text-xs text-red-500 mt-1">{cvvError}</p>}
            </div>
          </div>

          {/* Billing — Country, State (if applicable), City, Address, ZIP */}
<div className="border-t border-gray-100 dark:border-white/10 pt-4 space-y-3">
  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
    Billing Information
  </p>

  {/* Country dropdown */}
  <div ref={countryRef} className="relative">
    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
      Country
    </label>
    <button
      type="button"
      disabled={processing}
      onClick={() => { setCountryOpen(v => !v); setCountrySearch(''); }}
      className={`${baseInputCls} border-gray-200 dark:border-white/10 flex items-center justify-between cursor-pointer text-left ${processing ? 'opacity-60' : ''}`}
      style={{ fontSize: '16px' }}>
      <span className="flex items-center gap-2">
        {countryEntry && (
          <img src={`https://flagcdn.com/w20/${countryEntry.code.toLowerCase()}.png`} width="20" height="15" alt={country} className="rounded-sm shrink-0" />
        )}
        <span>{country}</span>
      </span>
      <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${countryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {countryOpen && !processing && (
      <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
        <div className="p-2 border-b border-gray-100 dark:border-white/10">
          <input value={countrySearch} onChange={e => setCountrySearch(e.target.value)}
            placeholder="Search country" autoFocus
            style={{ fontSize: '16px' }}
            className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredCountries.map(c => (
            <button key={c.code} type="button"
              onClick={() => {
                setCountry(c.name);
                setCountryCode(c.code);
                setStateValue('');
                setCountryOpen(false);
                setCountrySearch('');
                setTouched(t => ({ ...t, zip: false, state: false }));
              }}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
              <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} width="20" height="15" alt={c.name} className="rounded-sm shrink-0" />
              <span className={country === c.name ? 'font-bold text-blue-600' : 'text-gray-800 dark:text-gray-200'}>{c.name}</span>
            </button>
          ))}
          {filteredCountries.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400">No results</p>
          )}
        </div>
      </div>
    )}
  </div>

  {/* State dropdown — only if country has states */}
  {hasStates && (
    <div ref={stateRef} className="relative">
      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
        State / Province
      </label>
      <button
        type="button"
        disabled={processing}
        onClick={() => { setStateOpen(v => !v); setStateSearch(''); }}
        className={`${getInputCls(stateError)} flex items-center justify-between cursor-pointer text-left ${processing ? 'opacity-60' : ''}`}
        style={{ fontSize: '16px' }}>
        <span className={stateValue ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
          {stateValue || 'Select state'}
        </span>
        <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${stateOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {stateOpen && !processing && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input value={stateSearch} onChange={e => setStateSearch(e.target.value)}
              placeholder="Search state" autoFocus
              style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredStates.map(s => (
              <button key={s} type="button"
                onClick={() => {
                  setStateValue(s);
                  setStateOpen(false);
                  setStateSearch('');
                  setTouched(t => ({ ...t, state: true }));
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition cursor-pointer ${stateValue === s ? 'font-bold text-blue-600 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10'}`}>
                {s}
              </button>
            ))}
            {filteredStates.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No results</p>
            )}
          </div>
        </div>
      )}
      {stateError && <p className="text-xs text-red-500 mt-1">{stateError}</p>}
    </div>
  )}

  {/* Billing Address */}
  <div>
    <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
      Billing Address
    </label>
    <input
      type="text"
      value={billingAddress}
      onChange={e => setBillingAddress(e.target.value)}
      onBlur={() => setTouched(t => ({ ...t, address: true }))}
      placeholder="Street address"
      disabled={processing}
      className={getInputCls(addressError)}
      style={{ fontSize: '16px' }}
    />
    {addressError && <p className="text-xs text-red-500 mt-1">{addressError}</p>}
  </div>

  {/* City + ZIP side by side */}
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
        City
      </label>
      <input
        type="text"
        value={city}
        onChange={e => setCity(e.target.value)}
        onBlur={() => setTouched(t => ({ ...t, city: true }))}
        placeholder="City"
        disabled={processing}
        className={getInputCls(cityError)}
        style={{ fontSize: '16px' }}
      />
      {cityError && <p className="text-xs text-red-500 mt-1">{cityError}</p>}
    </div>
    <div>
      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
        Postal / ZIP
      </label>
      <input
        type="text"
        value={zipCode}
        onChange={e => setZipCode(e.target.value.toUpperCase())}
        onBlur={() => setTouched(t => ({ ...t, zip: true }))}
        placeholder={countryCode === 'US' ? '12345' : countryCode === 'GB' ? 'SW1A 1AA' : countryCode === 'CA' ? 'A1A 1A1' : 'Postal code'}
        disabled={processing}
        maxLength={12}
        className={getInputCls(zipError)}
        style={{ fontSize: '16px' }}
      />
      {zipError && <p className="text-xs text-red-500 mt-1">{zipError}</p>}
    </div>
  </div>
</div>

          {/* Pay button with comma-formatted amount */}
          <button
            onClick={handleSubmit}
            disabled={processing || !isValid}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition hover:opacity-90 hover:shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: accent }}
          >
            {processing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Processing payment
              </>
            ) : (
              <>
                <CreditCard size={15} />
                Pay {currency} {formatAmountWithCommas(amount)}
              </>
            )}
          </button>

          {processing && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Please wait while we securely process your payment
            </p>
          )}

          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 leading-relaxed">
            🔒 Your payment information is encrypted and secure. We do not store your card details.
          </p>
          {paymentError && (
  <div className="text-center pt-2 border-t border-gray-100 dark:border-white/10">
    <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">
      Payment Failed
    </p>
    <p className="text-xs text-red-500 dark:text-red-300 leading-relaxed mb-3">
      {paymentError}
    </p>
    <p className="text-xs text-gray-600 dark:text-gray-400">
      <button
        onClick={handleRetry}
        className="text-red-600 dark:text-red-400 font-bold underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300 cursor-pointer">
        Retry payment
      </button>
      <span className="mx-2 text-gray-400">or</span>
      <button
        onClick={onSwitchMethod}
        className="font-bold underline underline-offset-2 hover:opacity-80 cursor-pointer"
        style={{ color: themePrimary }}>
        try another method
      </button>
    </p>
  </div>
)}
        </>
      
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

  // Receipt
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);

  // Success
  const [showDone, setShowDone] = useState(false);
  const [qrLightbox, setQrLightbox] = useState('');
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

              {/* Card with demo form */}
              {selected.type === 'card' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Pay with Card</p>
                  <CardFormDemo
                    amount={invoice.amount}
                    currency={invoice.currency}
                    accent={accent}
                    themePrimary={themeColors.primary}
                    onSwitchMethod={() => setSelected(null)}
                  />
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
    <img src={c.qrImageUrl} alt="QR Code"
      onClick={() => setQrLightbox(c.qrImageUrl || '')}
      className="w-44 h-44 rounded-2xl border border-gray-200 dark:border-white/10 object-cover cursor-zoom-in hover:opacity-90 transition" />
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
    <img src={selectedCustom.qrImageUrl} alt="QR"
      onClick={() => setQrLightbox(selectedCustom.qrImageUrl || '')}
      className="w-44 h-44 rounded-2xl border border-gray-200 dark:border-white/10 object-cover cursor-zoom-in hover:opacity-90 transition" />
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

      {qrLightbox && <ImageLightbox src={qrLightbox} onClose={() => setQrLightbox('')} />}

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