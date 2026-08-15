// src/app/[locale]/dashboard/admin/pricing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PRICING } from "@/lib/pricing";

type ZoneMultipliers = { sameContinent: number; nearContinent: number; farContinent: number };
type LandZoneRates = { zone1: number; zone2: number; zone3: number; zone4: number };

type PricingProfile = {
  shippingFee: number; handlingFee: number; customsFee: number;
  taxFee: number; discountFee: number; fuelRate: number; insuranceRate: number;
};

type AirSettings = { ratePerKgExpress: number; ratePerKgStandard: number; zoneMultipliers: ZoneMultipliers };
type SeaSettings = { ratePerKgStandard: number; zoneMultipliers: ZoneMultipliers };
type LandSettings = { zoneRates: LandZoneRates; expressMultiplier: number };

type Settings = {
  international: PricingProfile; local: PricingProfile;
  air: AirSettings; sea: SeaSettings; land: LandSettings;
};

// Single source of truth — see src/lib/pricing.ts
const DEFAULT: Settings = DEFAULT_PRICING;

const toP = (n: number) => (Number(n || 0) * 100).toFixed(2).replace(/\.00$/, "");
const fromP = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n / 100 : 0; };
const toM = (n: number) => Number(n || 0).toFixed(2).replace(/\.00$/, "");
const fromM = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

/* Land zone rates are per-km-per-kg, so real values sit around 0.003–0.03.
   Editing those directly invites a misplaced decimal, and toFixed(2) rounds
   them away entirely. Display them per 1000 km instead: type 6, store 0.006. */
const toR = (n: number) => (Number(n || 0) * 1000).toFixed(2).replace(/\.?0+$/, "");
const fromR = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n / 1000 : 0; };

function Field({ label, value, onChange, isPercent, isRate1000, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  isPercent?: boolean; isRate1000?: boolean; hint?: string;
}) {
  const fmt = (v: number) => isPercent ? toP(v) : isRate1000 ? toR(v) : toM(v);
  const parse = (s: string) => isPercent ? fromP(s) : isRate1000 ? fromR(s) : fromM(s);

  const [raw, setRaw] = useState(fmt(value));
  useEffect(() => { setRaw(fmt(value)); }, [value, isPercent, isRate1000]);
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      <div className="relative mt-2">
        <input value={raw}
          onChange={e => { setRaw(e.target.value); onChange(parse(e.target.value)); }}
          className={`w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm ${isRate1000 ? 'pr-24' : 'pr-10'}`}
          inputMode="decimal" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          {isPercent ? '%' : isRate1000 ? '$ /1000km·kg' : '$'}
        </span>
      </div>
    </div>
  );
}

