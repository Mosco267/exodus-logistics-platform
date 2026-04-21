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
import {
  COUNTRIES_WITH_STATES, getCountryByName, type CountryEntry,
} from '@/lib/countriesData';
import {
  autoSelectMeans, getDeliveryDays, getEstimatedDeliveryDate,
  computeInvoice, type PricingProfiles, type ShipmentScope,
  type ServiceLevel, type ShipmentType, type ShipmentMeans,
} from '@/lib/pricing';

// ─── Helpers ──────────────────────────────────────────────────
const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#0b3aa4] dark:focus:border-blue-400 transition";
const selectCls = inputCls + " cursor-pointer";
const labelCls = "text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className={labelCls}>{children}{required && <span className="text-red-500 ml-0.5">*</span>}</label>;
}

// ─── Country dropdown ─────────────────────────────────────────
function CountrySelect({ value, onChange, onEntry, label, required, disabled, excludeCode }: {
  value: string; onChange: (name: string) => void; onEntry?: (e: CountryEntry) => void;
  label: string; required?: boolean; disabled?: boolean; excludeCode?: string;
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
      <Label required={required}>{label}</Label>
      <button type="button" disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(v => !v); setSearch(''); } }}
        className={inputCls + ` flex items-center justify-between cursor-pointer text-left ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <span className="flex items-center gap-2">
          {selected
            ? <><img src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`} width="20" height="15" alt={selected.name} className="rounded-sm shrink-0" /><span>{selected.name}</span></>
            : <span className="text-gray-400">Select country…</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search country…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-52 overflow-y-auto">
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
function StateSelect({ country, value, onChange, label, required }: {
  country: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
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
        <Label required={required}>{label}</Label>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="State / Province"
          className={inputCls} style={{ fontSize: '16px' }} />
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Label required={required}>{label}</Label>
      <button type="button" onClick={() => { setOpen(v => !v); setSearch(''); }}
        className={inputCls + ' flex items-center justify-between cursor-pointer text-left'}>
        <span className={value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{value || 'Select state…'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-white/10">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search state…" style={{ fontSize: '16px' }}
              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none" />
          </div>
          <div className="max-h-52 overflow-y-auto">
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
function PhoneInput({ countryCode, value, onChange, label, required }: {
  countryCode: string; value: string; onChange: (v: string) => void; label: string; required?: boolean;
}) {
  const entry = COUNTRIES_WITH_STATES.find(c => c.code === countryCode);
  const [dial, setDial] = useState(entry?.dial || '');
  const [local, setLocal] = useState('');

  useEffect(() => {
    const d = COUNTRIES_WITH_STATES.find(c => c.code === countryCode)?.dial || '';
    setDial(d);
    setLocal('');
    onChange(d);
  }, [countryCode]); // eslint-disable-line

  return (
    <div>
      <Label required={required}>{label}</Label>
      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-3 shrink-0">
          {entry && <img src={`https://flagcdn.com/w20/${entry.code.toLowerCase()}.png`} width="18" height="13" alt="" className="rounded-sm" />}
          <input value={dial} onChange={e => { setDial(e.target.value); onChange(`${e.target.value} ${local}`.trim()); }}
            className="w-14 bg-transparent text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none" />
        </div>
        <input value={local} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setLocal(v); onChange(`${dial} ${v}`.trim()); }}
          inputMode="numeric" placeholder="Phone number"
          className={inputCls + ' flex-1'} style={{ fontSize: '16px' }} />
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

// ─── Means badge ──────────────────────────────────────────────
const MEANS_CONFIG: Record<ShipmentMeans, { label: string; emoji: string; color: string }> = {
  air: { label: 'Air Freight', emoji: '✈️', color: '#0891b2' },
  sea: { label: 'Sea Freight', emoji: '🚢', color: '#1d4ed8' },
  land: { label: 'Land Freight', emoji: '🚛', color: '#059669' },
};

// ─── Main page ────────────────────────────────────────────────
export default function NewShipmentPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
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

  // ─── Pricing ──────────────────────────────────────────────
  const [pricing, setPricing] = useState<PricingProfiles | null>(null);
  useEffect(() => {
    fetch('/api/admin/pricing', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d?.settings) setPricing(d.settings); })
      .catch(() => {});
  }, []);

  // ─── Scope toggle ─────────────────────────────────────────
  const [scope, setScope] = useState<ShipmentScope>('international');
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>('Express');
  const [shipmentType, setShipmentType] = useState<ShipmentType>('Parcel');

  // ─── Sender ───────────────────────────────────────────────
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderCountry, setSenderCountry] = useState('');
  const [senderCountryCode, setSenderCountryCode] = useState('');
  const [senderState, setSenderState] = useState('');
  const [senderCity, setSenderCity] = useState('');
  const [senderStreet, setSenderStreet] = useState('');
  const [senderPostal, setSenderPostal] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  // ─── Address checkboxes ───────────────────────────────────
  const [profileHasAddress, setProfileHasAddress] = useState(false);
  const [useDefaultAddress, setUseDefaultAddress] = useState(false);
  const [isHomeAddress, setIsHomeAddress] = useState(false);
  const [saveAsHome, setSaveAsHome] = useState(false);
  const [profileAddress, setProfileAddress] = useState({ street: '', city: '', state: '', postal: '', country: '', countryCode: '' });
  const [addressManuallyChanged, setAddressManuallyChanged] = useState(false);

  // ─── Receiver ─────────────────────────────────────────────
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverCountry, setReceiverCountry] = useState('');
  const [receiverCountryCode, setReceiverCountryCode] = useState('');
  const [receiverState, setReceiverState] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverStreet, setReceiverStreet] = useState('');
  const [receiverPostal, setReceiverPostal] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  // ─── Package ──────────────────────────────────────────────
  const [weightKg, setWeightKg] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [currency, setCurrency] = useState('USD');

  // ─── Submission ───────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdId, setCreatedId] = useState('');
  const [attempted, setAttempted] = useState(false);

  // ─── Load profile ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        if (data.name) setSenderName(data.name);
        if (data.email) setSenderEmail(data.email);
        const entry = getCountryByName(data.country || '');
        if (entry) { setSenderCountry(entry.name); setSenderCountryCode(entry.code); }
        if (data.phone) setSenderPhone(data.phone);

        const hasAddr = !!(data.addressStreet || data.addressCity);
        setProfileHasAddress(hasAddr);

        if (hasAddr) {
          const pa = {
            street: data.addressStreet || '', city: data.addressCity || '',
            state: data.addressState || '', postal: data.addressPostalCode || '',
            country: data.country || '', countryCode: entry?.code || '',
          };
          setProfileAddress(pa);
          // Auto-fill sender address from profile
          setSenderStreet(pa.street); setSenderCity(pa.city);
          setSenderState(pa.state); setSenderPostal(pa.postal);
          setUseDefaultAddress(true);
        }
      })
      .catch(() => {});
  }, []);

  // When scope is local, lock receiver country to sender
  useEffect(() => {
    if (scope === 'local') {
      setReceiverCountry(senderCountry);
      setReceiverCountryCode(senderCountryCode);
    }
  }, [scope, senderCountry, senderCountryCode]);

  // ─── Auto-computed fields ─────────────────────────────────
  const weight = parseFloat(weightKg) || 0;

  const means: ShipmentMeans = useMemo(() =>
    autoSelectMeans(scope, serviceLevel, weight, shipmentType),
    [scope, serviceLevel, weight, shipmentType]
  );

  const delivery = useMemo(() => getDeliveryDays(means, serviceLevel), [means, serviceLevel]);
  const deliveryDate = useMemo(() => getEstimatedDeliveryDate(means, serviceLevel), [means, serviceLevel]);

  // ─── Invoice breakdown ────────────────────────────────────
  const breakdown = useMemo(() => {
    if (!pricing || !senderCountryCode || !receiverCountryCode || weight <= 0) return null;
    return computeInvoice({
      scope, means, serviceLevel,
      weightKg: weight,
      declaredValue: parseFloat(declaredValue) || 0,
      currency,
      senderCountryCode, receiverCountryCode,
      senderCity, senderState,
      receiverCity, receiverState,
      pricing,
    });
  }, [pricing, scope, means, serviceLevel, weight, declaredValue, currency,
      senderCountryCode, receiverCountryCode, senderCity, senderState, receiverCity, receiverState]);

  // ─── Address checkbox logic ───────────────────────────────
  const showDefaultCheckbox = profileHasAddress && !addressManuallyChanged;
  const showTwoCheckboxes = !profileHasAddress || addressManuallyChanged;

  const handleSenderAddressChange = (field: string, value: string) => {
    setAddressManuallyChanged(true);
    setUseDefaultAddress(false);
    if (field === 'street') setSenderStreet(value);
    if (field === 'city') setSenderCity(value);
    if (field === 'state') setSenderState(value);
    if (field === 'postal') setSenderPostal(value);
  };

  const handleSenderCountryChange = (name: string, code: string) => {
    setSenderCountry(name); setSenderCountryCode(code);
    setSenderState('');
    setAddressManuallyChanged(true);
    setUseDefaultAddress(false);
  };

  // ─── Validation ───────────────────────────────────────────
  const required = [
    { v: senderName, l: 'Sender name' }, { v: senderEmail, l: 'Sender email' },
    { v: senderCountry, l: 'Sender country' }, { v: senderState, l: 'Sender state' },
    { v: senderCity, l: 'Sender city' }, { v: senderStreet, l: 'Sender address' },
    { v: senderPhone, l: 'Sender phone' }, { v: receiverName, l: 'Receiver name' },
    { v: receiverEmail, l: 'Receiver email' }, { v: receiverCountry, l: 'Receiver country' },
    { v: receiverState, l: 'Receiver state' }, { v: receiverCity, l: 'Receiver city' },
    { v: receiverStreet, l: 'Receiver address' }, { v: receiverPhone, l: 'Receiver phone' },
    { v: weightKg, l: 'Weight' }, { v: declaredValue, l: 'Declared value' },
  ];
  const firstMissing = required.find(f => !f.v?.trim())?.l || '';
  const isValid = !firstMissing;

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setAttempted(true); setError('');
    if (!isValid) { setError(`${firstMissing} is required.`); return; }
    const dv = parseFloat(declaredValue);
    if (!dv || dv <= 0) { setError('Declared value must be greater than 0.'); return; }

    setLoading(true);
    try {
      // Save address to profile if checkboxes ticked
      if (saveAsHome || isHomeAddress) {
        await fetch('/api/user/profile', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: senderName, phone: senderPhone, country: senderCountry,
            addressStreet: senderStreet, addressCity: senderCity,
            addressState: senderState, addressPostalCode: senderPostal,
          }),
        });
      }

      const res = await fetch('/api/shipments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderCountryCode, destinationCountryCode: receiverCountryCode,
          senderName, senderEmail, senderCountry, senderState,
          senderCity, senderAddress: senderStreet, senderPostalCode: senderPostal, senderPhone,
          receiverName, receiverEmail, receiverCountry, receiverState,
          receiverCity, receiverAddress: receiverStreet, receiverPostalCode: receiverPostal, receiverPhone,
          shipmentScope: scope, serviceLevel,
          shipmentType, shipmentMeans: MEANS_CONFIG[means].label,
          packageDescription,
          estimatedDeliveryDate: deliveryDate,
          weightKg: weight,
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
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
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

      {/* Scope toggle */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
        <Label>Shipment Type</Label>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {(['international', 'local'] as ShipmentScope[]).map(s => (
            <button key={s} type="button"
              onClick={() => { setScope(s); setReceiverState(''); setReceiverCity(''); setReceiverStreet(''); }}
              className="py-3 rounded-xl text-sm font-bold border-2 transition cursor-pointer"
              style={{
                borderColor: scope === s ? '#0b3aa4' : 'transparent',
                background: scope === s ? 'rgba(11,58,164,0.08)' : '#f9fafb',
                color: scope === s ? '#0b3aa4' : '#6b7280',
              }}>
              {s === 'international' ? '🌍 International' : '🏠 Local'}
            </button>
          ))}
        </div>
      </div>

      {/* Sender */}
      <Section title="Sender Information" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Full Name</Label>
            <input value={senderName} onChange={e => setSenderName(e.target.value)}
              placeholder="Full name" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label required>Email</Label>
            <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)}
              type="email" placeholder="Email address" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <CountrySelect label="Country" required value={senderCountry}
          onChange={name => { const e = getCountryByName(name); if (e) handleSenderCountryChange(e.name, e.code); }}
          onEntry={e => handleSenderCountryChange(e.name, e.code)} />

        {/* Address fields */}
        <div>
          <Label required>Street Address</Label>
          <input value={senderStreet}
            onChange={e => handleSenderAddressChange('street', e.target.value)}
            placeholder="Street address" className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>City</Label>
            <input value={senderCity}
              onChange={e => handleSenderAddressChange('city', e.target.value)}
              placeholder="City" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <input value={senderPostal}
              onChange={e => handleSenderAddressChange('postal', e.target.value.replace(/\D/g, ''))}
              placeholder="Postal code" inputMode="numeric" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <StateSelect country={senderCountry} value={senderState}
          onChange={v => handleSenderAddressChange('state', v)} label="State / Province" required />
        <PhoneInput countryCode={senderCountryCode} value={senderPhone} onChange={setSenderPhone} label="Phone" required />

        {/* Checkboxes */}
        {showDefaultCheckbox && (
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={useDefaultAddress}
              onChange={e => {
                setUseDefaultAddress(e.target.checked);
                if (e.target.checked) {
                  setSenderStreet(profileAddress.street); setSenderCity(profileAddress.city);
                  setSenderState(profileAddress.state); setSenderPostal(profileAddress.postal);
                  setAddressManuallyChanged(false);
                }
              }}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Use my default address</span>
          </label>
        )}
        {showTwoCheckboxes && (
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={isHomeAddress} onChange={e => setIsHomeAddress(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">This is a home address</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={saveAsHome} onChange={e => setSaveAsHome(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Save as my home address</span>
            </label>
          </div>
        )}
      </Section>

      {/* Receiver */}
      <Section title="Receiver Information" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Full Name</Label>
            <input value={receiverName} onChange={e => setReceiverName(e.target.value)}
              placeholder="Full name" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label required>Email</Label>
            <input value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)}
              type="email" placeholder="Email address" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <CountrySelect label="Country" required value={receiverCountry}
          disabled={scope === 'local'}
          excludeCode={scope === 'international' ? senderCountryCode : undefined}
          onChange={name => { const e = getCountryByName(name); if (e) { setReceiverCountry(e.name); setReceiverCountryCode(e.code); setReceiverState(''); } }}
          onEntry={e => { setReceiverCountry(e.name); setReceiverCountryCode(e.code); }} />
        {scope === 'local' && (
          <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 -mt-2">
            <Info size={12} /> Same country as sender for local shipments
          </p>
        )}
        <div>
          <Label required>Street Address</Label>
          <input value={receiverStreet} onChange={e => setReceiverStreet(e.target.value)}
            placeholder="Street address" className={inputCls} style={{ fontSize: '16px' }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label required>City</Label>
            <input value={receiverCity} onChange={e => setReceiverCity(e.target.value)}
              placeholder="City" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <input value={receiverPostal} onChange={e => setReceiverPostal(e.target.value.replace(/\D/g, ''))}
              placeholder="Postal code" inputMode="numeric" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>
        <StateSelect country={receiverCountry} value={receiverState} onChange={setReceiverState} label="State / Province" required />
        <PhoneInput countryCode={receiverCountryCode} value={receiverPhone} onChange={setReceiverPhone} label="Phone" required />
      </Section>

      {/* Package */}
      <Section title="Package Details" accent={accent}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Shipment Type</Label>
            <select value={shipmentType} onChange={e => setShipmentType(e.target.value as ShipmentType)} className={selectCls}>
              <option value="Documents">Documents</option>
              <option value="Parcel">Parcel</option>
              <option value="Bulk / Pallet">Bulk / Pallet</option>
              <option value="Container">Container</option>
            </select>
          </div>
          <div>
            <Label required>Service Level</Label>
            <select value={serviceLevel}
              onChange={e => setServiceLevel(e.target.value as ServiceLevel)}
              disabled={means === 'sea'}
              className={selectCls + (means === 'sea' ? ' opacity-60 cursor-not-allowed' : '')}>
              <option value="Express">Express</option>
              <option value="Standard">Standard</option>
            </select>
            {means === 'sea' && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Info size={11} /> Sea freight is always standard</p>
            )}
          </div>
          <div>
            <Label required>Weight (kg)</Label>
            <input value={weightKg} onChange={e => setWeightKg(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" placeholder="e.g. 2.5" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Package Description</Label>
            <input value={packageDescription} onChange={e => setPackageDescription(e.target.value)}
              placeholder="e.g. Electronics, Clothing..." className={inputCls} style={{ fontSize: '16px' }} />
          </div>
        </div>

        {/* Auto-selected means */}
        {weight > 0 && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5">
            <span className="text-2xl">{MEANS_CONFIG[means].emoji}</span>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{MEANS_CONFIG[means].label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Auto-selected · {delivery.label}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Est. delivery</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{new Date(deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        )}
      </Section>

      {/* Declared value */}
      <Section title="Declared Value" accent={accent}>
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Used to calculate insurance and freight charges.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Declared Value</Label>
            <input value={declaredValue} onChange={e => setDeclaredValue(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal" placeholder="e.g. 500" className={inputCls} style={{ fontSize: '16px' }} />
          </div>
          <div>
            <Label>Currency</Label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={selectCls}>
              <option value="USD">USD – US Dollar</option>
              <option value="EUR">EUR – Euro</option>
              <option value="GBP">GBP – British Pound</option>
              <option value="NGN">NGN – Nigerian Naira</option>
              <option value="AED">AED – UAE Dirham</option>
              <option value="CAD">CAD – Canadian Dollar</option>
              <option value="AUD">AUD – Australian Dollar</option>
              <option value="JPY">JPY – Japanese Yen</option>
              <option value="CNY">CNY – Chinese Yuan</option>
              <option value="INR">INR – Indian Rupee</option>
              <option value="ZAR">ZAR – South African Rand</option>
              <option value="GHS">GHS – Ghanaian Cedi</option>
              <option value="KES">KES – Kenyan Shilling</option>
              <option value="BRL">BRL – Brazilian Real</option>
              <option value="SAR">SAR – Saudi Riyal</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Invoice breakdown */}
      {breakdown && (
        <Section title="Invoice Breakdown" accent={accent}>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">This is your estimated invoice. Final amount confirmed on payment page.</p>
          <div className="space-y-2 text-sm">
            {[
              { label: `Base Freight (${MEANS_CONFIG[means].label})`, value: breakdown.baseFreight },
              { label: `Fuel Surcharge`, value: breakdown.fuel },
              { label: `Insurance`, value: breakdown.insurance },
              { label: `Handling Fee`, value: breakdown.handling },
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
              <span style={{ color: '#0b3aa4' }}>{currency} {breakdown.total.toFixed(2)}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Error */}
      {attempted && error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400 font-medium">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Submit */}
      <button onClick={handleSubmit} disabled={loading || !pricing}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 cursor-pointer disabled:opacity-60"
        style={{ background: accent }}>
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> Creating shipment…</>
          : !pricing
          ? <><Loader2 size={16} className="animate-spin" /> Loading pricing…</>
          : <><Send size={16} /> Create Order</>}
      </button>

      {/* Success modal */}
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