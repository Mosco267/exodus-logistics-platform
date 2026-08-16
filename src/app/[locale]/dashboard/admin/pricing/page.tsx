// src/app/[locale]/dashboard/admin/pricing/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, Search, Loader2, AlertCircle, Globe, Save, RotateCcw,
} from "lucide-react";
import { COUNTRIES_WITH_STATES } from "@/lib/countriesData";
import { DEFAULT_PRICING } from "@/lib/pricing";

type ZoneMultipliers = { sameContinent: number; nearContinent: number; farContinent: number };
type LandZoneRates = { zone1: number; zone2: number; zone3: number; zone4: number };

type PricingProfile = {
  shippingFee: number; handlingFee: number; customsFee: number;
  taxFee: number; discountFee: number; fuelRate: number; insuranceRate: number; taxRate?: number;
};

type AirSettings = { ratePerKgExpress: number; ratePerKgStandard: number; zoneMultipliers: ZoneMultipliers };
type SeaSettings = { ratePerKgStandard: number; zoneMultipliers: ZoneMultipliers };
type LandSettings = { zoneRates: LandZoneRates; expressMultiplier: number };

type CountryOverride = {
  label?: string;
  zoneRates?: Partial<LandZoneRates>;
  expressMultiplier?: number;
  handlingFee?: number;
  fuelRate?: number;
  insuranceRate?: number;
  minimumCharge?: number;
  local?: any; international?: any; taxRate?: number;
};

type Settings = {
  international: PricingProfile; local: PricingProfile;
  air: AirSettings; sea: SeaSettings; land: LandSettings;
  countryRates?: Record<string, CountryOverride>;
};

const DEFAULT = DEFAULT_PRICING as unknown as Settings;

/* ─── Value formatters ─────────────────────────────────────── */
const toP = (n: number) => (Number(n || 0) * 100).toFixed(2).replace(/\.?0+$/, "");
const fromP = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n / 100 : 0; };
const toM = (n: number) => Number(n || 0).toFixed(2).replace(/\.00$/, "");
const fromM = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };
/* Land zone rates are per-km-per-kg and sit around 0.003–0.03. Editing those
   directly invites a misplaced decimal, so they're shown per 1000 km:
   type 6, store 0.006. */
const toR = (n: number) => (Number(n || 0) * 1000).toFixed(2).replace(/\.?0+$/, "");
const fromR = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n / 1000 : 0; };

