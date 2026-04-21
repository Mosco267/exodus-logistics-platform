// src/app/[locale]/dashboard/shipments/new/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Package, ChevronDown, Loader2, CheckCircle2,
  AlertCircle, ArrowLeft, Send, Info,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { COUNTRIES_WITH_STATES, getCountryByName, type CountryEntry } from '@/lib/countriesData';
import {
  autoSelectMeans, getDeliveryDays, getEstimatedDeliveryDate,
  computeInvoice, type PricingProfiles, type ShipmentScope,
  type ServiceLevel, type ShipmentType, type ShipmentMeans,
} from '@/lib/pricing';

// ─── Country → Currency map ───────────────────────────────────
const COUNTRY_CURRENCY: Record<string, string> = {
  US:'USD',CA:'CAD',GB:'GBP',AU:'AUD',NZ:'NZD',EU:'EUR',
  DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',PT:'EUR',NL:'EUR',BE:'EUR',AT:'EUR',
  FI:'EUR',IE:'EUR',GR:'EUR',SK:'EUR',SI:'EUR',EE:'EUR',LV:'EUR',LT:'EUR',
  LU:'EUR',MT:'EUR',CY:'EUR',
  NG:'NGN',GH:'GHS',KE:'KES',ZA:'ZAR',EG:'EGP',TZ:'TZS',UG:'UGX',
  RW:'RWF',ET:'ETB',MA:'MAD',TN:'TND',DZ:'DZD',SD:'SDG',SN:'XOF',
  CI:'XOF',ML:'XOF',BF:'XOF',NE:'XOF',BJ:'XOF',TG:'XOF',GN:'GNF',
  CM:'XAF',TD:'XAF',CF:'XAF',GA:'XAF',CG:'XAF',CD:'CDF',AO:'AOA',
  MZ:'MZN',ZM:'ZMW',ZW:'ZWL',BW:'BWP',NA:'NAD',LS:'LSL',SZ:'SZL',
  MW:'MWK',MG:'MGA',MU:'MUR',SC:'SCR',CV:'CVE',ST:'STN',KM:'KMF',
  DJ:'DJF',ER:'ERN',SO:'SOS',LY:'LYD',MR:'MRU',
  IN:'INR',CN:'CNY',JP:'JPY',KR:'KRW',ID:'IDR',MY:'MYR',TH:'THB',
  PH:'PHP',VN:'VND',BD:'BDT',PK:'PKR',LK:'LKR',NP:'NPR',MM:'MMK',
  KH:'KHR',LA:'LAK',TW:'TWD',SG:'SGD',BN:'BND',MV:'MVR',BT:'BTN',
  MN:'MNT',KZ:'KZT',UZ:'UZS',TM:'TMT',KG:'KGS',TJ:'TJS',AZ:'AZN',
  GE:'GEL',AM:'AMD',
  AE:'AED',SA:'SAR',QA:'QAR',KW:'KWD',BH:'BHD',OM:'OMR',JO:'JOD',
  LB:'LBP',IQ:'IQD',IR:'IRR',YE:'YER',SY:'SYP',IL:'ILS',PS:'ILS',
  TR:'TRY',
  BR:'BRL',AR:'ARS',CO:'COP',CL:'CLP',PE:'PEN',VE:'VES',EC:'USD',
  BO:'BOB',PY:'PYG',UY:'UYU',GY:'GYD',SR:'SRD',
  MX:'MXN',GT:'GTQ',HN:'HNL',SV:'USD',NI:'NIO',CR:'CRC',PA:'PAB',
  CU:'CUP',DO:'DOP',HT:'HTG',JM:'JMD',TT:'TTD',BB:'BBD',
  BS:'BSD',AG:'XCD',DM:'XCD',GD:'XCD',KN:'XCD',LC:'XCD',VC:'XCD',
  NO:'NOK',SE:'SEK',DK:'DKK',CH:'CHF',PL:'PLN',CZ:'CZK',HU:'HUF',
  RO:'RON',BG:'BGN',HR:'HRK',RS:'RSD',AL:'ALL',MK:'MKD',BA:'BAM',
  ME:'EUR',MD:'MDL',UA:'UAH',BY:'BYN',RU:'RUB',
  PG:'PGK',FJ:'FJD',SB:'SBD',VU:'VUV',WS:'WST',TO:'TOP',KI:'AUD',
  FM:'USD',MH:'USD',PW:'USD',NR:'AUD',TV:'AUD',
  AF:'AFN',
};