export default function AdminPricingPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/pricing", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    // Merge with defaults to fill in any missing new fields
    const s = json?.settings || {};
    setSettings({
      international: { ...DEFAULT.international, ...s.international },
      local: { ...DEFAULT.local, ...s.local },
      air: { ...DEFAULT.air, ...s.air, zoneMultipliers: { ...DEFAULT.air.zoneMultipliers, ...s.air?.zoneMultipliers } },
      sea: { ...DEFAULT.sea, ...s.sea, zoneMultipliers: { ...DEFAULT.sea.zoneMultipliers, ...s.sea?.zoneMultipliers } },
      land: { ...DEFAULT.land, ...s.land, zoneRates: { ...DEFAULT.land.zoneRates, ...s.land?.zoneRates } },
    });
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
  if (!settings) return;
  setSaving(true); setMsg('');
  const res = await fetch('/api/admin/pricing', {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) { alert(json?.error || "Failed to save"); return; }
    setMsg("Saved ✅");
    setTimeout(() => setMsg(""), 2000);
    await load();
  };

  const set = (path: string[], val: number) => {
    setSettings(prev => {
      if (!prev) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = val;
      return next;
    });
  };

  if (!settings) return <div className="max-w-3xl mx-auto"><p className="text-sm text-gray-700 dark:text-gray-200">Loading…</p></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Admin • Pricing</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Configure fees and rates for all shipment types.</p>
            {msg && <p className="mt-2 text-sm font-semibold text-green-700 dark:text-green-300">{msg}</p>}
          </div>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* ── Base profiles ── */}
        {(["international", "local"] as const).map(scope => (
          <div key={scope} className="mt-8">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">
              {scope === "international" ? "International — Fixed Fees & Rates" : "Local — Fixed Fees & Rates"}
            </h2>
            <p className="mt-1 text-xs text-gray-500">Applied on top of freight calculations for all {scope} shipments.</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Shipping Fee (fixed)" value={settings[scope].shippingFee} onChange={v => set([scope, 'shippingFee'], v)} />
              <Field label="Handling Fee (fixed)" value={settings[scope].handlingFee} onChange={v => set([scope, 'handlingFee'], v)} />
              {scope === 'international' && <Field label="Customs Clearance (fixed)" value={settings[scope].customsFee} onChange={v => set([scope, 'customsFee'], v)} />}
              <Field label="Tax (fixed)" value={settings[scope].taxFee} onChange={v => set([scope, 'taxFee'], v)} />
              <Field label="Discount (fixed)" value={settings[scope].discountFee} onChange={v => set([scope, 'discountFee'], v)} />
              <Field label="Fuel Surcharge %" value={settings[scope].fuelRate} onChange={v => set([scope, 'fuelRate'], v)} isPercent hint="% of base freight" />
              <Field label="Insurance %" value={settings[scope].insuranceRate} onChange={v => set([scope, 'insuranceRate'], v)} isPercent hint="% of declared value" />
            </div>
          </div>
        ))}

        {/* ── Air freight ── */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">✈️ Air Freight Rates</h2>
          <p className="mt-1 text-xs text-gray-500">Used for international shipments auto-selected as Air. Rate × weight × zone multiplier.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Rate per kg — Express" value={settings.air.ratePerKgExpress} onChange={v => set(['air', 'ratePerKgExpress'], v)} hint="$ per kg for express" />
            <Field label="Rate per kg — Standard" value={settings.air.ratePerKgStandard} onChange={v => set(['air', 'ratePerKgStandard'], v)} hint="$ per kg for standard" />
            <Field label="Same Continent Multiplier" value={settings.air.zoneMultipliers.sameContinent} onChange={v => set(['air', 'zoneMultipliers', 'sameContinent'], v)} hint="e.g. 1.0 = no extra" />
            <Field label="Near Continent Multiplier" value={settings.air.zoneMultipliers.nearContinent} onChange={v => set(['air', 'zoneMultipliers', 'nearContinent'], v)} hint="e.g. 1.3 = 30% more" />
            <Field label="Far Continent Multiplier" value={settings.air.zoneMultipliers.farContinent} onChange={v => set(['air', 'zoneMultipliers', 'farContinent'], v)} hint="e.g. 1.6 = 60% more" />
          </div>
        </div>

        {/* ── Sea freight ── */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">🚢 Sea Freight Rates</h2>
          <p className="mt-1 text-xs text-gray-500">Used for heavy/bulk international shipments. Always standard delivery speed.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Rate per kg — Standard" value={settings.sea.ratePerKgStandard} onChange={v => set(['sea', 'ratePerKgStandard'], v)} hint="$ per kg" />
            <Field label="Same Continent Multiplier" value={settings.sea.zoneMultipliers.sameContinent} onChange={v => set(['sea', 'zoneMultipliers', 'sameContinent'], v)} />
            <Field label="Near Continent Multiplier" value={settings.sea.zoneMultipliers.nearContinent} onChange={v => set(['sea', 'zoneMultipliers', 'nearContinent'], v)} />
            <Field label="Far Continent Multiplier" value={settings.sea.zoneMultipliers.farContinent} onChange={v => set(['sea', 'zoneMultipliers', 'farContinent'], v)} />
          </div>
        </div>

        {/* ── Land freight ── */}
        <div className="mt-10">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100">🚛 Land Freight Rates</h2>
          <p className="mt-1 text-xs text-gray-500">
            Used for all local shipments. Base freight = distance (km) × rate × weight (kg).
            Rates are entered per 1000 km per kg, so a value of 6 means $0.006 per km per kg.
            Longer zones should use a <strong>lower</strong> rate, since distance is already
            in the formula and fixed costs spread out over the journey.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Zone 1 — Same City" value={settings.land.zoneRates.zone1} onChange={v => set(['land', 'zoneRates', 'zone1'], v)} isRate1000 hint="Same city · suggested 30" />
            <Field label="Zone 2 — Same State" value={settings.land.zoneRates.zone2} onChange={v => set(['land', 'zoneRates', 'zone2'], v)} isRate1000 hint="Same state, different city · suggested 12" />
            <Field label="Zone 3 — Adjacent State" value={settings.land.zoneRates.zone3} onChange={v => set(['land', 'zoneRates', 'zone3'], v)} isRate1000 hint="Nearby state · suggested 6" />
            <Field label="Zone 4 — Far State" value={settings.land.zoneRates.zone4} onChange={v => set(['land', 'zoneRates', 'zone4'], v)} isRate1000 hint="Distant state/region · suggested 3" />
            <Field label="Express Multiplier" value={settings.land.expressMultiplier} onChange={v => set(['land', 'expressMultiplier'], v)} hint="e.g. 1.5 = 50% more for express" />
          </div>
        </div>
      </div>
    </div>
  );
}