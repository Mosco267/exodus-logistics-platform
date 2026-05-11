"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle, CheckCircle2, Loader2, PlusCircle, ChevronDown, Info,
} from "lucide-react";
import {
  COUNTRIES_WITH_STATES,
  getCountryByName,
  type CountryEntry,
} from "@/lib/countriesData";
import {
  computeInvoice,
  autoSelectMeans,
  getDeliveryDays,
  DEFAULT_PRICING,
  type PricingProfiles,
  type ShipmentMeans,
  type ServiceLevel,
  type ShipmentScope,
  type ShipmentType,
} from "@/lib/pricing";
import { getCountryDistance, getStateDistance } from "@/lib/distances";
import { addBusinessDays } from "@/lib/holidays";

// ─── Currency list (same as user create shipment) ────────────────
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

// ─── Country → Currency map (same as user create shipment) ───────
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
  IN:'INR',CN:'CNY',JP:'JPY',KR:'KRW',ID:'IDR',MY:'MYR',TH:'THB',
  PH:'PHP',VN:'VND',BD:'BDT',PK:'PKR',LK:'LKR',NP:'NPR',
  AE:'AED',SA:'SAR',QA:'QAR',KW:'KWD',BH:'BHD',OM:'OMR',JO:'JOD',IL:'ILS',
  TR:'TRY',
  BR:'BRL',AR:'ARS',CO:'COP',CL:'CLP',PE:'PEN',
  MX:'MXN',
  NO:'NOK',SE:'SEK',DK:'DKK',CH:'CHF',PL:'PLN',CZ:'CZK',HU:'HUF',RO:'RON',
  RU:'RUB',UA:'UAH',
  HK:'HKD',SG:'SGD',TW:'TWD',
};

