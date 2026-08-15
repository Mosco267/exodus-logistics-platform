// src/app/[locale]/quote/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import {
  Calculator, Loader2, ChevronDown, AlertCircle, Info,
  Package, MapPin, Plane, Ship, Truck, ArrowLeft, CheckCircle2, Printer,
} from 'lucide-react';
import { COUNTRIES_WITH_STATES, getCountryByName, type CountryEntry } from '@/lib/countriesData';

/* ─── Shared limits, mirrored from the API ─────────────────── */
const WEIGHT_MAX = 30000;
const LENGTH_MAX = 1200;
const WIDTH_MAX = 300;
const HEIGHT_MAX = 300;

const COUNTRY_CURRENCY: Record<string, string> = {
  US:'USD',CA:'CAD',GB:'GBP',AU:'AUD',NZ:'NZD',
  DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',PT:'EUR',NL:'EUR',BE:'EUR',AT:'EUR',
  FI:'EUR',IE:'EUR',GR:'EUR',NG:'NGN',GH:'GHS',KE:'KES',ZA:'ZAR',EG:'EGP',
  IN:'INR',CN:'CNY',JP:'JPY',KR:'KRW',SG:'SGD',MY:'MYR',TH:'THB',PH:'PHP',
  AE:'AED',SA:'SAR',TR:'TRY',BR:'BRL',MX:'MXN',AR:'ARS',
  NO:'NOK',SE:'SEK',DK:'DKK',CH:'CHF',PL:'PLN',RU:'RUB',
};

const CURRENCIES = [
  'USD','EUR','GBP','CAD','AUD','NZD','CHF','JPY','CNY','INR','KRW','SGD',
  'AED','SAR','ZAR','NGN','GHS','KES','EGP','BRL','MXN','TRY','RUB','PLN',
  'SEK','NOK','DKK','MYR','THB','PHP','ARS',
];

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 transition";