function Field({ label, value, onChange, isPercent, isRate1000, hint, placeholder }: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void;
  isPercent?: boolean; isRate1000?: boolean; hint?: string; placeholder?: string;
}) {
  const fmt = (v: number) => isPercent ? toP(v) : isRate1000 ? toR(v) : toM(v);
  const parse = (s: string) => isPercent ? fromP(s) : isRate1000 ? fromR(s) : fromM(s);

  const [raw, setRaw] = useState(value === undefined ? "" : fmt(value));
  useEffect(() => {
    setRaw(value === undefined ? "" : fmt(value));
  }, [value, isPercent, isRate1000]);

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      <div className="relative mt-2">
        <input value={raw}
          onChange={e => {
            const v = e.target.value;
            setRaw(v);
            onChange(v.trim() === "" ? undefined : parse(v));
          }}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm ${isRate1000 ? "pr-24" : "pr-10"}`}
          inputMode="decimal" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          {isPercent ? "%" : isRate1000 ? "$ /1000km·kg" : "$"}
        </span>
      </div>
    </div>
  );
}

export default function AdminPricingPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [localCountries, setLocalCountries] = useState<{ code: string; name: string }[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/pricing", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    const s = json?.settings || {};
    setSettings({
      international: { ...DEFAULT.international, ...s.international },
      local: { ...DEFAULT.local, ...s.local },
      air: { ...DEFAULT.air, ...s.air, zoneMultipliers: { ...DEFAULT.air.zoneMultipliers, ...s.air?.zoneMultipliers } },
      sea: { ...DEFAULT.sea, ...s.sea, zoneMultipliers: { ...DEFAULT.sea.zoneMultipliers, ...s.sea?.zoneMultipliers } },
      land: { ...DEFAULT.land, ...s.land, zoneRates: { ...DEFAULT.land.zoneRates, ...s.land?.zoneRates } },
      // Preserved exactly as stored — never seeded from defaults, so an
      // empty object here means "no overrides", not "not loaded yet".
      countryRates: s.countryRates || {},
    });
  };

  useEffect(() => { void load(); }, []);

  // Only offer countries where local shipping is actually enabled
  useEffect(() => {
    fetch("/api/admin/local-availability", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setLocalCountries(
        (d?.countries || [])
          .filter((c: any) => c.enabled)
          .map((c: any) => ({ code: c.countryCode, name: c.countryName }))
      ))
      .catch(() => {});
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true); setMsg(""); setErr("");
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) { setErr(json?.error || "Failed to save"); return; }
      setMsg("Saved");
      setTimeout(() => setMsg(""), 2500);
      await load();
    } finally { setSaving(false); }
  };

  const set = (path: (string | number)[], val: any) => {
    setSettings(prev => {
      if (!prev) return prev;
      const next: any = JSON.parse(JSON.stringify(prev));
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (obj[path[i]] === undefined) obj[path[i]] = {};
        obj = obj[path[i]];
      }
      if (val === undefined) delete obj[path[path.length - 1]];
      else obj[path[path.length - 1]] = val;
      return next;
    });
  };

  const addCountry = (code: string, name: string) => {
    set(["countryRates", code], { label: name });
    setActiveCountry(code);
    setShowAdd(false);
    setSearch("");
  };

  const removeCountry = (code: string) => {
    if (!confirm(`Remove the rate override for ${settings?.countryRates?.[code]?.label || code}? It will fall back to the global rates.`)) return;
    setSettings(prev => {
      if (!prev) return prev;
      const next: any = JSON.parse(JSON.stringify(prev));
      delete next.countryRates?.[code];
      return next;
    });
    if (activeCountry === code) setActiveCountry(null);
  };

  const overrideCodes = useMemo(
    () => Object.keys(settings?.countryRates || {}).sort(),
    [settings?.countryRates]
  );

  const addable = useMemo(() => {
    const have = new Set(overrideCodes);
    const pool = localCountries.length
      ? localCountries
      : COUNTRIES_WITH_STATES.map(c => ({ code: c.code, name: c.name }));
    return pool.filter(c =>
      !have.has(c.code) && c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [overrideCodes, localCountries, search]);

  if (!settings) {
    return <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>;
  }

  const co = activeCountry ? (settings.countryRates?.[activeCountry] || {}) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Admin • Pricing</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              All rates are in USD. Customer quotes are converted to local currency at the end.
            </p>
            {msg && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">{msg}</p>}
            {err && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">{err}</p>}
          </div>
          <button onClick={save} disabled={saving}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 cursor-pointer">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Base profiles ── */}
        {(["international", "local"] as const).map(scope => (
          <div key={scope} className="mt-8">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
              {scope === "international" ? "International — Fixed Fees & Rates" : "Local — Fixed Fees & Rates"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {scope === "local"
                ? "Defaults for domestic shipments. Individual countries can override these below."
                : "Applied on top of freight calculations for all international shipments."}
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Shipping Fee (fixed)" value={settings[scope].shippingFee} onChange={v => set([scope, "shippingFee"], v ?? 0)} hint="Flat surcharge added to every shipment" />
              <Field label="Handling Fee (fixed)" value={settings[scope].handlingFee} onChange={v => set([scope, "handlingFee"], v ?? 0)} />
              {scope === "international" && <Field label="Customs Clearance (fixed)" value={settings[scope].customsFee} onChange={v => set([scope, "customsFee"], v ?? 0)} />}
              <Field label="Tax (fixed)" value={settings[scope].taxFee} onChange={v => set([scope, "taxFee"], v ?? 0)} />
              <Field label="Discount (fixed)" value={settings[scope].discountFee} onChange={v => set([scope, "discountFee"], v ?? 0)} />
              <Field label="Fuel Surcharge %" value={settings[scope].fuelRate} onChange={v => set([scope, "fuelRate"], v ?? 0)} isPercent hint="% of base freight" />
              <Field label="Insurance %" value={settings[scope].insuranceRate} onChange={v => set([scope, "insuranceRate"], v ?? 0)} isPercent hint="% of declared value" />
              <Field label="Tax %" value={settings[scope].taxRate} onChange={v => set([scope, "taxRate"], v ?? 0)} isPercent hint="VAT/GST on the discounted subtotal" />
            </div>
          </div>
        ))}

        {/* ── Air ── */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">✈️ Air Freight Rates</h2>
          <p className="mt-1 text-xs text-gray-500">
            International shipments auto-selected as Air. Base freight = rate × chargeable weight × zone multiplier.
            Weight breaks reduce the effective rate above 30 kg.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Rate per kg — Express" value={settings.air.ratePerKgExpress} onChange={v => set(["air", "ratePerKgExpress"], v ?? 0)} />
            <Field label="Rate per kg — Standard" value={settings.air.ratePerKgStandard} onChange={v => set(["air", "ratePerKgStandard"], v ?? 0)} />
            <Field label="Same Continent Multiplier" value={settings.air.zoneMultipliers.sameContinent} onChange={v => set(["air", "zoneMultipliers", "sameContinent"], v ?? 1)} hint="1.0 = no extra" />
            <Field label="Near Continent Multiplier" value={settings.air.zoneMultipliers.nearContinent} onChange={v => set(["air", "zoneMultipliers", "nearContinent"], v ?? 1)} hint="1.3 = 30% more" />
            <Field label="Far Continent Multiplier" value={settings.air.zoneMultipliers.farContinent} onChange={v => set(["air", "zoneMultipliers", "farContinent"], v ?? 1)} hint="1.6 = 60% more" />
          </div>
        </div>

        {/* ── Sea ── */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">🚢 Sea Freight Rates</h2>
          <p className="mt-1 text-xs text-gray-500">Heavy and bulk international shipments. Always standard speed.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Rate per kg — Standard" value={settings.sea.ratePerKgStandard} onChange={v => set(["sea", "ratePerKgStandard"], v ?? 0)} />
            <Field label="Same Continent Multiplier" value={settings.sea.zoneMultipliers.sameContinent} onChange={v => set(["sea", "zoneMultipliers", "sameContinent"], v ?? 1)} />
            <Field label="Near Continent Multiplier" value={settings.sea.zoneMultipliers.nearContinent} onChange={v => set(["sea", "zoneMultipliers", "nearContinent"], v ?? 1)} />
            <Field label="Far Continent Multiplier" value={settings.sea.zoneMultipliers.farContinent} onChange={v => set(["sea", "zoneMultipliers", "farContinent"], v ?? 1)} />
          </div>
        </div>

        {/* ── Land: global defaults ── */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">🚛 Land Freight — Global Defaults</h2>
          <div className="mt-2 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 p-3.5">
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Base freight = distance (km) × rate × chargeable weight (kg).
              Rates are entered <strong>per 1000 km per kg</strong>, so a value of 6 means $0.006 per km per kg.
              Longer zones use a <strong>lower</strong> rate, because distance is already in the formula
              and fixed costs spread out over the journey.
              <br /><br />
              Zones are chosen by actual distance: under 50 km is zone 1, under 300 km zone 2,
              under 800 km zone 3, beyond that zone 4. Same-city and same-state routes always
              use zones 1 and 2 respectively.
              <br /><br />
              These apply to every country without an override below.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Zone 1 — Under 50 km" value={settings.land.zoneRates.zone1} onChange={v => set(["land", "zoneRates", "zone1"], v ?? 0)} isRate1000 hint="Same city · US benchmark 25" />
            <Field label="Zone 2 — Under 300 km" value={settings.land.zoneRates.zone2} onChange={v => set(["land", "zoneRates", "zone2"], v ?? 0)} isRate1000 hint="Same state · US benchmark 10" />
            <Field label="Zone 3 — Under 800 km" value={settings.land.zoneRates.zone3} onChange={v => set(["land", "zoneRates", "zone3"], v ?? 0)} isRate1000 hint="Regional · US benchmark 6" />
            <Field label="Zone 4 — Over 800 km" value={settings.land.zoneRates.zone4} onChange={v => set(["land", "zoneRates", "zone4"], v ?? 0)} isRate1000 hint="Long haul · US benchmark 1.8" />
            <Field label="Express Multiplier" value={settings.land.expressMultiplier} onChange={v => set(["land", "expressMultiplier"], v ?? 1)} hint="1.45 = 45% more for express" />
          </div>
        </div>

        {/* ── Country overrides ── */}
        <div className="mt-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Country Rate Cards
              </h2>
              <p className="mt-1 text-xs text-gray-500 max-w-lg">
                Domestic freight costs differ hugely by market. A 30 kg parcel moved 250 km costs
                roughly $70 in the US and about $10 in Nigeria. Add an override to price a country
                on its own cost base. Anything left blank falls back to the global defaults above.
              </p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add country
            </button>
          </div>

          {overrideCodes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-8 text-center">
              <p className="text-sm text-gray-500">No country overrides. Every country uses the global rates.</p>
            </div>
          ) : (
            <>
              {/* Country tabs */}
              <div className="mt-4 flex flex-wrap gap-2">
                {overrideCodes.map(code => (
                  <button key={code}
                    onClick={() => setActiveCountry(activeCountry === code ? null : code)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      activeCountry === code
                        ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                    }`}>
                    <img src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`} width="18" height="13" alt="" className="rounded-sm" />
                    {settings.countryRates?.[code]?.label || code}
                  </button>
                ))}
              </div>

              {/* Active country editor */}
              {activeCountry && co && (
                <div className="mt-5 rounded-2xl border border-gray-200 dark:border-white/10 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={`https://flagcdn.com/w40/${activeCountry.toLowerCase()}.png`} width="28" height="21" alt="" className="rounded-sm shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{co.label || activeCountry}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{activeCountry}</p>
                      </div>
                    </div>
                    <button onClick={() => removeCountry(activeCountry)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition cursor-pointer">
                      <RotateCcw className="w-3.5 h-3.5" /> Reset to global
                    </button>
                  </div>

                  <p className="mt-4 text-xs text-gray-500">
                    Leave a field empty to inherit the global value. Placeholders show what would be used.
                  </p>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Zone 1 — Under 50 km" value={co.zoneRates?.zone1}
                      onChange={v => set(["countryRates", activeCountry, "zoneRates", "zone1"], v)}
                      isRate1000 placeholder={toR(settings.land.zoneRates.zone1)} hint="Same city" />
                    <Field label="Zone 2 — Under 300 km" value={co.zoneRates?.zone2}
                      onChange={v => set(["countryRates", activeCountry, "zoneRates", "zone2"], v)}
                      isRate1000 placeholder={toR(settings.land.zoneRates.zone2)} hint="Same state" />
                    <Field label="Zone 3 — Under 800 km" value={co.zoneRates?.zone3}
                      onChange={v => set(["countryRates", activeCountry, "zoneRates", "zone3"], v)}
                      isRate1000 placeholder={toR(settings.land.zoneRates.zone3)} hint="Regional" />
                    <Field label="Zone 4 — Over 800 km" value={co.zoneRates?.zone4}
                      onChange={v => set(["countryRates", activeCountry, "zoneRates", "zone4"], v)}
                      isRate1000 placeholder={toR(settings.land.zoneRates.zone4)} hint="Long haul" />
                    <Field label="Express Multiplier" value={co.expressMultiplier}
                      onChange={v => set(["countryRates", activeCountry, "expressMultiplier"], v)}
                      placeholder={toM(settings.land.expressMultiplier)} />
                    <Field label="Minimum Charge" value={co.minimumCharge}
                      onChange={v => set(["countryRates", activeCountry, "minimumCharge"], v)}
                      placeholder="8" hint="Floor for very short routes" />
                    <Field label="Handling Fee" value={co.handlingFee}
                      onChange={v => set(["countryRates", activeCountry, "handlingFee"], v)}
                      placeholder={toM(settings.local.handlingFee)} />
                    <Field label="Fuel Surcharge %" value={co.fuelRate}
                      onChange={v => set(["countryRates", activeCountry, "fuelRate"], v)}
                      isPercent placeholder={toP(settings.local.fuelRate)} />
                    <Field label="Insurance %" value={co.insuranceRate}
                      onChange={v => set(["countryRates", activeCountry, "insuranceRate"], v)}
                      isPercent placeholder={toP(settings.local.insuranceRate)} hint="% of declared value" />
                    <Field label="Tax % — Domestic" value={co.local?.taxRate}
                      onChange={v => set(["countryRates", activeCountry, "local", "taxRate"], v)}
                      isPercent placeholder={toP(settings.local.taxRate || 0)} hint="VAT/GST on domestic shipments" />
                  </div>

                  <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/10">
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                      International — when {co.label || activeCountry} is the origin
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 max-w-lg">
                      Applies to shipments leaving this country. Tax follows the origin
                      jurisdiction, since that is where the freight service is sold.
                      Destination import VAT is separate and covered by the customs fee.
                    </p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Handling Fee" value={co.international?.handlingFee}
                        onChange={v => set(["countryRates", activeCountry, "international", "handlingFee"], v)}
                        placeholder={toM(settings.international.handlingFee)} />
                      <Field label="Customs Clearance" value={co.international?.customsFee}
                        onChange={v => set(["countryRates", activeCountry, "international", "customsFee"], v)}
                        placeholder={toM(settings.international.customsFee)} />
                      <Field label="Fuel Surcharge %" value={co.international?.fuelRate}
                        onChange={v => set(["countryRates", activeCountry, "international", "fuelRate"], v)}
                        isPercent placeholder={toP(settings.international.fuelRate)} />
                      <Field label="Insurance %" value={co.international?.insuranceRate}
                        onChange={v => set(["countryRates", activeCountry, "international", "insuranceRate"], v)}
                        isPercent placeholder={toP(settings.international.insuranceRate)} />
                      <Field label="Tax %" value={co.international?.taxRate}
                        onChange={v => set(["countryRates", activeCountry, "international", "taxRate"], v)}
                        isPercent placeholder={toP(settings.international.taxRate || 0)} />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Changes take effect on the next quote. Test a real route in each affected market
            before leaving this page.
          </p>
        </div>
      </div>

      {/* Add country modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Add country rate card</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {localCountries.length
                    ? "Countries with local shipping enabled"
                    : "No local availability configured — showing all countries"}
                </p>
              </div>
              <button onClick={() => { setShowAdd(false); setSearch(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search country…" autoFocus
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm focus:outline-none"
                  style={{ fontSize: "16px" }} />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {addable.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  {search ? "No countries match." : "All available countries already have rate cards."}
                </p>
              ) : addable.map(c => (
                <button key={c.code} onClick={() => addCountry(c.code, c.name)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-white/5 transition cursor-pointer">
                  <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt="" className="w-8 h-6 rounded-sm shrink-0 object-cover" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1">{c.name}</span>
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}