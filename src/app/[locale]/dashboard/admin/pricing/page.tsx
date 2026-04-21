// src/app/[locale]/dashboard/admin/pricing/page.tsx
"use client";

import { useEffect, useState } from "react";

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

const DEFAULT: Settings = {
  international: { shippingFee: 0, handlingFee: 25, customsFee: 50, taxFee: 0, discountFee: 0, fuelRate: 0.05, insuranceRate: 0.01 },
  local: { shippingFee: 0, handlingFee: 10, customsFee: 0, taxFee: 0, discountFee: 0, fuelRate: 0.05, insuranceRate: 0.005 },
  air: { ratePerKgExpress: 8, ratePerKgStandard: 5, zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 } },
  sea: { ratePerKgStandard: 0.8, zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 } },
  land: { zoneRates: { zone1: 5, zone2: 15, zone3: 35, zone4: 60 }, expressMultiplier: 1.5 },
};

const toP = (n: number) => (Number(n || 0) * 100).toFixed(2).replace(/\.00$/, "");
const fromP = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n / 100 : 0; };
const toM = (n: number) => Number(n || 0).toFixed(2).replace(/\.00$/, "");
const fromM = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };

function Field({ label, value, onChange, isPercent, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  isPercent?: boolean; hint?: string;
}) {
  const [raw, setRaw] = useState(isPercent ? toP(value) : toM(value));
  useEffect(() => { setRaw(isPercent ? toP(value) : toM(value)); }, [value, isPercent]);
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-white/10 p-4">
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</p>
      {hint && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      <div className="relative mt-2">
        <input value={raw}
          onChange={e => { setRaw(e.target.value); onChange(isPercent ? fromP(e.target.value) : fromM(e.target.value)); }}
          className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm pr-10"
          inputMode="decimal" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{isPercent ? '%' : '$'}</span>
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
    setSaving(true); setMsg("");
    const res = await fetch("/api/admin/pricing", {
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
          <p className="mt-1 text-xs text-gray-500">Used for all local shipments. Rate is per kg × zone base rate.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Zone 1 — Same City ($/kg)" value={settings.land.zoneRates.zone1} onChange={v => set(['land', 'zoneRates', 'zone1'], v)} hint="Sender & receiver in same city" />
            <Field label="Zone 2 — Same State ($/kg)" value={settings.land.zoneRates.zone2} onChange={v => set(['land', 'zoneRates', 'zone2'], v)} hint="Same state, different city" />
            <Field label="Zone 3 — Adjacent State ($/kg)" value={settings.land.zoneRates.zone3} onChange={v => set(['land', 'zoneRates', 'zone3'], v)} hint="Nearby state" />
            <Field label="Zone 4 — Far State ($/kg)" value={settings.land.zoneRates.zone4} onChange={v => set(['land', 'zoneRates', 'zone4'], v)} hint="Distant state/region" />
            <Field label="Express Multiplier" value={settings.land.expressMultiplier} onChange={v => set(['land', 'expressMultiplier'], v)} hint="e.g. 1.5 = 50% more for express" />
          </div>
        </div>
      </div>
    </div>
  );
}