function fmtMoney(v: number): string {
  if (!Number.isFinite(v)) return '0.00';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function withCommas(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const [i, ...rest] = cleaned.split('.');
  const dec = rest.length ? '.' + rest.join('').slice(0, 2) : '';
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + dec;
}
const strip = (s: string) => s.replace(/,/g, '');

/* ─── Country select ───────────────────────────────────────── */
function CountrySelect({ label, value, onPick, disabled, excludeCode, onlyCodes, placeholder, searchLabel, noResults }: {
  label: string; value: string; onPick: (e: CountryEntry) => void;
  disabled?: boolean; excludeCode?: string; onlyCodes?: string[];
  placeholder: string; searchLabel: string; noResults: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

 const list = useMemo(() =>
    COUNTRIES_WITH_STATES.filter(c =>
      (!excludeCode || c.code !== excludeCode) &&
      (!onlyCodes || onlyCodes.includes(c.code)) &&
      c.name.toLowerCase().includes(q.toLowerCase())
    ), [q, excludeCode, onlyCodes]);

  const sel = getCountryByName(value);

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <button type="button" disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(v => !v); setQ(''); } }}
        className={`${inputCls} flex items-center justify-between cursor-pointer text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <span className="flex items-center gap-2 min-w-0">
          {sel
            ? <><img src={`https://flagcdn.com/w20/${sel.code.toLowerCase()}.png`} width="20" height="15" alt="" className="rounded-sm shrink-0" /><span className="truncate">{sel.name}</span></>
            : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={searchLabel} autoFocus
              style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {list.map(c => (
              <button key={c.code} type="button"
                onMouseDown={() => { onPick(c); setOpen(false); setQ(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 transition cursor-pointer ${value === c.name ? 'font-semibold text-blue-700 bg-blue-50' : 'text-gray-800'}`}>
                <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} width="20" height="15" alt="" className="rounded-sm shrink-0" />
                <span>{c.name}</span>
              </button>
            ))}
            {list.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">{noResults}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── State select ─────────────────────────────────────────── */
function StateSelect({ label, country, value, onChange, placeholder, searchLabel, noResults }: {
  label: string; country: string; value: string; onChange: (v: string) => void;
  placeholder: string; searchLabel: string; noResults: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const states = getCountryByName(country)?.states || [];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (states.length === 0) {
    return (
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={inputCls} style={{ fontSize: '16px' }} />
      </div>
    );
  }

  const list = states.filter(s => s.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <button type="button" onClick={() => { setOpen(v => !v); setQ(''); }}
        className={`${inputCls} flex items-center justify-between cursor-pointer text-left`}>
        <span className={value ? 'text-gray-900 truncate' : 'text-gray-400'}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={searchLabel} autoFocus
              style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {list.map(s => (
              <button key={s} type="button"
                onMouseDown={() => { onChange(s); setOpen(false); setQ(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition cursor-pointer ${value === s ? 'font-semibold text-blue-700 bg-blue-50' : 'text-gray-800'}`}>
                {s}
              </button>
            ))}
            {list.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">{noResults}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Plain select ─────────────────────────────────────────── */
function Select({ label, value, onChange, options, disabled, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; disabled?: boolean; hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const sel = options.find(o => o.value === value);
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      <div ref={ref} className="relative">
        <button type="button" disabled={disabled} onClick={() => { if (!disabled) setOpen(v => !v); }}
          className={`${inputCls} flex items-center justify-between cursor-pointer text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <span className="text-gray-900 truncate">{sel?.label || ''}</span>
          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-y-auto max-h-56">
            {options.map(o => (
              <button key={o.value} type="button" onMouseDown={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition cursor-pointer ${value === o.value ? 'font-bold text-blue-700 bg-blue-50' : 'text-gray-800'}`}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Info size={11} /> {hint}</p>}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function QuotePage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const intl = useIntl();
  const t = (id: string, values?: any) => intl.formatMessage({ id }, values);
  const nav = (p: string) => router.push(`/${locale}${p}`);

  const [scope, setScope] = useState<'international' | 'local'>('international');
  const [senderCountry, setSenderCountry] = useState('');
  const [senderCode, setSenderCode] = useState('');
  const [senderState, setSenderState] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [receiverCountry, setReceiverCountry] = useState('');
  const [receiverCode, setReceiverCode] = useState('');
  const [receiverState, setReceiverState] = useState('');
  const [receiverCity, setReceiverCity] = useState('');

  const [weightKg, setWeightKg] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [shipmentType, setShipmentType] = useState('Parcel');
  const [serviceLevel, setServiceLevel] = useState<'Express' | 'Standard'>('Express');
  const [declaredValue, setDeclaredValue] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [quote, setQuote] = useState<any>(null);

  // Countries where local operations are enabled in admin
  const [localAvailable, setLocalAvailable] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/local-availability')
      .then(r => r.json())
      .then(d => setLocalAvailable((d.countries || []).map((c: any) => c.countryCode)))
      .catch(() => {});
  }, []);

  const localUnsupported =
    scope === 'local' && !!senderCode && !localAvailable.includes(senderCode);

  const PACKAGE_TYPES = useMemo(() => ([
    { value: 'Documents', label: t('ShipmentType.documents') },
    { value: 'Parcel', label: t('ShipmentType.parcel') },
    { value: 'Electronics', label: t('ShipmentType.electronics') },
    { value: 'Clothing', label: t('ShipmentType.clothing') },
    { value: 'Food & Perishables', label: t('ShipmentType.food') },
    { value: 'Furniture', label: t('ShipmentType.furniture') },
    { value: 'Machinery', label: t('ShipmentType.machinery') },
    { value: 'Bulk / Pallet', label: t('ShipmentType.bulk') },
    { value: 'Container', label: t('ShipmentType.container') },
    { value: 'Other', label: t('ShipmentType.other') },
  ]), [intl.locale]);

  const SERVICE_LEVELS = useMemo(() => ([
    { value: 'Express', label: t('ServiceLevel.express') },
    { value: 'Standard', label: t('ServiceLevel.standard') },
  ]), [intl.locale]);

  const isBulk = shipmentType === 'Container' || shipmentType === 'Bulk / Pallet';

  // Local shipments stay inside one country
  useEffect(() => {
    if (scope === 'local' && senderCountry) {
      setReceiverCountry(senderCountry);
      setReceiverCode(senderCode);
      setReceiverState('');
    }
  }, [scope, senderCountry, senderCode]);

  const pickSender = (c: CountryEntry) => {
    setSenderCountry(c.name); setSenderCode(c.code); setSenderState('');
    const cur = COUNTRY_CURRENCY[c.code];
    if (cur) setCurrency(cur);
  };

  // Live volumetric preview
  const actual = parseFloat(strip(weightKg)) || 0;
  const vol = ((parseFloat(strip(lengthCm)) || 0) * (parseFloat(strip(widthCm)) || 0) * (parseFloat(strip(heightCm)) || 0)) / 5000;
  const chargeable = Math.max(actual, vol);

  const overLimit =
    actual > WEIGHT_MAX ||
    (parseFloat(strip(lengthCm)) || 0) > LENGTH_MAX ||
    (parseFloat(strip(widthCm)) || 0) > WIDTH_MAX ||
    (parseFloat(strip(heightCm)) || 0) > HEIGHT_MAX;

  const required = [
    senderCountry, senderState, senderCity,
    receiverCountry, receiverState, receiverCity,
    weightKg, lengthCm, widthCm, heightCm, declaredValue,
  ];
  const missing = required.some(v => !String(v).trim());

  const submit = async () => {
    setAttempted(true);
    setError('');
    if (missing) { setError(t('Quote.errRequired')); return; }
    if (overLimit) { setError(t('Quote.errOverLimit')); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          senderCountryCode: senderCode, senderState, senderCity,
          receiverCountryCode: receiverCode, receiverState, receiverCity,
          weightKg: parseFloat(strip(weightKg)) || 0,
          lengthCm: parseFloat(strip(lengthCm)) || 0,
          widthCm: parseFloat(strip(widthCm)) || 0,
          heightCm: parseFloat(strip(heightCm)) || 0,
          shipmentType, serviceLevel,
          declaredValue: parseFloat(strip(declaredValue)) || 0,
          currency,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const code = json?.error;
        setError(
          code === 'RATE_LIMITED' ? t('Quote.errRateLimited')
          : code === 'OVER_LIMIT' ? t('Quote.errOverLimit')
          : t('Quote.errFailed')
        );
        return;
      }
      setQuote(json.quote);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t('Quote.errFailed'));
    } finally {
      setLoading(false);
    }
  };

  const book = () => {
    try {
      sessionStorage.setItem('exodus_pending_quote', JSON.stringify({
        ...quote,
        senderCountry, receiverCountry,
        savedAt: Date.now(),
      }));
    } catch {}
    nav('/dashboard/shipments/new');
  };

  const meansIcon = quote?.means === 'air' ? Plane : quote?.means === 'sea' ? Ship : Truck;
  const MeansIcon = meansIcon;

  /* ── Result view ───────────────────────────────────────── */
  if (quote) {
    const c = quote.charges;
    const rows = [
      { label: t('Quote.rowFreight', { means: t(`ShipmentMeans.${quote.means}`) }), value: c.baseFreight },
      { label: t('Quote.rowFuel'), value: c.fuel },
      { label: t('Quote.rowInsurance'), value: c.insurance },
      { label: t('Quote.rowHandling'), value: c.handling },
      ...(c.customs > 0 ? [{ label: t('Quote.rowCustoms'), value: c.customs }] : []),
      ...(c.tax > 0 ? [{ label: t('Quote.rowTax'), value: c.tax }] : []),
    ];

    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-cyan-400" />

            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-100">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t('Quote.resultLabel')}
                  </p>
                  <h1 className="text-2xl font-extrabold text-gray-900 mt-1">
                    {currency} {fmtMoney(c.total)}
                  </h1>
                  <p className="text-xs text-gray-500 mt-1 font-mono">{quote.quoteNumber}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 ring-1 ring-blue-100 flex items-center justify-center shrink-0">
                  <MeansIcon className="w-6 h-6 text-blue-700" />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                    <MapPin size={12} /> {t('Quote.summaryRoute')}
                  </p>
                  <p className="mt-1.5 font-bold text-gray-900">
                    {senderCity}, {senderCountry}
                  </p>
                  <p className="text-gray-600">→ {receiverCity}, {receiverCountry}</p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {t('Quote.summaryMode', { mode: t(`ShipmentMeans.${quote.means}`), service: t(`ServiceLevel.${quote.serviceLevel.toLowerCase()}`) })}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                    <Package size={12} /> {t('Quote.summaryPackage')}
                  </p>
                  <p className="mt-1.5 font-bold text-gray-900">
                    {t('Quote.summaryChargeable', { kg: fmtMoney(quote.chargeableWeight) })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {quote.dimensionsCm.length} × {quote.dimensionsCm.width} × {quote.dimensionsCm.height} cm
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {t('Quote.summaryDelivery', { min: quote.deliveryMinDays, max: quote.deliveryMaxDays })}
                  </p>
                </div>
              </div>

              {/* Volumetric explainer */}
              {quote.volumetricApplied && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {t('Quote.volumetricNotice', {
                      vol: fmtMoney(quote.volumetricWeight),
                      actual: fmtMoney(quote.actualWeight),
                    })}
                  </p>
                </div>
              )}

              {/* Service downgrade explainer */}
              {quote.serviceDowngraded && (
                <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    {t('Quote.serviceNotice')}
                  </p>
                </div>
              )}

              {/* Breakdown */}
              <div className="mt-6">
                <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide mb-3">
                  {t('Quote.breakdownTitle')}
                </h2>
                <div className="space-y-2.5 text-sm">
                  {rows.map(r => (
                    <div key={r.label} className="flex justify-between text-gray-600">
                      <span>{r.label}</span>
                      <span className="font-semibold text-gray-800">{currency} {fmtMoney(r.value)}</span>
                    </div>
                  ))}
                  {c.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t('Quote.rowDiscount')}</span>
                      <span className="font-semibold">− {currency} {fmtMoney(c.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-gray-200 pt-3.5 mt-1">
                    <span className="font-extrabold text-gray-900 text-base">{t('Quote.rowTotal')}</span>
                    <span className="text-xl font-extrabold text-blue-700">{currency} {fmtMoney(c.total)}</span>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-[11px] text-gray-400 leading-relaxed">
                {t('Quote.validUntil', { date: quote.validUntil })}
              </p>

              {/* Actions */}
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button onClick={book}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition cursor-pointer">
                  <CheckCircle2 size={16} /> {t('Quote.ctaBook')}
                </button>
                <button onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer">
                  <Printer size={15} /> {t('Quote.ctaPrint')}
                </button>
                <button onClick={() => setQuote(null)}
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer">
                  <ArrowLeft size={15} /> {t('Quote.ctaEdit')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── Form view ─────────────────────────────────────────── */
  const err = (v: string) => attempted && !String(v).trim();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{t('Quote.title')}</h1>
          <p className="text-gray-600 mt-2">{t('Quote.subtitle')}</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 sm:p-8 space-y-6">

          {/* Scope */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
              {t('Quote.scopeLabel')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: 'international' as const, label: `🌍 ${t('Quote.scopeIntl')}`, sub: t('Quote.scopeIntlSub') },
                { v: 'local' as const, label: `🚛 ${t('Quote.scopeLocal')}`, sub: t('Quote.scopeLocalSub') },
              ]).map(s => (
                <button key={s.v} type="button" onClick={() => setScope(s.v)}
                  className="py-3 px-4 rounded-xl text-sm font-bold border-2 transition cursor-pointer text-left"
                  style={{
                    borderColor: scope === s.v ? '#1d4ed8' : 'transparent',
                    background: scope === s.v ? '#1d4ed815' : '#f9fafb',
                    color: scope === s.v ? '#1d4ed8' : '#6b7280',
                  }}>
                  <p>{s.label}</p>
                  <p className="text-xs font-normal mt-0.5 opacity-70">{s.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Origin */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">{t('Quote.originTitle')}</h2>
            <CountrySelect label={t('Quote.country')} value={senderCountry} onPick={pickSender}
              onlyCodes={scope === 'local' ? localAvailable : undefined}
              placeholder={t('Quote.selectCountry')} searchLabel={t('Quote.searchCountry')} noResults={t('Quote.noResults')} />
            {err(senderCountry) && <p className="text-xs text-red-500 -mt-2">{t('Quote.required')}</p>}
            {localUnsupported && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 -mt-2">
                <p className="text-xs font-semibold text-amber-700 flex items-start gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  {t('Quote.localUnavailable', { country: senderCountry })}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <StateSelect label={t('Quote.stateProvince')} country={senderCountry} value={senderState} onChange={setSenderState}
                  placeholder={t('Quote.selectState')} searchLabel={t('Quote.searchState')} noResults={t('Quote.noResults')} />
                {err(senderState) && <p className="text-xs text-red-500 mt-1">{t('Quote.required')}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('Quote.city')}</label>
                <input value={senderCity} onChange={e => setSenderCity(e.target.value)} placeholder={t('Quote.cityPlaceholder')}
                  className={inputCls} style={{ fontSize: '16px' }} />
                {err(senderCity) && <p className="text-xs text-red-500 mt-1">{t('Quote.required')}</p>}
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide pt-4">{t('Quote.destinationTitle')}</h2>
            <CountrySelect label={t('Quote.country')} value={receiverCountry}
              disabled={scope === 'local'}
              excludeCode={scope === 'international' ? senderCode : undefined}
              onPick={c => { setReceiverCountry(c.name); setReceiverCode(c.code); setReceiverState(''); }}
              placeholder={t('Quote.selectCountry')} searchLabel={t('Quote.searchCountry')} noResults={t('Quote.noResults')} />
            {scope === 'local' && (
              <p className="text-xs text-blue-700 flex items-center gap-1.5 -mt-2">
                <Info size={12} /> {t('Quote.localLocked')}
              </p>
            )}
            {err(receiverCountry) && <p className="text-xs text-red-500 -mt-2">{t('Quote.required')}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <StateSelect label={t('Quote.stateProvince')} country={receiverCountry} value={receiverState} onChange={setReceiverState}
                  placeholder={t('Quote.selectState')} searchLabel={t('Quote.searchState')} noResults={t('Quote.noResults')} />
                {err(receiverState) && <p className="text-xs text-red-500 mt-1">{t('Quote.required')}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('Quote.city')}</label>
                <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)} placeholder={t('Quote.cityPlaceholder')}
                  className={inputCls} style={{ fontSize: '16px' }} />
                {err(receiverCity) && <p className="text-xs text-red-500 mt-1">{t('Quote.required')}</p>}
              </div>
            </div>
          </div>

          {/* Package */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide pt-4">{t('Quote.packageTitle')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label={t('Quote.packageType')} value={shipmentType} onChange={setShipmentType} options={PACKAGE_TYPES}
                hint={isBulk ? t('Quote.hintBulkSea') : undefined} />
              <Select label={t('Quote.serviceLevel')} value={serviceLevel}
                onChange={v => setServiceLevel(v as 'Express' | 'Standard')}
                options={SERVICE_LEVELS}
                disabled={isBulk || chargeable >= 500}
                hint={isBulk || chargeable >= 500 ? t('Quote.hintForcedStandard') : undefined} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('Quote.weightKg')}</label>
              <input value={withCommas(weightKg)} onChange={e => setWeightKg(strip(e.target.value.replace(/[^0-9.,]/g, '')))}
                inputMode="decimal" placeholder="0" className={inputCls} style={{ fontSize: '16px' }} />
              {err(weightKg) && <p className="text-xs text-red-500 mt-1">{t('Quote.required')}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('Quote.dimensions')}</label>
              <div className="grid grid-cols-3 gap-2">
                <input value={withCommas(lengthCm)} onChange={e => setLengthCm(strip(e.target.value.replace(/[^0-9.,]/g, '')))}
                  inputMode="decimal" placeholder={t('Quote.length')} className={inputCls} style={{ fontSize: '16px' }} />
                <input value={withCommas(widthCm)} onChange={e => setWidthCm(strip(e.target.value.replace(/[^0-9.,]/g, '')))}
                  inputMode="decimal" placeholder={t('Quote.width')} className={inputCls} style={{ fontSize: '16px' }} />
                <input value={withCommas(heightCm)} onChange={e => setHeightCm(strip(e.target.value.replace(/[^0-9.,]/g, '')))}
                  inputMode="decimal" placeholder={t('Quote.height')} className={inputCls} style={{ fontSize: '16px' }} />
              </div>
              {attempted && (!lengthCm.trim() || !widthCm.trim() || !heightCm.trim()) && (
                <p className="text-xs text-red-500 mt-1">{t('Quote.dimensionsRequired')}</p>
              )}
              {vol > actual && actual > 0 && (
                <p className="text-xs text-amber-700 mt-1.5 flex items-start gap-1">
                  <Info size={11} className="shrink-0 mt-0.5" />
                  {t('Quote.volumetricHint', { vol: fmtMoney(vol), actual: fmtMoney(actual) })}
                </p>
              )}
              {overLimit && (
                <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1">
                  <AlertCircle size={11} className="shrink-0 mt-0.5" />
                  {t('Quote.errOverLimit')}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">{t('Quote.declaredValue')}</label>
              <div className="flex gap-2">
                <input value={withCommas(declaredValue)} onChange={e => setDeclaredValue(strip(e.target.value.replace(/[^0-9.,]/g, '')))}
                  inputMode="decimal" placeholder="0" className={inputCls} style={{ fontSize: '16px' }} />
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-900 focus:outline-none cursor-pointer"
                  style={{ fontSize: '16px' }}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400 mt-1">{t('Quote.declaredHint')}</p>
              {err(declaredValue) && <p className="text-xs text-red-500 mt-1">{t('Quote.required')}</p>}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button onClick={submit} disabled={loading || overLimit || localUnsupported}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> {t('Quote.calculating')}</>
              : <><Calculator size={16} /> {t('Quote.submit')}</>}
          </button>

          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            {t('Quote.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}