// ─── Number-formatting helpers (same as user page) ───────────────
function formatMoney(value: number): string {
  if (isNaN(value)) return '0.00';
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatWithCommas(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts.slice(1).join('').slice(0, 2) : '';
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withCommas + decPart;
}

function stripCommas(formatted: string): string {
  return formatted.replace(/,/g, '');
}

function cleanNumeric(raw: string): string {
  return stripCommas(raw.replace(/[^0-9.,]/g, ''));
}

function numericOnly(val: string, allowDecimal = true): string {
  if (allowDecimal) return val.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  return val.replace(/[^0-9]/g, "");
}

function toPct(rate: number) {
  const pct = Number(rate) * 100;
  return Number.isFinite(pct) ? pct.toFixed(2).replace(/\.?0+$/, "") : "0";
}
function fromPct(pct: string) {
  const n = Number(pct);
  return Number.isFinite(n) ? n / 100 : 0;
}
function toMoney(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? String(x) : "0";
}
function fromMoney(s: string) {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// ─── Country dropdown (with real flag images) ────────────────────
function CountrySelect({
  value, onChange, onCountryChange, label, required,
}: {
  value: string;
  onChange: (name: string) => void;
  onCountryChange?: (entry: CountryEntry | undefined) => void;
  label: string;
  required?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(
    () => COUNTRIES_WITH_STATES.filter(c => c.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const selected = getCountryByName(value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <button
        type="button"
        onClick={() => { setOpen(v => !v); setSearch(""); }}
        className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <span className="flex items-center gap-2">
          {selected
            ? <>
                <img
                  src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
                  width={20} height={15} alt={selected.name}
                  className="rounded-sm shrink-0"
                />
                <span>{selected.name}</span>
              </>
            : <span className="text-gray-400">Select country…</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No results</p>}
            {filtered.map(c => (
              <button
                key={c.code} type="button"
                onMouseDown={() => { onChange(c.name); onCountryChange?.(c); setOpen(false); setSearch(""); }}
                className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 transition ${value === c.name ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-800"}`}
              >
                <img
                  src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                  width={20} height={15} alt={c.name}
                  className="rounded-sm shrink-0"
                />
                <span>{c.name}</span>
                <span className="ml-auto text-xs text-gray-400">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── State input ────────────────────────────────────────────────
function StateInput({
  country, value, onChange, label, required,
}: {
  country: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const entry = getCountryByName(country);
  const states = entry?.states || [];
  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {states.length > 0 ? (
        <div className="space-y-1.5">
          <select
            value={value} onChange={e => onChange(e.target.value)}
            className="cursor-pointer w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="">Select state…</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={value} onChange={e => onChange(e.target.value)} placeholder="Or type manually…"
            className="w-full rounded-2xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-gray-300"
          />
        </div>
      ) : (
        <input
          value={value} onChange={e => onChange(e.target.value)} placeholder="Enter state / province"
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      )}
    </div>
  );
}

// ─── Dial-code dropdown (with flags, same as user page) ──────────
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
        className="flex items-center gap-1.5 rounded-2xl border border-gray-300 bg-gray-50 px-3 h-full min-h-[48px] cursor-pointer hover:border-gray-400 transition">
        {flag
          ? <img src={`https://flagcdn.com/w20/${flag}.png`} width={18} height={13} alt="" className="rounded-sm shrink-0" />
          : <span className="w-5 h-3.5 rounded-sm bg-gray-200 shrink-0 block" />}
        <span className="text-sm font-semibold text-gray-700 min-w-[36px]">{dial || '+?'}</span>
        <ChevronDown size={12} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country or code…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.code} type="button"
                onMouseDown={() => { onChange(c.dial, c.code.toLowerCase()); setOpen(false); setSearch(''); }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-50 transition cursor-pointer">
                <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} width={18} height={13} alt="" className="rounded-sm shrink-0" />
                <span className="font-semibold text-gray-700 w-10 shrink-0">{c.dial}</span>
                <span className="text-gray-500 truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Phone input — uses DialDropdown, syncs dial to country ─────
function PhoneInput({
  countryName, value, onChange, label, required,
}: {
  countryName: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const entry = getCountryByName(countryName);
  const [dial, setDial] = useState(entry?.dial || '');
  const [flagCode, setFlagCode] = useState(entry?.code.toLowerCase() || '');
  const [local, setLocal] = useState('');

  // When parent country changes, sync the dial code to match.
  const lastSyncedCountry = useRef(countryName);
  useEffect(() => {
    if (lastSyncedCountry.current !== countryName) {
      const e = getCountryByName(countryName);
      if (e) {
        setDial(e.dial);
        setFlagCode(e.code.toLowerCase());
        onChange(local ? `${e.dial} ${local}`.trim() : '');
      }
      lastSyncedCountry.current = countryName;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryName]);

  const handleLocal = (raw: string) => {
    const v = numericOnly(raw, false);
    setLocal(v);
    onChange(dial ? `${dial} ${v}`.trim() : v);
  };

  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 block mb-2">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="flex gap-2">
        <DialDropdown dial={dial} flag={flagCode}
          onChange={(newDial, newFlag) => {
            setDial(newDial);
            setFlagCode(newFlag);
            setLocal('');
            onChange('');
          }} />
        <input value={local} onChange={e => handleLocal(e.target.value)}
          inputMode="numeric" placeholder="Phone number"
          className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </div>
    </div>
  );
}

// ─── Currency dropdown (same as user page) ───────────────────────
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
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-gray-300 bg-white text-sm cursor-pointer transition hover:border-gray-400 text-left">
        <span className="font-bold">{selected?.code || value}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full mb-1 w-72 right-0 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search currency…"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map((c, i) => {
              const prevCountry = i > 0 ? filtered[i - 1].country : null;
              const showDivider = i > 0 && prevCountry !== c.country;
              return (
                <div key={c.code}>
                  {showDivider && <div className="h-px bg-gray-100 mx-3" />}
                  <button type="button"
                    onMouseDown={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 transition cursor-pointer ${value === c.code ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    {i === 0 || filtered[i - 1].country !== c.country ? (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{c.country}</p>
                    ) : null}
                    <p className={`text-sm font-bold ${value === c.code ? 'text-blue-600' : 'text-gray-900'}`}>{c.code}</p>
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

type ShipmentStatus = "Created" | "In Transit" | "Custom Clearance" | "Unclaimed" | "Delivered";

const PACKAGE_TYPES = [
  "Documents","Parcel","Electronics","Clothing","Food & Perishables",
  "Furniture","Machinery","Bulk / Pallet","Container","Other",
];

const MEANS_CONFIG: Record<ShipmentMeans, { label: string; emoji: string }> = {
  air:  { label: "Air Freight",  emoji: "✈️" },
  sea:  { label: "Sea Freight",  emoji: "🚢" },
  land: { label: "Land Freight", emoji: "🚛" },
};

type PricingApiResponse = { ok?: boolean; settings?: PricingProfiles; error?: string };

// ─── Required-field validator ──────────────────────────────────
function isFormValid(f: Record<string, string>): { valid: boolean; missing: string } {
  const required: Array<[string, string]> = [
    ["senderName", "Sender name"],
    ["senderEmail", "Sender email"],
    ["senderCountry", "Sender country"],
    ["senderState", "Sender state"],
    ["senderCity", "Sender city"],
    ["senderAddress", "Sender address"],
    ["senderPostalCode", "Sender postal code"],
    ["senderPhone", "Sender phone"],
    ["receiverName", "Receiver name"],
    ["receiverEmail", "Receiver email"],
    ["receiverCountry", "Receiver country"],
    ["receiverState", "Receiver state"],
    ["receiverCity", "Receiver city"],
    ["receiverAddress", "Receiver address"],
    ["receiverPostalCode", "Receiver postal code"],
    ["receiverPhone", "Receiver phone"],
    ["packageType", "Package type"],
    ["packageDescription", "Package description"],
    ["weightKg", "Weight"],
    ["lengthCm", "Length"],
    ["widthCm", "Width"],
    ["heightCm", "Height"],
    ["declaredValue", "Declared value"],
    ["currency", "Currency"],
    ["estimatedDeliveryDate", "Estimated delivery date"],
  ];
  for (const [key, label] of required) {
    if (!f[key]?.trim()) return { valid: false, missing: label };
  }
  return { valid: true, missing: "" };
}

export default function AdminCreateShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const router = useRouter();

  // ── Parties (start empty — admin fills these in) ──
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderCountryCode, setSenderCountryCode] = useState("");
  const [senderCountry, setSenderCountry] = useState("");
  const [senderState, setSenderState] = useState("");
  const [senderCity, setSenderCity] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderPostalCode, setSenderPostalCode] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  const [receiverName, setReceiverName] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [destinationCountryCode, setDestinationCountryCode] = useState("");
  const [receiverCountry, setReceiverCountry] = useState("");
  const [receiverState, setReceiverState] = useState("");
  const [receiverCity, setReceiverCity] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverPostalCode, setReceiverPostalCode] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  // ── Package / shipment ──
  const [packageType, setPackageType] = useState("Parcel");
  const [packageTypeOther, setPackageTypeOther] = useState("");
  const [packageDescription, setPackageDescription] = useState("");

  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("Standard");
  // Scope is auto-derived from sender vs receiver country (no manual override).
  const [scope, setScope] = useState<ShipmentScope>("international");

  // Means: auto by default, admin can override
  const [meansOverride, setMeansOverride] = useState<ShipmentMeans | "auto">("auto");

  // Date: auto by default, admin can override
  const [dateOverrideEnabled, setDateOverrideEnabled] = useState(false);
  const [dateOverride, setDateOverride] = useState("");

  // Weight & dimensions (raw string values; displayed with commas)
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");

  // ── Invoice ──
  const [currency, setCurrency] = useState("USD");
  const [declaredValue, setDeclaredValue] = useState("");

  const [invoiceStatus, setInvoiceStatus] = useState<"paid" | "unpaid" | "overdue" | "cancelled">("unpaid");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState("");
  const [invoicePaymentMethodOther, setInvoicePaymentMethodOther] = useState("");

  const PAYMENT_METHODS = useMemo(
    () => ["", "Cryptocurrency", "Bank transfer", "PayPal", "Zelle", "Cash", "Other"],
    []
  );

  // ── Status ──
  const [status, setStatus] = useState<ShipmentStatus>("Created");
  const [statusNote, setStatusNote] = useState("");

  // ── Pricing ──
  const [ratesLoading, setRatesLoading] = useState(true);
  const [pricingProfiles, setPricingProfiles] = useState<PricingProfiles>(DEFAULT_PRICING);

  const [shippingFee, setShippingFee] = useState("");
  const [handlingFee, setHandlingFee] = useState("");
  const [customsFee, setCustomsFee] = useState("");
  const [taxFee, setTaxFee] = useState("");
  const [discountFee, setDiscountFee] = useState("");
  const [fuelRatePct, setFuelRatePct] = useState("");
  const [insuranceRatePct, setInsuranceRatePct] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [attempted, setAttempted] = useState(false);

  // ── Auto-detect scope (same country → local, different → international) ──
  useEffect(() => {
    if (senderCountryCode && destinationCountryCode) {
      const next: ShipmentScope =
        senderCountryCode === destinationCountryCode ? "local" : "international";
      setScope(prev => prev !== next ? next : prev);
    }
  }, [senderCountryCode, destinationCountryCode]);

  // ── Load pricing on mount ──
  useEffect(() => {
    const load = async () => {
      setErr(""); setRatesLoading(true);
      try {
        const res = await fetch("/api/admin/pricing", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as PricingApiResponse | null;
        if (!res.ok) throw new Error(json?.error || "Failed to load pricing settings.");
        const s = json?.settings;
        if (!s) throw new Error("Pricing settings missing.");
        setPricingProfiles(s);

        const active = s[scope] || DEFAULT_PRICING[scope];
        setShippingFee(toMoney(active.shippingFee ?? DEFAULT_PRICING[scope].shippingFee));
        setHandlingFee(toMoney(active.handlingFee ?? DEFAULT_PRICING[scope].handlingFee));
        setCustomsFee(toMoney(active.customsFee ?? DEFAULT_PRICING[scope].customsFee));
        setTaxFee(toMoney(active.taxFee ?? DEFAULT_PRICING[scope].taxFee));
        setDiscountFee(toMoney(active.discountFee ?? DEFAULT_PRICING[scope].discountFee));
        setFuelRatePct(toPct(Number(active.fuelRate ?? DEFAULT_PRICING[scope].fuelRate)));
        setInsuranceRatePct(toPct(Number(active.insuranceRate ?? DEFAULT_PRICING[scope].insuranceRate)));
      } catch (e: any) {
        setErr(String(e?.message || "Failed to load pricing settings."));
      } finally {
        setRatesLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload pricing fees when scope changes
  useEffect(() => {
    const active = pricingProfiles[scope] || DEFAULT_PRICING[scope];
    setShippingFee(toMoney(active.shippingFee ?? DEFAULT_PRICING[scope].shippingFee));
    setHandlingFee(toMoney(active.handlingFee ?? DEFAULT_PRICING[scope].handlingFee));
    setCustomsFee(toMoney(active.customsFee ?? DEFAULT_PRICING[scope].customsFee));
    setTaxFee(toMoney(active.taxFee ?? DEFAULT_PRICING[scope].taxFee));
    setDiscountFee(toMoney(active.discountFee ?? DEFAULT_PRICING[scope].discountFee));
    setFuelRatePct(toPct(Number(active.fuelRate ?? DEFAULT_PRICING[scope].fuelRate)));
    setInsuranceRatePct(toPct(Number(active.insuranceRate ?? DEFAULT_PRICING[scope].insuranceRate)));
  }, [scope, pricingProfiles]);

  // ── Derived: weight, means, service level ──
  const actualWeight = parseFloat(weightKg) || 0;
  const lenN = parseFloat(lengthCm) || 0;
  const widN = parseFloat(widthCm) || 0;
  const hgtN = parseFloat(heightCm) || 0;
  const volumetricWeight = (lenN * widN * hgtN) / 5000;
  const weight = Math.max(actualWeight, volumetricWeight);

  const isBulkOrContainer = packageType === "Container" || packageType === "Bulk / Pallet";

  const finalPackageType = packageType === "Other"
    ? (packageTypeOther.trim() || "Other")
    : packageType;

  const autoMeans: ShipmentMeans = useMemo(
    () => autoSelectMeans(scope, serviceLevel, weight, packageType as ShipmentType),
    [scope, serviceLevel, weight, packageType]
  );

  const means: ShipmentMeans = meansOverride === "auto" ? autoMeans : meansOverride;

  const effectiveServiceLevel: ServiceLevel = useMemo(() => {
    if (means === "sea") return "Standard";
    if (weight >= 500) return "Standard";
    return serviceLevel;
  }, [means, weight, serviceLevel]);

  const distanceKm = useMemo(() => {
    if (scope === "local" && senderCountryCode && senderState && receiverState) {
      return getStateDistance(senderCountryCode, senderState, receiverState);
    }
    if (senderCountryCode && destinationCountryCode) {
      return getCountryDistance(senderCountryCode, destinationCountryCode);
    }
    return 0;
  }, [scope, senderCountryCode, destinationCountryCode, senderState, receiverState]);

  const delivery = useMemo(
    () => getDeliveryDays(means, effectiveServiceLevel, distanceKm),
    [means, effectiveServiceLevel, distanceKm]
  );

  // Auto delivery date range
  const autoDeliveryDateMaxISO = useMemo(() => {
    return addBusinessDays(new Date(), delivery.max).toISOString().split("T")[0];
  }, [delivery]);
  const autoDeliveryDateMinISO = useMemo(() => {
    return addBusinessDays(new Date(), delivery.min).toISOString().split("T")[0];
  }, [delivery]);

  const estimatedDeliveryDate = dateOverrideEnabled
    ? dateOverride
    : autoDeliveryDateMaxISO;

  const deliveryDateStr = useMemo(() => {
    if (dateOverrideEnabled) {
      if (!dateOverride) return "";
      const d = new Date(dateOverride);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
    if (weight <= 0) return "";
    const minD = addBusinessDays(new Date(), delivery.min);
    const maxD = addBusinessDays(new Date(), delivery.max);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    const fmtFull = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (delivery.min === delivery.max) return fmtFull(maxD);
    if (minD.getMonth() === maxD.getMonth() && minD.getFullYear() === maxD.getFullYear()) {
      return `${minD.getDate()}–${maxD.getDate()} ${maxD.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
    }
    return `${fmt(minD)} – ${fmtFull(maxD)}`;
  }, [delivery, weight, dateOverrideEnabled, dateOverride]);

  // ── Pricing override object passed to server ──
  const pricingOverride = useMemo(() => {
    return {
      [scope]: {
        shippingFee: fromMoney(shippingFee),
        handlingFee: fromMoney(handlingFee),
        customsFee: fromMoney(customsFee),
        taxFee: fromMoney(taxFee),
        discountFee: fromMoney(discountFee),
        fuelRate: fromPct(fuelRatePct),
        insuranceRate: fromPct(insuranceRatePct),
      },
    };
  }, [scope, shippingFee, handlingFee, customsFee, taxFee, discountFee, fuelRatePct, insuranceRatePct]);

  // ── Live invoice preview ──
  const breakdown = useMemo(() => {
    if (weight <= 0 || !senderCountryCode) return null;
    const safePricing: PricingProfiles = {
      ...DEFAULT_PRICING,
      ...pricingProfiles,
      international: {
        ...DEFAULT_PRICING.international,
        ...(pricingProfiles.international || {}),
        ...(pricingOverride.international || {}),
      },
      local: {
        ...DEFAULT_PRICING.local,
        ...(pricingProfiles.local || {}),
        ...(pricingOverride.local || {}),
      },
      air: { ...DEFAULT_PRICING.air, ...(pricingProfiles.air || {}) },
      sea: { ...DEFAULT_PRICING.sea, ...(pricingProfiles.sea || {}) },
      land: { ...DEFAULT_PRICING.land, ...(pricingProfiles.land || {}) },
    };
    try {
      return computeInvoice({
        scope,
        means,
        serviceLevel: effectiveServiceLevel,
        weightKg: weight,
        declaredValue: parseFloat(declaredValue) || 0,
        currency,
        senderCountryCode,
        receiverCountryCode: destinationCountryCode || senderCountryCode,
        senderCity, senderState, receiverCity, receiverState,
        pricing: safePricing,
      });
    } catch (e) {
      console.error("Invoice preview failed:", e);
      return null;
    }
  }, [
    weight, scope, means, effectiveServiceLevel, declaredValue, currency,
    senderCountryCode, destinationCountryCode, senderCity, senderState,
    receiverCity, receiverState, pricingProfiles, pricingOverride,
  ]);

  // ── Country change handlers ──
  const handleSenderCountryChange = (entry: CountryEntry) => {
    setSenderCountry(entry.name);
    setSenderCountryCode(entry.code);
    setSenderState("");
    const c = COUNTRY_CURRENCY[entry.code];
    if (c) setCurrency(c);
  };

  const handleReceiverCountryChange = (entry: CountryEntry) => {
    setReceiverCountry(entry.name);
    setDestinationCountryCode(entry.code);
    setReceiverState("");
  };

  // ── Submit ──
  const submit = async () => {
    setAttempted(true);
    setErr(""); setOkMsg("");

    if (ratesLoading) { setErr("Pricing is still loading. Please wait a moment."); return; }

    const { valid, missing } = isFormValid({
      senderName, senderEmail, senderCountry, senderState, senderCity,
      senderAddress, senderPostalCode, senderPhone,
      receiverName, receiverEmail, receiverCountry, receiverState,
      receiverCity, receiverAddress, receiverPostalCode, receiverPhone,
      packageType: finalPackageType, packageDescription,
      weightKg, lengthCm, widthCm, heightCm,
      declaredValue, currency,
      estimatedDeliveryDate,
    });
    if (!valid) { setErr(`${missing} is required.`); return; }

    if (dateOverrideEnabled && !dateOverride) {
      setErr("Estimated delivery date is required when override is enabled.");
      return;
    }

    const dv = Number(declaredValue);
    if (!Number.isFinite(dv) || dv <= 0) { setErr("Declared value must be greater than 0."); return; }

    const finalPaymentMethod =
      invoicePaymentMethod === "Other"
        ? invoicePaymentMethodOther.trim()
        : invoicePaymentMethod.trim();

    setLoading(true);
    try {
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderCountryCode, destinationCountryCode,
          senderName, senderEmail,
          receiverName, receiverEmail,
          senderCountry, senderState, senderCity, senderAddress,
          senderPostalCode, senderPhone,
          receiverCountry, receiverState, receiverCity, receiverAddress,
          receiverPostalCode, receiverPhone,
          shipmentScope: scope,
          serviceLevel: effectiveServiceLevel,
          shipmentType: finalPackageType,
          packageDescription,
          shipmentMeans: MEANS_CONFIG[means].label,
          means,
          estimatedDeliveryDate: estimatedDeliveryDate
            ? new Date(estimatedDeliveryDate).toISOString()
            : null,
          estimatedDeliveryDateMin: dateOverrideEnabled ? null : autoDeliveryDateMinISO,
          weightKg: weight,
          dimensionsCm: {
            length: parseFloat(lengthCm) || 0,
            width: parseFloat(widthCm) || 0,
            height: parseFloat(heightCm) || 0,
          },
          declaredValue: dv,
          declaredValueCurrency: currency,
          pricingOverride,
          invoice: {
            status: invoiceStatus,
            dueDate: invoiceDueDate || null,
            paymentMethod: finalPaymentMethod || null,
          },
          status, statusNote,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(String(json?.error || "Failed to create shipment.")); return; }

      setOkMsg("Shipment created successfully.");
      const shipmentId = String(json?.shipment?.shipmentId || "").trim();
      if (shipmentId) {
        router.push(
          `/${locale}/dashboard/admin/shipments?focusShipment=${encodeURIComponent(shipmentId)}`
        );
      }
    } catch (e: any) {
      setErr(String(e?.message || "Failed to create shipment."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-cyan-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Create Shipment</h1>
          <p className="mt-2 text-gray-600">
            Fill in details, preview the invoice, then create the shipment.
          </p>
          {ratesLoading && (
            <p className="mt-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading pricing from Admin settings…
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Form column ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 space-y-8"
          >
            {/* Parties */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Parties</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Sender name <span className="text-red-500">*</span></label>
                  <input value={senderName} onChange={e => setSenderName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Sender email <span className="text-red-500">*</span></label>
                  <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} type="email"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Receiver name <span className="text-red-500">*</span></label>
                  <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Receiver email <span className="text-red-500">*</span></label>
                  <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} type="email"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </section>

            {/* Sender address */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Sender address</h2>
              <div className="space-y-3">
                <CountrySelect label="Country" required value={senderCountry}
                  onChange={name => { const e = getCountryByName(name); if (e) handleSenderCountryChange(e); }}
                  onCountryChange={entry => { if (entry) handleSenderCountryChange(entry); }} />
                <StateInput country={senderCountry} value={senderState} onChange={setSenderState} label="State / Province" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
                    <input value={senderCity} onChange={e => setSenderCity(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Postal code <span className="text-red-500">*</span></label>
                    <input value={senderPostalCode} onChange={e => setSenderPostalCode(numericOnly(e.target.value, false))} inputMode="numeric"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
                  <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <PhoneInput countryName={senderCountry} value={senderPhone} onChange={setSenderPhone} label="Phone" required />
              </div>
            </section>

            {/* Receiver address */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Receiver address</h2>
              <div className="space-y-3">
                <CountrySelect label="Country" required value={receiverCountry}
                  onChange={name => { const e = getCountryByName(name); if (e) handleReceiverCountryChange(e); }}
                  onCountryChange={entry => { if (entry) handleReceiverCountryChange(entry); }} />
                <StateInput country={receiverCountry} value={receiverState} onChange={setReceiverState} label="State / Province" required />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">City <span className="text-red-500">*</span></label>
                    <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Postal code <span className="text-red-500">*</span></label>
                    <input value={receiverPostalCode} onChange={e => setReceiverPostalCode(numericOnly(e.target.value, false))} inputMode="numeric"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Address <span className="text-red-500">*</span></label>
                  <input value={receiverAddress} onChange={e => setReceiverAddress(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <PhoneInput countryName={receiverCountry} value={receiverPhone} onChange={setReceiverPhone} label="Phone" required />
              </div>
            </section>

            {/* Shipment details */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Shipment details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Shipping type <span className="text-xs font-normal text-gray-400">(auto)</span>
                  </label>
                  <input
                    value={scope === "local" ? "Local (within country)" : "International (cross-border)"}
                    disabled
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-gray-50 text-gray-700 font-semibold cursor-not-allowed" />
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Info size={11} /> Determined by sender vs receiver country
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Service level</label>
                  <select value={serviceLevel} onChange={e => setServiceLevel(e.target.value as ServiceLevel)}
                    disabled={means === "sea" || weight >= 500 || isBulkOrContainer}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60">
                    <option>Standard</option>
                    <option>Express</option>
                  </select>
                  {means === "sea" && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> Sea is always Standard</p>
                  )}
                  {means === "air" && weight >= 500 && weight <= 10000 && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> 500+ kg uses Air Standard</p>
                  )}
                  {isBulkOrContainer && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> Bulk / Container is always Standard</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Package type <span className="text-red-500">*</span></label>
                  <select value={packageType} onChange={e => setPackageType(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {packageType === "Other" && (
                    <input value={packageTypeOther} onChange={e => setPackageTypeOther(e.target.value)}
                      placeholder="Specify package type"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  )}
                  {isBulkOrContainer && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Info size={11} /> This package type uses Sea Freight automatically</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Shipment means {meansOverride === "auto" && <span className="text-xs font-normal text-gray-400">(auto)</span>}
                  </label>
                  <select value={meansOverride} onChange={e => setMeansOverride(e.target.value as any)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="auto">Auto ({MEANS_CONFIG[autoMeans].emoji} {MEANS_CONFIG[autoMeans].label})</option>
                    <option value="air">{MEANS_CONFIG.air.emoji} {MEANS_CONFIG.air.label}</option>
                    <option value="sea">{MEANS_CONFIG.sea.emoji} {MEANS_CONFIG.sea.label}</option>
                    <option value="land">{MEANS_CONFIG.land.emoji} {MEANS_CONFIG.land.label}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Package description <span className="text-red-500">*</span></label>
                  <textarea value={packageDescription} onChange={e => setPackageDescription(e.target.value)} rows={3}
                    placeholder="Describe the package contents..."
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Weight (kg) <span className="text-red-500">*</span></label>
                  <input
                    value={formatWithCommas(weightKg)}
                    onChange={e => setWeightKg(cleanNumeric(e.target.value))}
                    inputMode="decimal"
                    placeholder="e.g. 2.5"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  {volumetricWeight > actualWeight && actualWeight > 0 && (
                    <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                      <Info size={11} /> Charged at volumetric weight: {formatMoney(volumetricWeight)} kg
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Dimensions (cm) <span className="text-red-500">*</span></label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <input
                      value={formatWithCommas(lengthCm)}
                      onChange={e => setLengthCm(cleanNumeric(e.target.value))}
                      inputMode="decimal" placeholder="L"
                      className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    <input
                      value={formatWithCommas(widthCm)}
                      onChange={e => setWidthCm(cleanNumeric(e.target.value))}
                      inputMode="decimal" placeholder="W"
                      className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    <input
                      value={formatWithCommas(heightCm)}
                      onChange={e => setHeightCm(cleanNumeric(e.target.value))}
                      inputMode="decimal" placeholder="H"
                      className="rounded-2xl border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  </div>
                </div>
              </div>
            </section>

            {/* Estimated delivery */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Estimated delivery</h2>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-white border border-gray-200">
                    {MEANS_CONFIG[means].emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{MEANS_CONFIG[means].label} · {effectiveServiceLevel}</p>
                    <p className="text-xs text-gray-500">{delivery.label}{distanceKm > 0 && ` · ~${Math.round(distanceKm).toLocaleString()} km`}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Auto Delivery</p>
                    <p className="text-xs font-bold text-gray-700 mt-0.5">{deliveryDateStr || "—"}</p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                  <input type="checkbox" checked={dateOverrideEnabled}
                    onChange={e => {
                      setDateOverrideEnabled(e.target.checked);
                      if (e.target.checked && !dateOverride) setDateOverride(autoDeliveryDateMaxISO);
                    }}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-700 font-medium">Override estimated delivery date</span>
                </label>

                {dateOverrideEnabled && (
                  <input type="date" value={dateOverride} onChange={e => setDateOverride(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                )}
              </div>
            </section>

            {/* Invoice */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-3">Invoice</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Declared value <span className="text-red-500">*</span></label>
                  <input
                    value={formatWithCommas(declaredValue)}
                    onChange={e => setDeclaredValue(cleanNumeric(e.target.value))}
                    inputMode="decimal"
                    placeholder="e.g. 500"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Currency <span className="text-red-500">*</span></label>
                  <div className="mt-2">
                    <CurrencySelect value={currency} onChange={setCurrency} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Invoice status</label>
                  <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value as any)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Invoice due date</label>
                  <input type="date" value={invoiceDueDate} onChange={e => setInvoiceDueDate(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-700">Payment method</label>
                  <select value={invoicePaymentMethod} onChange={e => setInvoicePaymentMethod(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m ? m : "Select a payment method"}</option>
                    ))}
                  </select>
                  {invoicePaymentMethod === "Other" && (
                    <input value={invoicePaymentMethodOther} onChange={e => setInvoicePaymentMethodOther(e.target.value)}
                      placeholder="Enter payment method"
                      className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Initial status</label>
                  <select value={status} onChange={e => setStatus(e.target.value as ShipmentStatus)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option>Created</option>
                    <option>In Transit</option>
                    <option>Custom Clearance</option>
                    <option>Unclaimed</option>
                    <option>Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Status note (optional)</label>
                  <input value={statusNote} onChange={e => setStatusNote(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                </div>
              </div>
            </section>

            {/* Pricing override */}
            <section>
              <h2 className="font-extrabold text-gray-900 mb-1">Charges (override per shipment)</h2>
              <p className="text-xs text-gray-600 mb-3">
                Loaded from Admin Pricing for the selected scope. Editing here applies only to this shipment.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Shipping fee</label>
                  <input value={shippingFee} onChange={e => setShippingFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Handling fee</label>
                  <input value={handlingFee} onChange={e => setHandlingFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Customs fee</label>
                  <input value={customsFee} onChange={e => setCustomsFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Tax</label>
                  <input value={taxFee} onChange={e => setTaxFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Discount</label>
                  <input value={discountFee} onChange={e => setDiscountFee(numericOnly(e.target.value))} inputMode="decimal"
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Fuel %</label>
                  <input value={fuelRatePct} onChange={e => setFuelRatePct(numericOnly(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Insurance %</label>
                  <input value={insuranceRatePct} onChange={e => setInsuranceRatePct(numericOnly(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </section>

            {/* Submit + status */}
            <div>
              <button type="button" onClick={submit} disabled={loading || ratesLoading}
                className={`w-full rounded-2xl bg-blue-600 text-white py-4 font-semibold transition flex items-center justify-center ${
                  loading || ratesLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700 cursor-pointer"
                }`}>
                {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating…</>)
                  : ratesLoading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading pricing…</>)
                  : (<><PlusCircle className="w-5 h-5 mr-2" /> Create Shipment</>)}
              </button>

              {attempted && (() => {
                const v = isFormValid({
                  senderName, senderEmail, senderCountry, senderState, senderCity,
                  senderAddress, senderPostalCode, senderPhone,
                  receiverName, receiverEmail, receiverCountry, receiverState,
                  receiverCity, receiverAddress, receiverPostalCode, receiverPhone,
                  packageType: finalPackageType, packageDescription,
                  weightKg, lengthCm, widthCm, heightCm,
                  declaredValue, currency, estimatedDeliveryDate,
                });
                return !v.valid ? (
                  <p className="mt-3 text-xs text-amber-600 font-semibold text-center">
                    Please fill in all required fields (*) — missing: {v.missing}
                  </p>
                ) : null;
              })()}

              {err && (
                <div className="mt-4 flex items-center text-red-600 font-semibold">
                  <AlertCircle className="w-5 h-5 mr-2" /> {err}
                </div>
              )}
              {okMsg && (
                <div className="mt-4 flex items-center text-green-700 font-semibold">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> {okMsg}
                </div>
              )}
            </div>
          </motion.div>

          {/* ─── Preview column ─── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/90 backdrop-blur rounded-3xl border border-gray-200 shadow-xl p-6 lg:sticky lg:top-6 self-start"
          >
            <p className="font-extrabold text-gray-900 mb-2">Invoice Preview</p>
            <p className="text-sm text-gray-600 mb-4">
              Calculated using full pricing rules — same engine the user dashboard and payment page use.
            </p>

            {!breakdown ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                Fill in weight, country, and declared value to see the invoice preview.
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  <p className="font-extrabold text-gray-900">Declared Value</p>
                  <p className="text-sm text-gray-700">
                    {Number(breakdown.declaredValue).toLocaleString()} {currency}
                  </p>
                </div>

                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Base Freight ({MEANS_CONFIG[means].label})</span>
                    <span className="font-semibold">{formatMoney(breakdown.baseFreight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel Surcharge ({fuelRatePct || "—"}%)</span>
                    <span className="font-semibold">{formatMoney(breakdown.fuel)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance ({insuranceRatePct || "—"}%)</span>
                    <span className="font-semibold">{formatMoney(breakdown.insurance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handling</span>
                    <span className="font-semibold">{formatMoney(breakdown.handling)}</span>
                  </div>
                  {breakdown.customs > 0 && (
                    <div className="flex justify-between">
                      <span>Customs</span>
                      <span className="font-semibold">{formatMoney(breakdown.customs)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-bold">Subtotal</span>
                    <span className="font-bold">{formatMoney(breakdown.subtotal)}</span>
                  </div>
                  {breakdown.tax > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span className="font-semibold">{formatMoney(breakdown.tax)}</span>
                    </div>
                  )}
                  {breakdown.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">−{formatMoney(breakdown.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t text-lg">
                    <span className="font-extrabold text-gray-900">Total</span>
                    <span className="font-extrabold text-blue-700">
                      {formatMoney(breakdown.total)} {currency}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <p><strong>Means:</strong> {MEANS_CONFIG[means].label}{meansOverride === "auto" ? " (auto)" : " (manual override)"}</p>
              <p><strong>Service:</strong> {effectiveServiceLevel}</p>
              <p><strong>Distance:</strong> {distanceKm > 0 ? `~${Math.round(distanceKm).toLocaleString()} km` : "—"}</p>
              <p><strong>Delivery window:</strong> {deliveryDateStr || "—"}{dateOverrideEnabled ? " (override)" : ""}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}