// ─── All world currencies for dropdown ───────────────────────
const ALL_CURRENCIES = [
  { code:'USD', name:'US Dollar', country:'United States' },
  { code:'EUR', name:'Euro', country:'Eurozone' },
  { code:'GBP', name:'British Pound', country:'United Kingdom' },
  { code:'JPY', name:'Japanese Yen', country:'Japan' },
  { code:'CAD', name:'Canadian Dollar', country:'Canada' },
  { code:'AUD', name:'Australian Dollar', country:'Australia' },
  { code:'CHF', name:'Swiss Franc', country:'Switzerland' },
  { code:'CNY', name:'Chinese Yuan', country:'China' },
  { code:'HKD', name:'Hong Kong Dollar', country:'Hong Kong' },
  { code:'SGD', name:'Singapore Dollar', country:'Singapore' },
  { code:'SEK', name:'Swedish Krona', country:'Sweden' },
  { code:'NOK', name:'Norwegian Krone', country:'Norway' },
  { code:'DKK', name:'Danish Krone', country:'Denmark' },
  { code:'NZD', name:'New Zealand Dollar', country:'New Zealand' },
  { code:'MXN', name:'Mexican Peso', country:'Mexico' },
  { code:'BRL', name:'Brazilian Real', country:'Brazil' },
  { code:'INR', name:'Indian Rupee', country:'India' },
  { code:'KRW', name:'South Korean Won', country:'South Korea' },
  { code:'TWD', name:'New Taiwan Dollar', country:'Taiwan' },
  { code:'IDR', name:'Indonesian Rupiah', country:'Indonesia' },
  { code:'MYR', name:'Malaysian Ringgit', country:'Malaysia' },
  { code:'THB', name:'Thai Baht', country:'Thailand' },
  { code:'PHP', name:'Philippine Peso', country:'Philippines' },
  { code:'VND', name:'Vietnamese Dong', country:'Vietnam' },
  { code:'PKR', name:'Pakistani Rupee', country:'Pakistan' },
  { code:'BDT', name:'Bangladeshi Taka', country:'Bangladesh' },
  { code:'LKR', name:'Sri Lankan Rupee', country:'Sri Lanka' },
  { code:'NPR', name:'Nepalese Rupee', country:'Nepal' },
  { code:'AED', name:'UAE Dirham', country:'UAE' },
  { code:'SAR', name:'Saudi Riyal', country:'Saudi Arabia' },
  { code:'QAR', name:'Qatari Rial', country:'Qatar' },
  { code:'KWD', name:'Kuwaiti Dinar', country:'Kuwait' },
  { code:'BHD', name:'Bahraini Dinar', country:'Bahrain' },
  { code:'OMR', name:'Omani Rial', country:'Oman' },
  { code:'JOD', name:'Jordanian Dinar', country:'Jordan' },
  { code:'ILS', name:'Israeli Shekel', country:'Israel' },
  { code:'TRY', name:'Turkish Lira', country:'Turkey' },
  { code:'NGN', name:'Nigerian Naira', country:'Nigeria' },
  { code:'GHS', name:'Ghanaian Cedi', country:'Ghana' },
  { code:'KES', name:'Kenyan Shilling', country:'Kenya' },
  { code:'ZAR', name:'South African Rand', country:'South Africa' },
  { code:'EGP', name:'Egyptian Pound', country:'Egypt' },
  { code:'ETB', name:'Ethiopian Birr', country:'Ethiopia' },
  { code:'TZS', name:'Tanzanian Shilling', country:'Tanzania' },
  { code:'UGX', name:'Ugandan Shilling', country:'Uganda' },
  { code:'MAD', name:'Moroccan Dirham', country:'Morocco' },
  { code:'DZD', name:'Algerian Dinar', country:'Algeria' },
  { code:'TND', name:'Tunisian Dinar', country:'Tunisia' },
  { code:'XOF', name:'West African CFA', country:'West Africa' },
  { code:'XAF', name:'Central African CFA', country:'Central Africa' },
  { code:'RWF', name:'Rwandan Franc', country:'Rwanda' },
  { code:'AOA', name:'Angolan Kwanza', country:'Angola' },
  { code:'MZN', name:'Mozambican Metical', country:'Mozambique' },
  { code:'ZMW', name:'Zambian Kwacha', country:'Zambia' },
  { code:'PLN', name:'Polish Zloty', country:'Poland' },
  { code:'CZK', name:'Czech Koruna', country:'Czech Republic' },
  { code:'HUF', name:'Hungarian Forint', country:'Hungary' },
  { code:'RON', name:'Romanian Leu', country:'Romania' },
  { code:'BGN', name:'Bulgarian Lev', country:'Bulgaria' },
  { code:'HRK', name:'Croatian Kuna', country:'Croatia' },
  { code:'RSD', name:'Serbian Dinar', country:'Serbia' },
  { code:'UAH', name:'Ukrainian Hryvnia', country:'Ukraine' },
  { code:'RUB', name:'Russian Ruble', country:'Russia' },
  { code:'KZT', name:'Kazakhstani Tenge', country:'Kazakhstan' },
  { code:'ARS', name:'Argentine Peso', country:'Argentina' },
  { code:'CLP', name:'Chilean Peso', country:'Chile' },
  { code:'COP', name:'Colombian Peso', country:'Colombia' },
  { code:'PEN', name:'Peruvian Sol', country:'Peru' },
  { code:'UYU', name:'Uruguayan Peso', country:'Uruguay' },
  { code:'BOB', name:'Bolivian Boliviano', country:'Bolivia' },
  { code:'PYG', name:'Paraguayan Guaraní', country:'Paraguay' },
  { code:'GTQ', name:'Guatemalan Quetzal', country:'Guatemala' },
  { code:'DOP', name:'Dominican Peso', country:'Dominican Republic' },
  { code:'CRC', name:'Costa Rican Colón', country:'Costa Rica' },
  { code:'NIO', name:'Nicaraguan Córdoba', country:'Nicaragua' },
  { code:'HNL', name:'Honduran Lempira', country:'Honduras' },
  { code:'PAB', name:'Panamanian Balboa', country:'Panama' },
  { code:'MXN', name:'Mexican Peso', country:'Mexico' },
  { code:'MMK', name:'Myanmar Kyat', country:'Myanmar' },
  { code:'KHR', name:'Cambodian Riel', country:'Cambodia' },
  { code:'LAK', name:'Lao Kip', country:'Laos' },
  { code:'AFN', name:'Afghan Afghani', country:'Afghanistan' },
  { code:'IRR', name:'Iranian Rial', country:'Iran' },
  { code:'IQD', name:'Iraqi Dinar', country:'Iraq' },
  { code:'LBP', name:'Lebanese Pound', country:'Lebanon' },
  { code:'SYP', name:'Syrian Pound', country:'Syria' },
  { code:'YER', name:'Yemeni Rial', country:'Yemen' },
  { code:'PGK', name:'Papua New Guinean Kina', country:'Papua New Guinea' },
  { code:'FJD', name:'Fijian Dollar', country:'Fiji' },
  { code:'XCD', name:'East Caribbean Dollar', country:'East Caribbean' },
  { code:'TTD', name:'Trinidad & Tobago Dollar', country:'Trinidad & Tobago' },
  { code:'JMD', name:'Jamaican Dollar', country:'Jamaica' },
  { code:'BBD', name:'Barbadian Dollar', country:'Barbados' },
  { code:'BSD', name:'Bahamian Dollar', country:'Bahamas' },
].sort((a, b) => a.code.localeCompare(b.code));

