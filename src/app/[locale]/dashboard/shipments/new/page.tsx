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
  computeInvoice, DEFAULT_PRICING, type PricingProfiles, type ShipmentScope,
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
function CurrencySelect({ value, onChange, accentSolid = '#0b3aa4' }: { value: string; onChange: (v: string) => void; accentSolid?: string }) {
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
        <div className="absolute z-50 bottom-full mb-1 w-72 right-0 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input value={search} onChange={e => setSearch(e.target.value)}
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
                    className={`w-full text-left px-4 py-2.5 transition cursor-pointer ${value === c.code ? '' : 'hover:bg-gray-50 dark:hover:bg-white/10'}`}
style={value === c.code ? { background: `${accentSolid}15` } : {}}>
                    {i === 0 || filtered[i-1].country !== c.country ? (
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{c.country}</p>
                    ) : null}
                    <p className={`text-sm font-bold ${value === c.code ? '' : 'text-gray-900 dark:text-white'}`}
  style={value === c.code ? { color: accentSolid } : {}}>
  {c.code}
</p>
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
function CustomSelect({ value, onChange, options, placeholder, disabled, accentSolid = '#0b3aa4' }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; disabled?: boolean; accentSolid?: string;
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
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto max-h-52">
          {options.map(o => (
            <button key={o.value} type="button"
              onMouseDown={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition cursor-pointer ${value === o.value ? 'font-bold' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10'}`}
style={value === o.value ? { background: `${accentSolid}15`, color: accentSolid } : {}}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Country dropdown ─────────────────────────────────────────
function CountrySelect({ value, onChange, onEntry, label, disabled, excludeCode, accentSolid = '#0b3aa4' }: {
  value: string; onChange: (name: string) => void; onEntry?: (e: CountryEntry) => void;
  label: string; disabled?: boolean; excludeCode?: string; accentSolid?: string;
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.code} type="button"
                onMouseDown={() => { onChange(c.name); onEntry?.(c); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition cursor-pointer ${value === c.name ? 'font-semibold' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10'}`}
                style={value === c.name ? { background: `${accentSolid}15`, color: accentSolid } : {}}>
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
function StateSelect({ country, value, onChange, label, accentSolid = '#0b3aa4' }: {
  country: string; value: string; onChange: (v: string) => void; label: string; accentSolid?: string;
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search state…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(s => (
              <button key={s} type="button"
                onMouseDown={() => { onChange(s); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition cursor-pointer ${value === s ? 'font-semibold' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10'}`}
               style={value === s ? { background: `${accentSolid}15`, color: accentSolid } : {}}>
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
const PHONE_FORMATS: Record<string, { placeholder: string; pattern: string }> = {
  AF:{placeholder:'70 123 4567',pattern:'## ### ####'},
  AL:{placeholder:'66 123 4567',pattern:'## ### ####'},
  DZ:{placeholder:'551 23 45 67',pattern:'### ## ## ##'},
  AD:{placeholder:'312 345',pattern:'### ###'},
  AO:{placeholder:'923 123 456',pattern:'### ### ###'},
  AG:{placeholder:'(268) 234-5678',pattern:'(268) ###-####'},
  AR:{placeholder:'11 1234-5678',pattern:'## ####-####'},
  AM:{placeholder:'77 123 456',pattern:'## ### ###'},
  AU:{placeholder:'412 345 678',pattern:'### ### ###'},
  AT:{placeholder:'664 1234567',pattern:'### #######'},
  AZ:{placeholder:'50 123 45 67',pattern:'## ### ## ##'},
  BS:{placeholder:'(242) 234-5678',pattern:'(242) ###-####'},
  BH:{placeholder:'3600 1234',pattern:'#### ####'},
  BD:{placeholder:'1712-345678',pattern:'####-######'},
  BB:{placeholder:'(246) 234-5678',pattern:'(246) ###-####'},
  BY:{placeholder:'29 123-45-67',pattern:'## ###-##-##'},
  BE:{placeholder:'472 12 34 56',pattern:'### ## ## ##'},
  BZ:{placeholder:'622 3456',pattern:'### ####'},
  BJ:{placeholder:'90 12 34 56',pattern:'## ## ## ##'},
  BT:{placeholder:'17 123 456',pattern:'## ### ###'},
  BO:{placeholder:'7123 4567',pattern:'#### ####'},
  BA:{placeholder:'61 123 456',pattern:'## ### ###'},
  BW:{placeholder:'71 234 567',pattern:'## ### ###'},
  BR:{placeholder:'(11) 99999-9999',pattern:'(##) #####-####'},
  BN:{placeholder:'712 3456',pattern:'### ####'},
  BG:{placeholder:'87 123 4567',pattern:'## ### ####'},
  BF:{placeholder:'70 12 34 56',pattern:'## ## ## ##'},
  BI:{placeholder:'79 12 34 56',pattern:'## ## ## ##'},
  CV:{placeholder:'991 23 45',pattern:'### ## ##'},
  KH:{placeholder:'12 345 678',pattern:'## ### ###'},
  CM:{placeholder:'6712 3456',pattern:'#### ####'},
  CA:{placeholder:'(416) 555-0123',pattern:'(###) ###-####'},
  CF:{placeholder:'75 04 12 34',pattern:'## ## ## ##'},
  TD:{placeholder:'63 01 23 45',pattern:'## ## ## ##'},
  CL:{placeholder:'9 1234 5678',pattern:'# #### ####'},
  CN:{placeholder:'131 2345 6789',pattern:'### #### ####'},
  CO:{placeholder:'310 123 4567',pattern:'### ### ####'},
  KM:{placeholder:'321 23 45',pattern:'### ## ##'},
  CG:{placeholder:'6 123 4567',pattern:'# ### ####'},
  CD:{placeholder:'812 345 678',pattern:'### ### ###'},
  CR:{placeholder:'8312 3456',pattern:'#### ####'},
  HR:{placeholder:'91 234 5678',pattern:'## ### ####'},
  CU:{placeholder:'5 1234567',pattern:'# #######'},
  CY:{placeholder:'96 123456',pattern:'## ######'},
  CZ:{placeholder:'601 123 456',pattern:'### ### ###'},
  DK:{placeholder:'20 12 34 56',pattern:'## ## ## ##'},
  DJ:{placeholder:'77 83 12 34',pattern:'## ## ## ##'},
  DM:{placeholder:'(767) 234-5678',pattern:'(767) ###-####'},
  DO:{placeholder:'(809) 234-5678',pattern:'(809) ###-####'},
  EC:{placeholder:'99 123 4567',pattern:'## ### ####'},
  EG:{placeholder:'100 123 4567',pattern:'### ### ####'},
  SV:{placeholder:'7012 3456',pattern:'#### ####'},
  GQ:{placeholder:'222 123 456',pattern:'### ### ###'},
  ER:{placeholder:'7 123 456',pattern:'# ### ###'},
  EE:{placeholder:'5123 4567',pattern:'#### ####'},
  SZ:{placeholder:'7612 3456',pattern:'#### ####'},
  ET:{placeholder:'91 123 4567',pattern:'## ### ####'},
  FJ:{placeholder:'701 2345',pattern:'### ####'},
  FI:{placeholder:'41 2345678',pattern:'## #######'},
  FR:{placeholder:'6 12 34 56 78',pattern:'# ## ## ## ##'},
  GA:{placeholder:'6 12 34 56',pattern:'# ## ## ##'},
  GM:{placeholder:'301 2345',pattern:'### ####'},
  GE:{placeholder:'555 12 34 56',pattern:'### ## ## ##'},
  DE:{placeholder:'151 12345678',pattern:'### ########'},
  GH:{placeholder:'24 123 4567',pattern:'## ### ####'},
  GR:{placeholder:'694 123 4567',pattern:'### ### ####'},
  GD:{placeholder:'(473) 234-5678',pattern:'(473) ###-####'},
  GT:{placeholder:'5123 4567',pattern:'#### ####'},
  GN:{placeholder:'622 12 34 56',pattern:'### ## ## ##'},
  GW:{placeholder:'955 123 456',pattern:'### ### ###'},
  GY:{placeholder:'609 1234',pattern:'### ####'},
  HT:{placeholder:'34 12 3456',pattern:'## ## ####'},
  HN:{placeholder:'9812-3456',pattern:'####-####'},
  HU:{placeholder:'20 123 4567',pattern:'## ### ####'},
  IS:{placeholder:'611 1234',pattern:'### ####'},
  IN:{placeholder:'98765 43210',pattern:'##### #####'},
  ID:{placeholder:'812-3456-7890',pattern:'###-####-####'},
  IR:{placeholder:'912 345 6789',pattern:'### ### ####'},
  IQ:{placeholder:'791 123 4567',pattern:'### ### ####'},
  IE:{placeholder:'87 123 4567',pattern:'## ### ####'},
  IL:{placeholder:'50-123-4567',pattern:'##-###-####'},
  IT:{placeholder:'312 345 6789',pattern:'### ### ####'},
  CI:{placeholder:'7 12 34 56 78',pattern:'# ## ## ## ##'},
  JM:{placeholder:'(876) 234-5678',pattern:'(876) ###-####'},
  JP:{placeholder:'90-1234-5678',pattern:'##-####-####'},
  JO:{placeholder:'7 9012 3456',pattern:'# #### ####'},
  KZ:{placeholder:'700 123 45 67',pattern:'### ### ## ##'},
  KE:{placeholder:'712 345678',pattern:'### ######'},
  KI:{placeholder:'72012345',pattern:'########'},
  KP:{placeholder:'192 123 4567',pattern:'### ### ####'},
  KR:{placeholder:'10-1234-5678',pattern:'##-####-####'},
  KW:{placeholder:'500 12345',pattern:'### #####'},
  KG:{placeholder:'700 123 456',pattern:'### ### ###'},
  LA:{placeholder:'20 5512 3456',pattern:'## #### ####'},
  LV:{placeholder:'2123 4567',pattern:'#### ####'},
  LB:{placeholder:'3 123 456',pattern:'# ### ###'},
  LS:{placeholder:'5012 3456',pattern:'#### ####'},
  LR:{placeholder:'77 012 3456',pattern:'## ### ####'},
  LY:{placeholder:'91 123 4567',pattern:'## ### ####'},
  LI:{placeholder:'660 1234',pattern:'### ####'},
  LT:{placeholder:'612 34567',pattern:'### #####'},
  LU:{placeholder:'628 123 456',pattern:'### ### ###'},
  MG:{placeholder:'32 12 345 67',pattern:'## ## ### ##'},
  MW:{placeholder:'991 23 45 67',pattern:'### ## ## ##'},
  MY:{placeholder:'12-345 6789',pattern:'##-### ####'},
  MV:{placeholder:'777-1234',pattern:'###-####'},
  ML:{placeholder:'65 12 34 56',pattern:'## ## ## ##'},
  MT:{placeholder:'9961 2345',pattern:'#### ####'},
  MH:{placeholder:'235-1234',pattern:'###-####'},
  MR:{placeholder:'22 12 34 56',pattern:'## ## ## ##'},
  MU:{placeholder:'5252 1234',pattern:'#### ####'},
  MX:{placeholder:'55 1234 5678',pattern:'## #### ####'},
  FM:{placeholder:'350 1234',pattern:'### ####'},
  MD:{placeholder:'621 12 345',pattern:'### ## ###'},
  MC:{placeholder:'6 12 34 56 78',pattern:'# ## ## ## ##'},
  MN:{placeholder:'9912 3456',pattern:'#### ####'},
  ME:{placeholder:'67 123 456',pattern:'## ### ###'},
  MA:{placeholder:'612-345678',pattern:'###-######'},
  MZ:{placeholder:'82 123 4567',pattern:'## ### ####'},
  MM:{placeholder:'9 123 456 789',pattern:'# ### ### ###'},
  NA:{placeholder:'81 123 4567',pattern:'## ### ####'},
  NR:{placeholder:'444 1234',pattern:'### ####'},
  NP:{placeholder:'84-1234567',pattern:'##-#######'},
  NL:{placeholder:'6 12345678',pattern:'# ########'},
  NZ:{placeholder:'21 234 5678',pattern:'## ### ####'},
  NI:{placeholder:'8412 3456',pattern:'#### ####'},
  NE:{placeholder:'93 12 34 56',pattern:'## ## ## ##'},
  NG:{placeholder:'802 341 6524',pattern:'### ### ####'},
  NO:{placeholder:'412 34 567',pattern:'### ## ###'},
  OM:{placeholder:'9212 3456',pattern:'#### ####'},
  PK:{placeholder:'301-2345678',pattern:'###-#######'},
  PW:{placeholder:'775 1234',pattern:'### ####'},
  PS:{placeholder:'59 123 4567',pattern:'## ### ####'},
  PA:{placeholder:'6123-4567',pattern:'####-####'},
  PG:{placeholder:'7012 3456',pattern:'#### ####'},
  PY:{placeholder:'981 234 567',pattern:'### ### ###'},
  PE:{placeholder:'912 345 678',pattern:'### ### ###'},
  PH:{placeholder:'917 123 4567',pattern:'### ### ####'},
  PL:{placeholder:'512 345 678',pattern:'### ### ###'},
  PT:{placeholder:'912 345 678',pattern:'### ### ###'},
  QA:{placeholder:'3312 3456',pattern:'#### ####'},
  RO:{placeholder:'712 345 678',pattern:'### ### ###'},
  RU:{placeholder:'912 345-67-89',pattern:'### ###-##-##'},
  RW:{placeholder:'721 123 456',pattern:'### ### ###'},
  KN:{placeholder:'(869) 234-5678',pattern:'(869) ###-####'},
  LC:{placeholder:'(758) 234-5678',pattern:'(758) ###-####'},
  VC:{placeholder:'(784) 234-5678',pattern:'(784) ###-####'},
  WS:{placeholder:'72 12345',pattern:'## #####'},
  SM:{placeholder:'66 66 12 34',pattern:'## ## ## ##'},
  ST:{placeholder:'981 2345',pattern:'### ####'},
  SA:{placeholder:'50 123 4567',pattern:'## ### ####'},
  SN:{placeholder:'77 123 45 67',pattern:'## ### ## ##'},
  RS:{placeholder:'60 1234567',pattern:'## #######'},
  SC:{placeholder:'2 512 345',pattern:'# ### ###'},
  SL:{placeholder:'25 123456',pattern:'## ######'},
  SG:{placeholder:'9123 4567',pattern:'#### ####'},
  SK:{placeholder:'912 123 456',pattern:'### ### ###'},
  SI:{placeholder:'40 123 456',pattern:'## ### ###'},
  SB:{placeholder:'74 12345',pattern:'## #####'},
  SO:{placeholder:'61 234 567',pattern:'## ### ###'},
  ZA:{placeholder:'71 234 5678',pattern:'## ### ####'},
  SS:{placeholder:'977 123 456',pattern:'### ### ###'},
  ES:{placeholder:'612 345 678',pattern:'### ### ###'},
  LK:{placeholder:'71 234 5678',pattern:'## ### ####'},
  SD:{placeholder:'91 123 4567',pattern:'## ### ####'},
  SR:{placeholder:'741 2345',pattern:'### ####'},
  SE:{placeholder:'70 123 45 67',pattern:'## ### ## ##'},
  CH:{placeholder:'76 123 45 67',pattern:'## ### ## ##'},
  SY:{placeholder:'944 123 456',pattern:'### ### ###'},
  TW:{placeholder:'912-345-678',pattern:'###-###-###'},
  TJ:{placeholder:'917 12 3456',pattern:'### ## ####'},
  TZ:{placeholder:'712 345 678',pattern:'### ### ###'},
  TH:{placeholder:'81 234 5678',pattern:'## ### ####'},
  TL:{placeholder:'7712 3456',pattern:'#### ####'},
  TG:{placeholder:'90 12 34 56',pattern:'## ## ## ##'},
  TO:{placeholder:'7715 123',pattern:'#### ###'},
  TT:{placeholder:'(868) 234-5678',pattern:'(868) ###-####'},
  TN:{placeholder:'20 123 456',pattern:'## ### ###'},
  TR:{placeholder:'532 123 45 67',pattern:'### ### ## ##'},
  TM:{placeholder:'8 65 123456',pattern:'# ## ######'},
  TV:{placeholder:'901 234',pattern:'### ###'},
  UG:{placeholder:'712 345678',pattern:'### ######'},
  UA:{placeholder:'50 123 4567',pattern:'## ### ####'},
  AE:{placeholder:'50 123 4567',pattern:'## ### ####'},
  GB:{placeholder:'7400 123456',pattern:'#### ######'},
  US:{placeholder:'(201) 555-0123',pattern:'(###) ###-####'},
  UY:{placeholder:'94 123 456',pattern:'## ### ###'},
  UZ:{placeholder:'90 123 45 67',pattern:'## ### ## ##'},
  VU:{placeholder:'591 2345',pattern:'### ####'},
  VA:{placeholder:'6 698 12345',pattern:'# ### #####'},
  VE:{placeholder:'412-123 4567',pattern:'###-### ####'},
  VN:{placeholder:'91 234 56 78',pattern:'## ### ## ##'},
  YE:{placeholder:'712 123 456',pattern:'### ### ###'},
  ZM:{placeholder:'95 123 4567',pattern:'## ### ####'},
  ZW:{placeholder:'71 234 5678',pattern:'## ### ####'},
};

function applyPhonePattern(digits: string, pattern: string): string {
  let result = ''; let di = 0;
  for (let i = 0; i < pattern.length && di < digits.length; i++) {
    if (pattern[i] === '#') result += digits[di++];
    else result += pattern[i];
  }
  return result;
}

function DialDropdown({ dial, flag, onChange }: {
  dial: string; flag: string; onChange: (dial: string, flag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() =>
    COUNTRIES_WITH_STATES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search)
    ), [search]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => { setOpen(v => !v); setSearch(''); }}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 h-full min-h-[48px] cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition">
        {flag
  ? <img src={`https://flagcdn.com/w20/${flag}.png`} width="18" height="13" alt="" className="rounded-sm shrink-0" />
  : <span className="w-5 h-3.5 rounded-sm bg-gray-200 dark:bg-white/20 shrink-0 block" />
}
<span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[36px]">{dial || '+?'}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country or code…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.code} type="button"
                onMouseDown={() => { onChange(c.dial, c.code.toLowerCase()); setOpen(false); setSearch(''); }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-white/10 transition cursor-pointer">
                <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} width="18" height="13" alt="" className="rounded-sm shrink-0" />
                <span className="font-semibold text-gray-700 dark:text-gray-200 w-10 shrink-0">{c.dial}</span>
                <span className="text-gray-500 dark:text-gray-400 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneInput({ countryCode, value, onChange, label, initialDial, initialFlag }: {
  countryCode: string; value: string; onChange: (v: string) => void; label: string;
  initialDial?: string; initialFlag?: string;
}) {
  const [dial, setDial] = useState('');
  const [flagCode, setFlagCode] = useState('');
  const [dialCountryCode, setDialCountryCode] = useState('');
  const [local, setLocal] = useState('');
  const initializedRef = useRef(false);
  const prevCountryRef = useRef('');

  // When country changes externally, update dial ONLY if user hasn't manually changed it
  useEffect(() => {
    if (initializedRef.current) return;
    // Use profile's saved dial if provided, otherwise use country
    if (initialDial && initialFlag) {
      setDial(initialDial);
      setFlagCode(initialFlag);
      const code = COUNTRIES_WITH_STATES.find(c => c.code.toLowerCase() === initialFlag)?.code || '';
      setDialCountryCode(code);
      initializedRef.current = true;
    } else if (countryCode) {
      const e = COUNTRIES_WITH_STATES.find(c => c.code === countryCode);
      if (e) {
        setDial(e.dial);
        setFlagCode(e.code.toLowerCase());
        setDialCountryCode(e.code);
        initializedRef.current = true;
      }
    }
  }, [countryCode, initialDial, initialFlag]);

  // Pre-fill from profile — runs only once when value first arrives
  const valueInitRef = useRef(false);
useEffect(() => {
  if (valueInitRef.current) return;
  if (!value) return;
  valueInitRef.current = true;

  // Get raw digits from the full phone value
  const allDigits = value.replace(/\D/g, '');

  // Try to strip the dial code digits from the front
  const dialToStrip = initialDial || COUNTRIES_WITH_STATES.find(c => c.code === countryCode)?.dial || '';
  const dialDigits = dialToStrip.replace(/\D/g, '');

  if (dialDigits && allDigits.startsWith(dialDigits)) {
    setLocal(allDigits.slice(dialDigits.length));
  } else {
    setLocal(allDigits);
  }
}, [value]); // eslint-disable-line

  const fmt = PHONE_FORMATS[dialCountryCode] || PHONE_FORMATS[countryCode] || { placeholder: '123 456 7890', pattern: '### ### ####' };
  const displayLocal = applyPhonePattern(local, fmt.pattern);

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <DialDropdown
          dial={dial}
          flag={flagCode}
          onChange={(newDial, newFlag) => {
            const newCode = COUNTRIES_WITH_STATES.find(c => c.code.toLowerCase() === newFlag)?.code || '';
            setDial(newDial);
            setFlagCode(newFlag);
            setDialCountryCode(newCode);
            setLocal('');
            onChange('');
          }}
        />
        <input
          value={displayLocal}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, '');
            setLocal(digits);
            onChange(digits ? `${dial} ${digits}` : '');
          }}
          inputMode="numeric"
          placeholder={fmt.placeholder}
          className={`${inputCls} flex-1`}
          style={{ fontSize: '16px' }}
        />
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
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
  { value: 'Documents', label: 'Documents' },
  { value: 'Parcel', label: 'Parcel' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Food & Perishables', label: 'Food & Perishables' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Machinery', label: 'Machinery' },
  { value: 'Bulk / Pallet', label: 'Bulk / Pallet' },
  { value: 'Container', label: 'Container' },
  { value: 'Other', label: 'Other' },
];

const SERVICE_LEVELS = [
  { value: 'Express', label: 'Express — Fastest available' },
  { value: 'Standard', label: 'Standard — Economy speed' },
];

// ─── Main page ────────────────────────────────────────────────
export default function NewShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const router = useRouter();
  const { data: session } = useSession();

  const [accent, setAccent] = useState('linear-gradient(135deg, #0b3aa4, #0e7490)');
  const [accentSolid, setAccentSolid] = useState('#0b3aa4');

const [isDarkTheme, setIsDarkTheme] = useState(false);
useEffect(() => {
  const check = () => {
    const t = localStorage.getItem('exodus_theme_cache');
    setIsDarkTheme(t === 'midnight');
  };
  check();
  window.addEventListener('storage', check);
  const i = setInterval(check, 1000);
  return () => { window.removeEventListener('storage', check); clearInterval(i); };
}, []);

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
    fetch('/api/pricing', { cache: 'no-store' })
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
  const [profilePhone, setProfilePhone] = useState('');
const [profileDialCode, setProfileDialCode] = useState('');
const [profileDialFlag, setProfileDialFlag] = useState('');

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

  // Field refs for scroll-to-error
const refSenderName = useRef<HTMLDivElement>(null);
const refSenderEmail = useRef<HTMLDivElement>(null);
const refSenderCountry = useRef<HTMLDivElement>(null);
const refSenderStreet = useRef<HTMLDivElement>(null);
const refSenderCity = useRef<HTMLDivElement>(null);
const refSenderPostal = useRef<HTMLDivElement>(null);
const refSenderState = useRef<HTMLDivElement>(null);
const refSenderPhone = useRef<HTMLDivElement>(null);
const refReceiverName = useRef<HTMLDivElement>(null);
const refReceiverEmail = useRef<HTMLDivElement>(null);
const refReceiverCountry = useRef<HTMLDivElement>(null);
const refReceiverStreet = useRef<HTMLDivElement>(null);
const refReceiverCity = useRef<HTMLDivElement>(null);
const refReceiverPostal = useRef<HTMLDivElement>(null);
const refReceiverState = useRef<HTMLDivElement>(null);
const refReceiverPhone = useRef<HTMLDivElement>(null);
const refWeightKg = useRef<HTMLDivElement>(null);
const refLengthCm = useRef<HTMLDivElement>(null);
const refWidthCm = useRef<HTMLDivElement>(null);
const refHeightCm = useRef<HTMLDivElement>(null);
const refPackageDescription = useRef<HTMLDivElement>(null);
const refDeclaredValue = useRef<HTMLDivElement>(null);

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
       if (data.phone) {
  setSenderPhone(data.phone);
  setProfilePhone(data.phone);
}
// Save profile dial code separately
if (data.phoneDialCode) {
  const dialEntry = COUNTRIES_WITH_STATES.find(c => c.code === data.phoneDialCode);
  if (dialEntry) {
    setProfileDialCode(dialEntry.dial);
    setProfileDialFlag(dialEntry.code.toLowerCase());
  }
}

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
  setAttempted(false);
  setError('');
  // Reset receiver fields
  setReceiverName('');
  // ... rest unchanged
  setReceiverEmail('');
  setReceiverCountry('');
  setReceiverCountryCode('');
  setReceiverState('');
  setReceiverCity('');
  setReceiverStreet('');
  setReceiverPostal('');
  setReceiverPhone('');

  // Reset package details
  setWeightKg('');
  setLengthCm('');
  setWidthCm('');
  setHeightCm('');
  setPackageDescription('');
  setDeclaredValue('');

  // Reset selections
  setPackageType('Parcel');
  setCustomPackageType('');
  setServiceLevel('Express');

  // If local → lock receiver country
  if (scope === 'local') {
    setReceiverCountry(senderCountry);
    setReceiverCountryCode(senderCountryCode);
  }
}, [scope]);

  const weight = parseFloat(weightKg) || 0;

  // Fix 6: force sea + standard if weight >= 300kg
  const isBulkOrContainer = packageType === 'Container' || packageType === 'Bulk / Pallet';

const effectiveServiceLevel: ServiceLevel = useMemo(() => {
  if (isBulkOrContainer || (scope === 'international' && weight >= 300)) return 'Standard';
  return serviceLevel;
}, [scope, weight, serviceLevel, isBulkOrContainer]);

const effectiveShipmentType = useMemo(() => {
  return packageType as ShipmentType;
}, [packageType]);

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
    const effectiveReceiverCode = receiverCountryCode || (scope === 'local' ? senderCountryCode : '');
  if (!pricing || !senderCountryCode || !effectiveReceiverCode || weight <= 0) return null;
   try {
    // Merge with defaults to fill any missing air/sea/land fields
    const safePricing = {
      ...DEFAULT_PRICING,
      ...pricing,
      air: { ...DEFAULT_PRICING.air, ...(pricing.air || {}) },
      sea: { ...DEFAULT_PRICING.sea, ...(pricing.sea || {}) },
      land: { ...DEFAULT_PRICING.land, ...(pricing.land || {}) },
    };
    return computeInvoice({
  scope, means, serviceLevel: effectiveServiceLevel,
  weightKg: weight,
  declaredValue: parseFloat(declaredValue) || 0,
  currency,
  senderCountryCode,
  receiverCountryCode: effectiveReceiverCode,
  senderCity, senderState,
  receiverCity, receiverState,
  pricing: safePricing,
});
  } catch (e) {
    console.error('Invoice error:', e);
    return null;
  }
  }, [pricing, scope, means, effectiveServiceLevel, weight, declaredValue, currency,
      senderCountryCode, receiverCountryCode, senderCity, senderState, receiverCity, receiverState]);

      

  const showDefaultCheckbox = profileHasAddress && !addressManuallyChanged;
  const showTwoCheckboxes = !profileHasAddress || addressManuallyChanged;

  const handleSenderAddressChange = (field: string, value: string) => {
  if (field === 'street') setSenderStreet(value);
  if (field === 'city') setSenderCity(value);
  if (field === 'state') setSenderState(value);
  if (field === 'postal') setSenderPostal(value);

  // Check if all fields match the profile address — if so revert to default checkbox
  const next = {
    street: field === 'street' ? value : senderStreet,
    city: field === 'city' ? value : senderCity,
    state: field === 'state' ? value : senderState,
    postal: field === 'postal' ? value : senderPostal,
  };
  const matchesProfile =
  next.street.trim() === profileAddress.street.trim() &&
  next.city.trim() === profileAddress.city.trim() &&
  next.state.trim() === profileAddress.state.trim() &&
  next.postal.trim() === profileAddress.postal.trim();

  if (profileHasAddress && matchesProfile) {
    setAddressManuallyChanged(false);
    setUseDefaultAddress(true);
  } else {
    setAddressManuallyChanged(true);
    setUseDefaultAddress(false);
  }
};

  const handleSenderCountryChange = (name: string, code: string) => {
    setSenderCountry(name); setSenderCountryCode(code);
    setSenderState(''); setAddressManuallyChanged(true); setUseDefaultAddress(false);
    const c = COUNTRY_CURRENCY[code]; if (c) setCurrency(c);
  };

  const requiredFields: {
  v: string;
  l: string;
  ref: React.MutableRefObject<HTMLDivElement | null>;
}[] = [
  { v: senderName, l: 'Sender full name', ref: refSenderName },
  { v: senderEmail, l: 'Sender email', ref: refSenderEmail },
  { v: senderCountry, l: 'Sender country', ref: refSenderCountry },
  { v: senderStreet, l: 'Sender street address', ref: refSenderStreet },
  { v: senderCity, l: 'Sender city', ref: refSenderCity },
  { v: senderPostal, l: 'Sender postal code', ref: refSenderPostal },
  { v: senderState, l: 'Sender state / province', ref: refSenderState },
  { v: senderPhone, l: 'Sender phone number', ref: refSenderPhone },
  { v: receiverName, l: 'Receiver full name', ref: refReceiverName },
  { v: receiverEmail, l: 'Receiver email', ref: refReceiverEmail },
  { v: receiverCountry, l: 'Receiver country', ref: refReceiverCountry },
  { v: receiverStreet, l: 'Receiver street address', ref: refReceiverStreet },
  { v: receiverCity, l: 'Receiver city', ref: refReceiverCity },
  { v: receiverPostal, l: 'Receiver postal code', ref: refReceiverPostal },
  { v: receiverState, l: 'Receiver state / province', ref: refReceiverState },
  { v: receiverPhone, l: 'Receiver phone number', ref: refReceiverPhone },
  { v: weightKg, l: 'Weight', ref: refWeightKg },
  { v: lengthCm, l: 'Length', ref: refLengthCm },
  { v: widthCm, l: 'Width', ref: refWidthCm },
  { v: heightCm, l: 'Height', ref: refHeightCm },
  { v: packageDescription, l: 'Package description', ref: refPackageDescription },
  { v: declaredValue, l: 'Declared value', ref: refDeclaredValue },
];
const firstMissing = requiredFields.find(f => !f.v?.trim());
const isValid = !firstMissing;

  const finalPackageType = packageType === 'Other' ? (customPackageType || 'Other') : packageType;

  const handleSubmit = async () => {
  setAttempted(true);
  setError('');

  const missing = requiredFields.find(f => !f.v?.trim());
  if (missing) {
    setError(`${missing.l} is required.`);
    missing.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const dv = parseFloat(declaredValue);
  if (!dv || dv <= 0) { setError('Declared value must be greater than 0.'); return; }
  // ... rest of your existing submit code unchanged
    setLoading(true);
    try {
      if (saveAsHome) {
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
      <div className="text-center">
  <h1 className="text-xl font-extrabold" style={{ color: isDarkTheme ? '#ffffff' : undefined }}>New Shipment</h1>
  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Fill in the details below to create your shipment</p>
</div>

      {/* Fix 1: Scope toggle using theme color */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
        <Label>Shipment Type</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {([
            { v: 'international' as ShipmentScope, label: '🌍 International', sub: 'Cross-border' },
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
          <div ref={refSenderName}>
  <Label>Full Name</Label>
  <input value={senderName} onChange={e => setSenderName(e.target.value)}
    placeholder="Full name"
    className={`${inputCls} ${attempted && !senderName.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !senderName.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
          <div ref={refSenderEmail}>
  <Label>Email</Label>
  <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
    type="email" placeholder="Email address"
    className={`${inputCls} ${attempted && !senderEmail.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !senderEmail.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        </div>
        <div ref={refSenderCountry}>
  <CountrySelect label="Country" value={senderCountry} accentSolid={accentSolid}
    onChange={name => { const e = getCountryByName(name); if (e) handleSenderCountryChange(e.name, e.code); }}
    onEntry={e => handleSenderCountryChange(e.name, e.code)} />
  {attempted && !senderCountry && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        <div ref={refSenderStreet}>
  <Label>Street Address</Label>
  <input value={senderStreet} onChange={e => handleSenderAddressChange('street', e.target.value)}
    placeholder="Street address"
    className={`${inputCls} ${attempted && !senderStreet.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !senderStreet.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        <div className="grid grid-cols-2 gap-3">
  <div ref={refSenderCity}>
    <Label>City</Label>
    <input value={senderCity} onChange={e => handleSenderAddressChange('city', e.target.value)}
      placeholder="City"
      className={`${inputCls} ${attempted && !senderCity.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
      style={{ fontSize: '16px' }} />
    {attempted && !senderCity.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
  </div>
  <div ref={refSenderPostal}>
    <Label>Postal Code</Label>
    <input value={senderPostal} onChange={e => handleSenderAddressChange('postal', e.target.value.replace(/\D/g, ''))}
      placeholder="Postal code" inputMode="numeric"
      className={`${inputCls} ${attempted && !senderPostal.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
      style={{ fontSize: '16px' }} />
    {attempted && !senderPostal.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
  </div>
</div>
        <div ref={refSenderState}>
  <StateSelect country={senderCountry} value={senderState} accentSolid={accentSolid}
    onChange={v => handleSenderAddressChange('state', v)} label="State / Province" />
  {attempted && !senderState.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>

<div ref={refSenderPhone}>
  <PhoneInput countryCode={senderCountryCode} value={senderPhone} onChange={setSenderPhone} label="Phone"
    initialDial={profileDialCode || undefined} initialFlag={profileDialFlag || undefined} />
  {attempted && !senderPhone.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>

        <div className="space-y-2">
  {profileHasAddress && (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input type="checkbox" checked={useDefaultAddress}
        onChange={e => {
          setUseDefaultAddress(e.target.checked);
          if (e.target.checked) {
            setSenderStreet(profileAddress.street); setSenderCity(profileAddress.city);
            setSenderState(profileAddress.state); setSenderPostal(profileAddress.postal);
            setAddressManuallyChanged(false);
            setSaveAsHome(false);
          } else {
            setSenderStreet(''); setSenderCity('');
            setSenderState(''); setSenderPostal('');
            setAddressManuallyChanged(true);
          }
        }}
        className="w-4 h-4 rounded" style={{ accentColor: accentSolid }} />
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Use my home address</span>
    </label>
  )}
  {!useDefaultAddress && (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <input type="checkbox" checked={saveAsHome} onChange={e => setSaveAsHome(e.target.checked)}
        className="w-4 h-4 rounded" style={{ accentColor: accentSolid }} />
      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Save as my home address</span>
    </label>
  )}
</div>
      </Section>

      {/* Receiver */}
      <Section title="Receiver Information" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div ref={refReceiverName}>
  <Label>Full Name</Label>
  <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
    placeholder="Full name"
    className={`${inputCls} ${attempted && !receiverName.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !receiverName.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
          <div ref={refReceiverEmail}>
  <Label>Email</Label>
  <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)}
    type="email" placeholder="Email address"
    className={`${inputCls} ${attempted && !receiverEmail.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !receiverEmail.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        </div>
        <div ref={refReceiverCountry}>
  <CountrySelect label="Country" value={receiverCountry} accentSolid={accentSolid}
    disabled={scope === 'local'}
    excludeCode={scope === 'international' ? senderCountryCode : undefined}
    onChange={name => { const e = getCountryByName(name); if (e) { setReceiverCountry(e.name); setReceiverCountryCode(e.code); setReceiverState(''); } }}
    onEntry={e => { setReceiverCountry(e.name); setReceiverCountryCode(e.code); }} />
  {attempted && !receiverCountry && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        {scope === 'local' && (
          <p className="text-xs flex items-center gap-1.5 -mt-2" style={{ color: accentSolid }}>
            <Info size={12} /> Same country as sender for local shipments
          </p>
        )}
        <div ref={refReceiverStreet}>
  <Label>Street Address</Label>
  <input value={receiverStreet} onChange={e => setReceiverStreet(e.target.value)}
    placeholder="Street address"
    className={`${inputCls} ${attempted && !receiverStreet.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !receiverStreet.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        <div className="grid grid-cols-2 gap-3">
  <div ref={refReceiverCity}>
    <Label>City</Label>
    <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)}
      placeholder="City"
      className={`${inputCls} ${attempted && !receiverCity.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
      style={{ fontSize: '16px' }} />
    {attempted && !receiverCity.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
  </div>
  <div ref={refReceiverPostal}>
    <Label>Postal Code</Label>
    <input value={receiverPostal} onChange={e => setReceiverPostal(e.target.value.replace(/\D/g, ''))}
      placeholder="Postal code" inputMode="numeric"
      className={`${inputCls} ${attempted && !receiverPostal.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
      style={{ fontSize: '16px' }} />
    {attempted && !receiverPostal.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
  </div>
</div>
        <div ref={refReceiverState}>
  <StateSelect country={receiverCountry} value={receiverState} accentSolid={accentSolid}
    onChange={setReceiverState} label="State / Province" />
  {attempted && !receiverState.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
       <div ref={refReceiverPhone}>
  <PhoneInput
    key={`${scope}-${receiverCountryCode}`}
    countryCode={receiverCountryCode}
    value=""
    onChange={setReceiverPhone}
    label="Phone"
  />
  {attempted && !receiverPhone.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
      </Section>

      {/* Package */}
      <Section title="Package Details" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
  <Label>Package Type</Label>
  <CustomSelect value={packageType} onChange={setPackageType} options={PACKAGE_TYPES} accentSolid={accentSolid} />
  {isBulkOrContainer && (
    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
      <Info size={11} /> This package type uses Sea Freight automatically
    </p>
  )}
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
              disabled={means === 'sea'}
              accentSolid={accentSolid}
            />
            {means === 'sea' && weight < 300 && (
  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
    <Info size={11} /> Sea freight is always Standard
  </p>
)}
          </div>
          <div ref={refWeightKg}>
  <Label>Weight (kg)</Label>
  <input value={weightKg} onChange={e => setWeightKg(e.target.value.replace(/[^0-9.]/g, ''))}
    inputMode="decimal" placeholder="e.g. 2.5"
    className={`${inputCls} ${attempted && !weightKg.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !weightKg.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
  {scope === 'international' && weight >= 300 && !isBulkOrContainer && (
    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
      <Info size={11} /> 299+ kg uses Sea Freight (Standard) automatically.
    </p>
  )}
</div>
          <div className="sm:col-span-2">
  <Label>Dimensions (cm) — L × W × H</Label>
  <div className="grid grid-cols-3 gap-2">
    <div ref={refLengthCm}>
      <input value={lengthCm} onChange={e => setLengthCm(e.target.value.replace(/[^0-9.]/g, ''))}
        inputMode="decimal" placeholder="Length"
        className={`${inputCls} ${attempted && !lengthCm.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
        style={{ fontSize: '16px' }} />
      {attempted && !lengthCm.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
    </div>
    <div ref={refWidthCm}>
      <input value={widthCm} onChange={e => setWidthCm(e.target.value.replace(/[^0-9.]/g, ''))}
        inputMode="decimal" placeholder="Width"
        className={`${inputCls} ${attempted && !widthCm.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
        style={{ fontSize: '16px' }} />
      {attempted && !widthCm.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
    </div>
    <div ref={refHeightCm}>
      <input value={heightCm} onChange={e => setHeightCm(e.target.value.replace(/[^0-9.]/g, ''))}
        inputMode="decimal" placeholder="Height"
        className={`${inputCls} ${attempted && !heightCm.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
        style={{ fontSize: '16px' }} />
      {attempted && !heightCm.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
    </div>
  </div>
</div>
          <div ref={refPackageDescription} className="sm:col-span-2">
  <Label>Package Description</Label>
  <input value={packageDescription} onChange={e => setPackageDescription(e.target.value)}
    placeholder="e.g. Electronics, Clothing, Documents..."
    className={`${inputCls} ${attempted && !packageDescription.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !packageDescription.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
        </div>

        {/* Auto-selected means — Fix 7: date range */}
        {(weight > 0 || isBulkOrContainer) && (
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
            
          </div>
        )}
      </Section>

      {/* Declared value — Fix 8: country currency + custom dropdown */}
      <Section title="Declared Value" accent={accent}>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Used to calculate insurance and freight charges.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div ref={refDeclaredValue}>
  <Label>Declared Value</Label>
  <input value={declaredValue} onChange={e => setDeclaredValue(e.target.value.replace(/[^0-9.]/g, ''))}
    inputMode="decimal" placeholder="e.g. 500"
    className={`${inputCls} ${attempted && !declaredValue.trim() ? 'border-red-400 dark:border-red-500' : ''}`}
    style={{ fontSize: '16px' }} />
  {attempted && !declaredValue.trim() && <p className="text-xs text-red-500 mt-1">Required</p>}
</div>
          <div>
            <Label>Currency</Label>
            <CurrencySelect value={currency} onChange={setCurrency} accentSolid={accentSolid} />
          </div>
        </div>
      </Section>

      {/* Invoice breakdown — Fix 9 */}
      
      {pricing && !breakdown && weight > 0 && senderCountryCode && (receiverCountryCode || scope === 'local') && (
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