// ─── Currency dropdown ────────────────────────────────────────
function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() =>
    ALL_CURRENCIES.filter(c =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const selected = ALL_CURRENCIES.find(c => c.code === value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(v => !v); setSearch(''); }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white cursor-pointer transition hover:border-gray-300 dark:hover:border-white/20 text-left">
        <span className="font-bold">{selected?.code || value}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-72 right-0 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search currency…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((c, i) => {
              const prevCountry = i > 0 ? filtered[i - 1].country : null;
              const showDivider = i > 0 && prevCountry !== c.country;
              return (
                <div key={c.code}>
                  {showDivider && <div className="h-px bg-gray-100 dark:bg-white/10 mx-3" />}
                  <button type="button"
                    onMouseDown={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-white/10 transition cursor-pointer ${value === c.code ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}>
                    {i === 0 || filtered[i-1].country !== c.country ? (
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{c.country}</p>
                    ) : null}
                    <p className={`text-sm font-bold ${value === c.code ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{c.code}</p>
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition";
const labelCls = "text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block";

function Label({ children }: { children: React.ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

// ─── Custom Select Dropdown ───────────────────────────────────
function CustomSelect({ value, onChange, options, placeholder, disabled }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-left transition cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-300 dark:hover:border-white/20'}`}>
        <span className={selected ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-400'}>
          {selected?.label || placeholder || 'Select…'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          {options.map(o => (
            <button key={o.value} type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-white/10 transition cursor-pointer ${value === o.value ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold' : 'text-gray-800 dark:text-gray-200'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Country dropdown ─────────────────────────────────────────
function CountrySelect({ value, onChange, onEntry, label, disabled, excludeCode }: {
  value: string; onChange: (name: string) => void; onEntry?: (e: CountryEntry) => void;
  label: string; disabled?: boolean; excludeCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    COUNTRIES_WITH_STATES.filter(c =>
      (!excludeCode || c.code !== excludeCode) &&
      c.name.toLowerCase().includes(search.toLowerCase())
    ), [search, excludeCode]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = getCountryByName(value);

  return (
    <div ref={ref} className="relative">
      <Label>{label}</Label>
      <button type="button" disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(v => !v); setSearch(''); } }}
        className={`${inputCls} flex items-center justify-between cursor-pointer text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <span className="flex items-center gap-2">
          {selected
            ? <><img src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`} width="20" height="15" alt={selected.name} className="rounded-sm shrink-0" /><span>{selected.name}</span></>
            : <span className="text-gray-400">Select country…</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="fixed z-[999] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden" style={{ width: ref.current?.offsetWidth, top: (ref.current?.getBoundingClientRect().bottom || 0) + 4, left: ref.current?.getBoundingClientRect().left }}>
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.code} type="button"
                onMouseDown={() => { onChange(c.name); onEntry?.(c); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-white/10 transition cursor-pointer ${value === c.name ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-800 dark:text-gray-200'}`}>
                <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} width="20" height="15" alt={c.name} className="rounded-sm shrink-0" />
                <span>{c.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── State dropdown ───────────────────────────────────────────
function StateSelect({ country, value, onChange, label }: {
  country: string; value: string; onChange: (v: string) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const entry = getCountryByName(country);
  const states = entry?.states || [];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = states.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  if (states.length === 0) {
    return (
      <div>
        <Label>{label}</Label>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="State / Province"
          className={inputCls} style={{ fontSize: '16px' }} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Label>{label}</Label>
      <button type="button" onClick={() => { setOpen(v => !v); setSearch(''); }}
        className={`${inputCls} flex items-center justify-between cursor-pointer text-left`}>
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{value || 'Select state…'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="fixed z-[999] rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden" style={{ width: ref.current?.offsetWidth, top: (ref.current?.getBoundingClientRect().bottom || 0) + 4, left: ref.current?.getBoundingClientRect().left }}>
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search state…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(s => (
              <button key={s} type="button"
                onMouseDown={() => { onChange(s); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-white/10 transition cursor-pointer ${value === s ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-800 dark:text-gray-200'}`}>
                {s}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No results</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Phone input ──────────────────────────────────────────────
const PHONE_FORMATS: Record<string, { placeholder: string; maxLen: number }> = {
  US: { placeholder: '(201) 555-0123', maxLen: 10 },
  GB: { placeholder: '7400 123456', maxLen: 10 },
  NG: { placeholder: '802 341 6524', maxLen: 10 },
  IN: { placeholder: '98765 43210', maxLen: 10 },
  CN: { placeholder: '131 2345 6789', maxLen: 11 },
  DE: { placeholder: '151 12345678', maxLen: 11 },
  FR: { placeholder: '6 12 34 56 78', maxLen: 9 },
  AU: { placeholder: '412 345 678', maxLen: 9 },
  AE: { placeholder: '50 123 4567', maxLen: 9 },
  BR: { placeholder: '11 99999-9999', maxLen: 11 },
  ZA: { placeholder: '71 234 5678', maxLen: 9 },
  GH: { placeholder: '24 123 4567', maxLen: 9 },
  KE: { placeholder: '712 345678', maxLen: 9 },
};

function PhoneInput({ countryCode, value, onChange, label }: {
  countryCode: string; value: string; onChange: (v: string) => void; label: string;
}) {
  const entry = COUNTRIES_WITH_STATES.find(c => c.code === countryCode);
  const fmt = PHONE_FORMATS[countryCode] || { placeholder: '123 456 7890', maxLen: 12 };
  const [dial, setDial] = useState(entry?.dial || '');
  const [local, setLocal] = useState('');

  useEffect(() => {
    const d = COUNTRIES_WITH_STATES.find(c => c.code === countryCode)?.dial || '';
    setDial(d);
    setLocal('');
    onChange(d);
  }, [countryCode]); // eslint-disable-line

  // Pre-fill if value already has a number
  useEffect(() => {
    if (value && entry?.dial && value.startsWith(entry.dial)) {
      setLocal(value.slice(entry.dial.length).trim().replace(/\D/g, ''));
    }
  }, []); // eslint-disable-line

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-3 shrink-0">
          {entry && <img src={`https://flagcdn.com/w20/${entry.code.toLowerCase()}.png`} width="18" height="13" alt="" className="rounded-sm" />}
          <input value={dial} onChange={e => { setDial(e.target.value); onChange(`${e.target.value} ${local}`.trim()); }}
            className="w-14 bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none" />
        </div>
        <input value={local}
          onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, fmt.maxLen); setLocal(v); onChange(`${dial} ${v}`.trim()); }}
          inputMode="numeric" placeholder={fmt.placeholder}
          className={`${inputCls} flex-1`} style={{ fontSize: '16px' }} />
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-white/10">
        <div className="w-2 h-5 rounded-full" style={{ background: accent }} />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Means config ─────────────────────────────────────────────
const MEANS_CONFIG: Record<ShipmentMeans, { label: string; emoji: string; color: string }> = {
  air: { label: 'Air Freight', emoji: '✈️', color: '#0891b2' },
  sea: { label: 'Sea Freight', emoji: '🚢', color: '#1d4ed8' },
  land: { label: 'Land Freight', emoji: '🚛', color: '#059669' },
};

// ─── Package types ────────────────────────────────────────────
const PACKAGE_TYPES = [
  { value: 'Documents', label: '📄 Documents' },
  { value: 'Parcel', label: '📦 Parcel' },
  { value: 'Electronics', label: '💻 Electronics' },
  { value: 'Clothing', label: '👕 Clothing' },
  { value: 'Food & Perishables', label: '🥩 Food & Perishables' },
  { value: 'Furniture', label: '🛋️ Furniture' },
  { value: 'Machinery', label: '⚙️ Machinery' },
  { value: 'Bulk / Pallet', label: '🏗️ Bulk / Pallet' },
  { value: 'Container', label: '🚢 Container' },
  { value: 'Other', label: '📝 Other' },
];

const SERVICE_LEVELS = [
  { value: 'Express', label: '⚡ Express — Fastest available' },
  { value: 'Standard', label: '📅 Standard — Economy speed' },
];

// ─── Main page ────────────────────────────────────────────────
export default function NewShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session } = useSession();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');
  useEffect(() => {
    const map: Record<string, { g: string; s: string }> = {
      default: { g: 'linear-gradient(135deg, #0b3aa4, #0e7490)', s: '#0b3aa4' },
      ocean: { g: 'linear-gradient(135deg, #0e7490, #06b6d4)', s: '#0891b2' },
      sunset: { g: 'linear-gradient(135deg, #0b3aa4, #f97316)', s: '#f97316' },
      arctic: { g: 'linear-gradient(135deg, #0284c7, #bae6fd)', s: '#0284c7' },
      midnight: { g: 'linear-gradient(135deg, #0f172a, #0e7490)', s: '#06b6d4' },
    };
    const apply = () => { const c = localStorage.getItem('exodus_theme_cache'); if (c && map[c]) { setAccent(map[c].g); setAccentSolid(map[c].s); } };
    apply();
    window.addEventListener('storage', apply);
    const t = setInterval(apply, 1000);
    return () => { window.removeEventListener('storage', apply); clearInterval(t); };
  }, []);

  const [pricing, setPricing] = useState<PricingProfiles | null>(null);
  const [pricingError, setPricingError] = useState(false);
  useEffect(() => {
    fetch('/api/admin/pricing', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.settings) setPricing(d.settings); else setPricingError(true); })
      .catch(() => setPricingError(true));
  }, []);

  const [scope, setScope] = useState<ShipmentScope>('international');
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>('Express');
  const [packageType, setPackageType] = useState<string>('Parcel');
  const [customPackageType, setCustomPackageType] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderCountry, setSenderCountry] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState('');
  const [senderState, setSenderState] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderStreet, setSenderStreet] = useState('');
  const [senderPostal, setSenderPostal] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const [profileHasAddress, setProfileHasAddress] = useState(false);
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [isHomeAddress, setIsHomeAddress] = useState(false);
  const [saveAsHome, setSaveAsHome] = useState(false);
  const [profileAddress, setProfileAddress] = useState({ street: '', city: '', state: '', postal: '' });
  const [addressManuallyChanged, setAddressManuallyChanged] = useState(false);

  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverCountry, setReceiverCountry] = useState('');
  const [receiverCountryCode, setReceiverCountryCode] = useState('');
  const [receiverState, setReceiverState] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverStreet, setReceiverStreet] = useState('');
  const [receiverPostal, setReceiverPostal] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  const [weightKg, setWeightKg] = useState('');
  const [lengthCm, setLengthCm] = useState('');
  const [widthCm, setWidthCm] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [attempted, setAttempted] = useState(false);

  // Load profile
  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        if (data.name) setSenderName(data.name);
        if (data.email) setSenderEmail(data.email);
        const entry = getCountryByName(data.country || '');
        if (entry) {
          setSenderCountry(entry.name);
          setSenderCountryCode(entry.code);
          // Auto-set currency from country
          const countryCurrency = COUNTRY_CURRENCY[entry.code];
          if (countryCurrency) setCurrency(countryCurrency);
        }
        if (data.phone) setSenderPhone(data.phone);

        const hasAddr = !!(data.addressStreet || data.addressCity);
        setProfileHasAddress(hasAddr);
        if (hasAddr) {
          const pa = { street: data.addressStreet || '', city: data.addressCity || '', state: data.addressState || '', postal: data.addressPostalCode || '' };
          setProfileAddress(pa);
          setSenderStreet(pa.street); setSenderCity(pa.city);
          setSenderState(pa.state); setSenderPostal(pa.postal);
          setUseDefaultAddress(true);
        }
      })
      .catch(() => {});
  }, []);

  // Lock receiver country for local
  useEffect(() => {
    if (scope === 'local') {
      setReceiverCountry(senderCountry);
      setReceiverCountryCode(senderCountryCode);
    }
  }, [scope, senderCountry, senderCountryCode]);

  const weight = parseFloat(weightKg) || 0;

  // Fix 6: force sea + standard if weight >= 300kg
  const effectiveServiceLevel: ServiceLevel = useMemo(() => {
    if (scope === 'international' && weight >= 300) return 'Standard';
    return serviceLevel;
  }, [scope, weight, serviceLevel]);

  const effectiveShipmentType = useMemo(() => {
    if (scope === 'international' && weight >= 300) return 'Bulk / Pallet' as ShipmentType;
    return packageType as ShipmentType;
  }, [scope, weight, packageType]);

  const means: ShipmentMeans = useMemo(() =>
    autoSelectMeans(scope, effectiveServiceLevel, weight, effectiveShipmentType),
    [scope, effectiveServiceLevel, weight, effectiveShipmentType]
  );

  const delivery = useMemo(() => getDeliveryDays(means, effectiveServiceLevel), [means, effectiveServiceLevel]);

  // Fix 7: date range display
  const deliveryDateStr = useMemo(() => {
    if (weight <= 0) return '';
    const { min, max } = delivery;
    const minDate = new Date();
    let addedMin = 0;
    while (addedMin < min) { minDate.setDate(minDate.getDate() + 1); if (minDate.getDay() !== 0 && minDate.getDay() !== 6) addedMin++; }
    const maxDate = new Date(minDate);
    let addedMax = 0;
    while (addedMax < (max - min)) { maxDate.setDate(maxDate.getDate() + 1); if (maxDate.getDay() !== 0 && maxDate.getDay() !== 6) addedMax++; }
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const fmtFull = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (min === max) return fmtFull(minDate);
    // Same month: "24–26 Apr 2026"
    if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) {
      return `${minDate.getDate()}–${maxDate.getDate()} ${maxDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
    }
    return `${fmt(minDate)} – ${fmtFull(maxDate)}`;
  }, [delivery, weight]);

  const deliveryDateISO = useMemo(() => getEstimatedDeliveryDate(means, effectiveServiceLevel), [means, effectiveServiceLevel]);

  const breakdown = useMemo(() => {
    if (!pricing || !senderCountryCode || !receiverCountryCode || weight <= 0) return null;
    try {
      return computeInvoice({
        scope, means, serviceLevel: effectiveServiceLevel,
        weightKg: weight,
        declaredValue: parseFloat(declaredValue) || 0,
        currency,
        senderCountryCode, receiverCountryCode,
        senderCity, senderState,
        receiverCity, receiverState,
        pricing,
      });
    } catch { return null; }
  }, [pricing, scope, means, effectiveServiceLevel, weight, declaredValue, currency,
      senderCountryCode, receiverCountryCode, senderCity, senderState, receiverCity, receiverState]);

  const showDefaultCheckbox = profileHasAddress && !addressManuallyChanged;
  const showTwoCheckboxes = !profileHasAddress || addressManuallyChanged;

  const handleSenderAddressChange = (field: string, value: string) => {
    setAddressManuallyChanged(true); setUseDefaultAddress(false);
    if (field === 'street') setSenderStreet(value);
    if (field === 'city') setSenderCity(value);
    if (field === 'state') setSenderState(value);
    if (field === 'postal') setSenderPostal(value);
  };

  const handleSenderCountryChange = (name: string, code: string) => {
    setSenderCountry(name); setSenderCountryCode(code);
    setSenderState(''); setAddressManuallyChanged(true); setUseDefaultAddress(false);
    const c = COUNTRY_CURRENCY[code]; if (c) setCurrency(c);
  };

  const requiredFields = [
    { v: senderName, l: 'Sender name' }, { v: senderEmail, l: 'Sender email' },
    { v: senderCountry, l: 'Sender country' }, { v: senderState, l: 'Sender state' },
    { v: senderCity, l: 'Sender city' }, { v: senderStreet, l: 'Sender address' },
    { v: senderPhone, l: 'Sender phone' }, { v: receiverName, l: 'Receiver name' },
    { v: receiverEmail, l: 'Receiver email' }, { v: receiverCountry, l: 'Receiver country' },
    { v: receiverState, l: 'Receiver state' }, { v: receiverCity, l: 'Receiver city' },
    { v: receiverStreet, l: 'Receiver address' }, { v: receiverPhone, l: 'Receiver phone' },
    { v: weightKg, l: 'Weight' }, { v: declaredValue, l: 'Declared value' },
  ];
  const firstMissing = requiredFields.find(f => !f.v?.trim())?.l || '';
  const isValid = !firstMissing;

  const finalPackageType = packageType === 'Other' ? (customPackageType || 'Other') : packageType;

  const handleSubmit = async () => {
    setAttempted(true); setError('');
    if (!isValid) { setError(`${firstMissing} is required.`); return; }
    const dv = parseFloat(declaredValue);
    if (!dv || dv <= 0) { setError('Declared value must be greater than 0.'); return; }
    setLoading(true);
    try {
      if (saveAsHome || isHomeAddress) {
        await fetch('/api/user/profile', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: senderName, phone: senderPhone, country: senderCountry, addressStreet: senderStreet, addressCity: senderCity, addressState: senderState, addressPostalCode: senderPostal }),
        });
      }
      const res = await fetch('/api/shipments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderCountryCode, destinationCountryCode: receiverCountryCode,
          senderName, senderEmail, senderCountry, senderState, senderCity,
          senderAddress: senderStreet, senderPostalCode: senderPostal, senderPhone,
          receiverName, receiverEmail, receiverCountry, receiverState, receiverCity,
          receiverAddress: receiverStreet, receiverPostalCode: receiverPostal, receiverPhone,
          shipmentScope: scope, serviceLevel: effectiveServiceLevel,
          shipmentType: finalPackageType, shipmentMeans: MEANS_CONFIG[means].label,
          packageDescription, estimatedDeliveryDate: deliveryDateISO,
          weightKg: weight,
          dimensionsCm: lengthCm || widthCm || heightCm ? { length: parseFloat(lengthCm)||0, width: parseFloat(widthCm)||0, height: parseFloat(heightCm)||0 } : null,
          declaredValue: dv, declaredValueCurrency: currency,
          createdByUserId: (session?.user as any)?.id || '',
          createdByEmail: session?.user?.email || '',
          status: 'Created',
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error || 'Failed to create shipment.'); return; }
      setCreatedId(json?.shipment?.shipmentId || '');
      setShowSuccess(true);
    } catch (e: any) { setError(e?.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
          <ArrowLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">New Shipment</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Fill in the details below to create your shipment</p>
        </div>
      </div>

      {/* Fix 1: Scope toggle using theme color */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
        <Label>Shipment Type</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {([
            { v: 'international' as ShipmentScope, label: '🌍 International', sub: 'Cross-border delivery' },
            { v: 'local' as ShipmentScope, label: '🚛 Local', sub: 'Within your country' },
          ]).map(s => (
            <button key={s.v} type="button"
              onClick={() => { setScope(s.v); setReceiverState(''); setReceiverCity(''); setReceiverStreet(''); }}
              className="py-3 px-4 rounded-xl text-sm font-bold border-2 transition cursor-pointer text-left"
              style={{
                borderColor: scope === s.v ? accentSolid : 'transparent',
                background: scope === s.v ? `${accentSolid}15` : '#f9fafb',
                color: scope === s.v ? accentSolid : '#6b7280',
              }}>
              <p>{s.label}</p>
              <p className="text-xs font-normal mt-0.5 opacity-70">{s.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sender */}
      <Section title="Sender Information" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <input value={senderName} onChange={e => setSenderName(e.target.value)}
              placeholder="Full name" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Email</Label>
            <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
              type="email" placeholder="Email address" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <CountrySelect label="Country" value={senderCountry}
          onChange={name => { const e = getCountryByName(name); if (e) handleSenderCountryChange(e.name, e.code); }}
          onEntry={e => handleSenderCountryChange(e.name, e.code)} />
        <div>
          <Label>Street Address</Label>
          <input value={senderStreet} onChange={e => handleSenderAddressChange('street', e.target.value)}
            placeholder="Street address" className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <input value={senderCity} onChange={e => handleSenderAddressChange('city', e.target.value)}
              placeholder="City" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <input value={senderPostal} onChange={e => handleSenderAddressChange('postal', e.target.value.replace(/\D/g, ''))}
              placeholder="Postal code" inputMode="numeric" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <StateSelect country={senderCountry} value={senderState}
          onChange={v => handleSenderAddressChange('state', v)} label="State / Province" />
        <PhoneInput countryCode={senderCountryCode} value={senderPhone} onChange={setSenderPhone} label="Phone" />

        {showDefaultCheckbox && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={useDefaultAddress}
              onChange={e => {
                setUseDefaultAddress(e.target.checked);
                if (e.target.checked) { setSenderStreet(profileAddress.street); setSenderCity(profileAddress.city); setSenderState(profileAddress.state); setSenderPostal(profileAddress.postal); setAddressManuallyChanged(false); }
              }}
              className="w-4 h-4 rounded" style={{ accentColor: accentSolid }} />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Use my default address</span>
          </label>
        )}
        {showTwoCheckboxes && (
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={isHomeAddress} onChange={e => setIsHomeAddress(e.target.checked)}
                className="w-4 h-4 rounded" style={{ accentColor: accentSolid }} />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">This is a home address</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={saveAsHome} onChange={e => setSaveAsHome(e.target.checked)}
                className="w-4 h-4 rounded" style={{ accentColor: accentSolid }} />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Save as my home address</span>
            </label>
          </div>
        )}
      </Section>

      {/* Receiver */}
      <Section title="Receiver Information" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
              placeholder="Full name" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Email</Label>
            <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)}
              type="email" placeholder="Email address" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <CountrySelect label="Country" value={receiverCountry}
          disabled={scope === 'local'}
          excludeCode={scope === 'international' ? senderCountryCode : undefined}
          onChange={name => { const e = getCountryByName(name); if (e) { setReceiverCountry(e.name); setReceiverCountryCode(e.code); setReceiverState(''); } }}
          onEntry={e => { setReceiverCountry(e.name); setReceiverCountryCode(e.code); }} />
        {scope === 'local' && (
          <p className="text-xs flex items-center gap-1.5 -mt-2" style={{ color: accentSolid }}>
            <Info size={12} /> Same country as sender for local shipments
          </p>
        )}
        <div>
          <Label>Street Address</Label>
          <input value={receiverStreet} onChange={e => setReceiverStreet(e.target.value)}
            placeholder="Street address" className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)}
              placeholder="City" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <input value={receiverPostal} onChange={e => setReceiverPostal(e.target.value.replace(/\D/g, ''))}
              placeholder="Postal code" inputMode="numeric" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <StateSelect country={receiverCountry} value={receiverState} onChange={setReceiverState} label="State / Province" />
        <PhoneInput countryCode={receiverCountryCode} value={receiverPhone} onChange={setReceiverPhone} label="Phone" />
      </Section>

      {/* Package */}
      <Section title="Package Details" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Package Type</Label>
            <CustomSelect value={packageType} onChange={setPackageType} options={PACKAGE_TYPES} />
          </div>
          {packageType === 'Other' && (
            <div>
              <Label>Specify Package Type</Label>
              <input value={customPackageType} onChange={e => setCustomPackageType(e.target.value)}
                placeholder="Describe your package..." className={inputCls} style={{ fontSize: '16px' }} />
            </div>
          )}
          <div>
            <Label>Service Level</Label>
            <CustomSelect
              value={effectiveServiceLevel}
              onChange={v => setServiceLevel(v as ServiceLevel)}
              options={SERVICE_LEVELS}
              disabled={means === 'sea' || (scope === 'international' && weight >= 300)}
            />
            {(means === 'sea' || (scope === 'international' && weight >= 300)) && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Info size={11} /> {weight >= 300 ? 'Auto-set to Standard for heavy shipments' : 'Sea freight is always Standard'}
              </p>
            )}
          </div>
          <div>
            <Label>Weight (kg)</Label>
            <input value={weightKg} onChange={e => setWeightKg(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" placeholder="e.g. 2.5" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div className="sm:col-span-2">
            <Label>Dimensions (cm) — L × W × H</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: lengthCm, set: setLengthCm, ph: 'Length' },
                { val: widthCm, set: setWidthCm, ph: 'Width' },
                { val: heightCm, set: setHeightCm, ph: 'Height' },
              ].map(({ val, set, ph }) => (
                <input key={ph} value={val} onChange={e => set(e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal" placeholder={ph}
                  className={inputCls} style={{ fontSize: '16px' }} />
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Package Description</Label>
            <input value={packageDescription} onChange={e => setPackageDescription(e.target.value)}
              placeholder="e.g. Electronics, Clothing, Documents..." className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>

        {/* Auto-selected means — Fix 7: date range */}
        {weight > 0 && (
          <div className="rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 overflow-hidden">
            <div className="flex items-center gap-3 p-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/10 shadow-sm">
                {MEANS_CONFIG[means].emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{MEANS_CONFIG[means].label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Auto-selected · {delivery.label}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Est. Delivery</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-0.5">{deliveryDateStr}</p>
              </div>
            </div>
            {scope === 'international' && weight >= 300 && (
              <div className="px-3.5 pb-3 flex items-center gap-1.5">
                <Info size={11} className="text-amber-500 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-400">Weight ≥ 300kg — automatically switched to Sea Freight (Standard)</p>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Declared value — Fix 8: country currency + custom dropdown */}
      <Section title="Declared Value" accent={accent}>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Used to calculate insurance and freight charges.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Declared Value</Label>
            <input value={declaredValue} onChange={e => setDeclaredValue(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" placeholder="e.g. 500" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Currency</Label>
            <CurrencySelect value={currency} onChange={setCurrency} />
          </div>
        </div>
      </Section>

      {/* Invoice breakdown — Fix 9 */}
      {pricingError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={14} className="shrink-0" /> Pricing settings not configured. Contact your admin.
        </div>
      )}
      {pricing && !breakdown && weight > 0 && senderCountryCode && receiverCountryCode && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm text-gray-500">
          <Loader2 size={14} className="animate-spin shrink-0" /> Calculating invoice…
        </div>
      )}
      {breakdown && (
        <Section title="Invoice Breakdown" accent={accent}>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Estimated invoice — final amount confirmed on payment page.</p>
          <div className="space-y-2 text-sm">
            {[
              { label: `Base Freight (${MEANS_CONFIG[means].label})`, value: breakdown.baseFreight },
              { label: 'Fuel Surcharge', value: breakdown.fuel },
              { label: 'Insurance', value: breakdown.insurance },
              { label: 'Handling Fee', value: breakdown.handling },
              ...(breakdown.customs > 0 ? [{ label: 'Customs Clearance', value: breakdown.customs }] : []),
              ...(breakdown.tax > 0 ? [{ label: 'Tax', value: breakdown.tax }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{label}</span>
                <span className="font-semibold">{currency} {value.toFixed(2)}</span>
              </div>
            ))}
            {breakdown.discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="font-semibold">− {currency} {breakdown.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-gray-900 dark:text-white border-t border-gray-100 dark:border-white/10 pt-3 mt-1 text-base">
              <span>Total</span>
              <span style={{ color: accentSolid }}>{currency} {breakdown.total.toFixed(2)}</span>
            </div>
          </div>
        </Section>
      )}

      {attempted && error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400 font-medium">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading || (!pricing && !pricingError)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
        style={{ background: accent }}>
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Creating shipment…</>
          : !pricing && !pricingError
          ? <><Loader2 size={16} className="animate-spin" /> Loading pricing…</>
          : <><Send size={16} /> Create Order</>}
      </button>

      {showSuccess && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-[92%] max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: accent }}>
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Shipment Created!</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Your shipment <strong className="text-gray-700 dark:text-gray-200">{createdId}</strong> has been created. Proceed to payment to confirm.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => router.push(`/${locale}/dashboard`)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition">
                Dashboard
              </button>
              <button onClick={() => router.push(`/${locale}/dashboard/shipments/${encodeURIComponent(createdId)}/payment`)}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer hover:opacity-90 transition"
                style={{ background: accent }}>
                Pay Now
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}