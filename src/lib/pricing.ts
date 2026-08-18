// src/lib/pricing.ts

import { getCountryDistance, getStateDistance } from './distances';

import { addBusinessDays } from './holidays';

export type ShipmentMeans = 'air' | 'sea' | 'land';
export type ServiceLevel = 'Express' | 'Standard';
export type ShipmentType = 'Documents' | 'Parcel' | 'Bulk / Pallet' | 'Container';
export type ShipmentScope = 'international' | 'local';


// ─── Zone multipliers ────────────────────────────────────────
export type ZoneMultipliers = {
  sameContinent: number;
  nearContinent: number;
  farContinent: number;
};

// ─── Land distance zones ─────────────────────────────────────
export type LandZoneRates = {
  zone1: number; // same city
  zone2: number; // same state
  zone3: number; // adjacent state
  zone4: number; // far state
};

// ─── Per-profile settings ────────────────────────────────────
export type PricingSettings = {
  // Fixed fees (shared)
  shippingFee: number;
  handlingFee: number;
  customsFee: number;
  taxFee: number;
  discountFee: number;
  // Percentage rates (shared)
  fuelRate: number;       // fraction e.g. 0.05 = 5%
  insuranceRate: number;  // fraction e.g. 0.01 = 1%
  /** Fraction of the discounted subtotal, e.g. 0.075 = 7.5% VAT. */
  taxRate?: number;
};

// ─── Air freight settings ─────────────────────────────────────
export type AirFreightSettings = {
  ratePerKgExpress: number;
  ratePerKgStandard: number;
  /** Legacy 3-band multipliers. Used only when zoneTable has no entry. */
  zoneMultipliers: ZoneMultipliers;
  /** Multiplier per zone 1–9. Zone 1 is domestic-adjacent, 9 is the most remote. */
  zoneRates?: Record<string, number>;
};

// ─── Sea freight settings ─────────────────────────────────────
export type SeaFreightSettings = {
  ratePerKgStandard: number;
  zoneMultipliers: ZoneMultipliers;
  zoneRates?: Record<string, number>;
};

/* Carrier-style zone table. Real carriers price international freight by
   zone rather than by distance, because cost is driven by which lanes and
   hubs a shipment routes through. Three continent bands were too coarse —
   Morocco and Nigeria both landed in "farContinent" despite very different
   lanes. This assigns each origin a zone per destination region.

   Keyed by origin continent, then destination continent, giving a base zone.
   Per-country adjustments refine lanes that are unusually well or poorly
   served relative to their region. */
export type ZoneTable = {
  /** e.g. { "NA": { "EU": 4, "AF": 7 } } */
  regions: Record<string, Record<string, number>>;
  /** Per-destination-country override, e.g. { "MA": -1 } shifts a zone down */
  countryAdjust?: Record<string, number>;
};

// ─── Land freight settings ───────────────────────────────────
export type LandFreightSettings = {
  zoneRates: LandZoneRates;
  expressMultiplier: number;
};

/* Per-country overrides for LOCAL (domestic) shipments.
   Freight costs differ enormously by market: a 30 kg parcel moved 250 km
   costs roughly $70 in the US and about $8 in Nigeria. One global rate
   card cannot serve both.

   Every field is optional. Anything omitted falls back to the global
   `local` profile and `land` settings, so a country can override only
   its handling fee without restating the whole card.

   Countries with no entry inherit the defaults entirely. */
/** Fee overrides that apply within one scope (local or international). */
export type CountryScopeOverride = {
  shippingFee?: number;
  handlingFee?: number;
  customsFee?: number;
  fuelRate?: number;
  insuranceRate?: number;
  /** Fraction, e.g. 0.075 = 7.5%. Applied to the discounted subtotal. */
  taxRate?: number;
  /** Fixed amount added on top of taxRate. Usually 0. */
  taxFee?: number;
};

export type CountryRateOverride = {
  label?: string;

  /* Land rates — domestic shipments only */
  zoneRates?: Partial<LandZoneRates>;
  expressMultiplier?: number;
  minimumCharge?: number;

  /* Legacy flat fields. These mean "local" and are kept so existing
     country cards keep working. `local` below takes precedence. */
  handlingFee?: number;
  fuelRate?: number;
  insuranceRate?: number;

  /* Scope-specific overrides */
  local?: CountryScopeOverride;
  /** Applied when this country is the ORIGIN of an international shipment. */
  international?: CountryScopeOverride;
};

export type CountryRates = Record<string, CountryRateOverride>;

// ─── Full pricing profiles ───────────────────────────────────
export type PricingProfiles = {
  international: PricingSettings;
  local: PricingSettings;
  air: AirFreightSettings;
  sea: SeaFreightSettings;
  land: LandFreightSettings;
 /** Keyed by ISO country code, e.g. { NG: {...}, GB: {...} } */
  countryRates?: CountryRates;
  /** Overrides the built-in carrier zone table. */
  zoneTable?: ZoneTable;
};

/* Minimum land charge floor. Prevents a near-zero total on very short
   routes where km rounds down close to 0. */
const LAND_MINIMUM_CHARGE = 8;

/* Weight breaks. Freight cost is mostly per-trip, not per-kilogram, so the
   effective rate must fall as weight rises. Without this, 300 kg prices at
   15x the cost of 20 kg, which no carrier charges.
   Each tier's factor applies only to the weight falling inside that tier. */
const WEIGHT_BREAKS: { upTo: number; factor: number }[] = [
  { upTo: 30, factor: 1.00 },
  { upTo: 100, factor: 0.55 },
  { upTo: 300, factor: 0.30 },
  { upTo: 1000, factor: 0.18 },
  { upTo: Infinity, factor: 0.10 },
];

/** Weight in kg converted to rate-equivalent units, applying tiered factors. */
function effectiveWeight(kg: number): number {
  let remaining = Math.max(0, kg);
  let prev = 0;
  let total = 0;
  for (const tier of WEIGHT_BREAKS) {
    if (remaining <= 0) break;
    const band = Math.min(remaining, tier.upTo - prev);
    total += band * tier.factor;
    remaining -= band;
    prev = tier.upTo;
  }
  return total;
}

/** Resolves the effective land settings for a country, falling back to global. */
export function resolveLandRates(
  countryCode: string,
  pricing: PricingProfiles
): { zoneRates: LandZoneRates; expressMultiplier: number; minimumCharge: number } {
  const o = pricing.countryRates?.[String(countryCode || '').toUpperCase()] || {};
  return {
    zoneRates: { ...pricing.land.zoneRates, ...(o.zoneRates || {}) },
    expressMultiplier: o.expressMultiplier ?? pricing.land.expressMultiplier ?? 1,
    minimumCharge: o.minimumCharge ?? LAND_MINIMUM_CHARGE,
  };
}

/** Merges a scope override onto a base profile, ignoring undefined fields. */
function applyScope(base: PricingSettings, o?: CountryScopeOverride): PricingSettings {
  if (!o) return base;
  return {
    ...base,
    shippingFee: o.shippingFee ?? base.shippingFee,
    handlingFee: o.handlingFee ?? base.handlingFee,
    customsFee: o.customsFee ?? base.customsFee,
    fuelRate: o.fuelRate ?? base.fuelRate,
    insuranceRate: o.insuranceRate ?? base.insuranceRate,
    taxRate: o.taxRate ?? base.taxRate,
    taxFee: o.taxFee ?? base.taxFee,
  };
}

/** Effective local profile for a country. Legacy flat fields apply first,
 *  then the explicit `local` block wins. */
export function resolveLocalProfile(
  countryCode: string,
  pricing: PricingProfiles
): PricingSettings {
  const o = pricing.countryRates?.[String(countryCode || '').toUpperCase()] || {};
  const legacy: PricingSettings = {
    ...pricing.local,
    handlingFee: o.handlingFee ?? pricing.local.handlingFee,
    fuelRate: o.fuelRate ?? pricing.local.fuelRate,
    insuranceRate: o.insuranceRate ?? pricing.local.insuranceRate,
  };
  return applyScope(legacy, o.local);
}

/** Effective international profile, keyed on the ORIGIN country.
 *  You are selling a freight service from there, so that jurisdiction's
 *  service tax applies. Destination import VAT is separate and is covered
 *  by the customs fee. */
export function resolveInternationalProfile(
  originCountryCode: string,
  pricing: PricingProfiles
): PricingSettings {
  const o = pricing.countryRates?.[String(originCountryCode || '').toUpperCase()] || {};
  return applyScope(pricing.international, o.international);
}

// ─── Defaults ────────────────────────────────────────────────
export const DEFAULT_PRICING: PricingProfiles = {
  international: {
    shippingFee: 0,
    handlingFee: 35,        // doc handling, scanning, paperwork
    customsFee: 75,         // customs clearance + brokerage
    taxFee: 0,              // computed from country
    discountFee: 0,
    fuelRate: 0.18,         // 18% fuel surcharge — current industry norm
    insuranceRate: 0.015,   // 1.5% of declared value
  },
  local: {
    shippingFee: 0,
    handlingFee: 8,
    customsFee: 0,
    taxFee: 0,
    discountFee: 0,
    fuelRate: 0.12,         // lower domestic surcharge
    insuranceRate: 0.005,   // 0.5% of declared value
  },
  air: {
    ratePerKgExpress: 12.50,     // ~$12.50/kg express airfreight (DHL/FedEx range)
    ratePerKgStandard: 7.80,     // ~$7.80/kg standard airfreight
    zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 },
    zoneRates: { "1": 0.80, "2": 0.95, "3": 1.10, "4": 1.25, "5": 1.45, "6": 1.65, "7": 1.85, "8": 2.10, "9": 2.40 },
  },
  sea: {
    ratePerKgStandard: 1.20,     // $1.20/kg LCL sea freight
    zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.25, farContinent: 1.5 },
    zoneRates: { "1": 0.85, "2": 0.95, "3": 1.05, "4": 1.15, "5": 1.30, "6": 1.45, "7": 1.60, "8": 1.80, "9": 2.00 },
  },
  land: {
    /* Per km per kg, USD. Rates FALL as distance rises, because fixed costs
       (pickup, sorting, admin) spread over a longer journey. Calibrated to
       the US market, which is also the fallback for any country without an
       entry in countryRates. */
    zoneRates: { zone1: 0.025, zone2: 0.010, zone3: 0.006, zone4: 0.0018 },
    expressMultiplier: 1.45,
  },
  countryRates: {
    US: { label: 'United States' },
    GB: { label: 'United Kingdom', zoneRates: { zone1: 0.030, zone2: 0.014, zone3: 0.009, zone4: 0.004 }, handlingFee: 9 },
    DE: { label: 'Germany', zoneRates: { zone1: 0.028, zone2: 0.013, zone3: 0.008, zone4: 0.0035 }, handlingFee: 9 },
    CA: { label: 'Canada', zoneRates: { zone1: 0.024, zone2: 0.009, zone3: 0.005, zone4: 0.0015 } },
    AU: { label: 'Australia', zoneRates: { zone1: 0.026, zone2: 0.010, zone3: 0.005, zone4: 0.0016 }, handlingFee: 9 },
    AE: { label: 'UAE', zoneRates: { zone1: 0.020, zone2: 0.009, zone3: 0.006, zone4: 0.003 }, handlingFee: 6 },
    ZA: { label: 'South Africa', zoneRates: { zone1: 0.010, zone2: 0.004, zone3: 0.0022, zone4: 0.0009 }, handlingFee: 3, insuranceRate: 0.01 },
    BR: { label: 'Brazil', zoneRates: { zone1: 0.009, zone2: 0.0035, zone3: 0.0020, zone4: 0.0008 }, handlingFee: 3, insuranceRate: 0.01 },
    IN: { label: 'India', zoneRates: { zone1: 0.006, zone2: 0.0022, zone3: 0.0013, zone4: 0.0006 }, handlingFee: 2, insuranceRate: 0.01 },
    NG: { label: 'Nigeria', zoneRates: { zone1: 0.008, zone2: 0.003, zone3: 0.0016, zone4: 0.0008 }, handlingFee: 2, insuranceRate: 0.01, minimumCharge: 3 },
    GH: { label: 'Ghana', zoneRates: { zone1: 0.008, zone2: 0.003, zone3: 0.0016, zone4: 0.0008 }, handlingFee: 2, insuranceRate: 0.01, minimumCharge: 3 },
    KE: { label: 'Kenya', zoneRates: { zone1: 0.007, zone2: 0.0028, zone3: 0.0015, zone4: 0.0007 }, handlingFee: 2, insuranceRate: 0.01, minimumCharge: 3 },
  },
};

// ─── Continent map ────────────────────────────────────────────
const COUNTRY_CONTINENT: Record<string, string> = {
  // Africa
  NG:'AF',GH:'AF',ZA:'AF',KE:'AF',ET:'AF',EG:'AF',TZ:'AF',UG:'AF',DZ:'AF',
  MA:'AF',TN:'AF',SD:'AF',AO:'AF',MZ:'AF',MG:'AF',CM:'AF',CI:'AF',SN:'AF',
  ZM:'AF',ZW:'AF',ML:'AF',NE:'AF',BF:'AF',MW:'AF',TD:'AF',SO:'AF',GN:'AF',
  RW:'AF',BJ:'AF',BI:'AF',SS:'AF',TG:'AF',SL:'AF',LR:'AF',CF:'AF',ER:'AF',
  GA:'AF',GW:'AF',GQ:'AF',ST:'AF',CV:'AF',SC:'AF',MU:'AF',KM:'AF',DJ:'AF',
  NA:'AF',BW:'AF',LS:'AF',SZ:'AF',
  // Asia
  CN:'AS',IN:'AS',JP:'AS',KR:'AS',ID:'AS',PH:'AS',VN:'AS',TH:'AS',MY:'AS',
  BD:'AS',MM:'AS',IQ:'AS',SA:'AS',AE:'AS',SY:'AS',YE:'AS',AF:'AS',UZ:'AS',
  PK:'AS',NP:'AS',LK:'AS',KH:'AS',LA:'AS',TW:'AS',HK:'AS',SG:'AS',MN:'AS',
  KZ:'AS',AZ:'AS',GE:'AS',AM:'AS',TJ:'AS',TM:'AS',KG:'AS',BT:'AS',MV:'AS',
  KW:'AS',QA:'AS',BH:'AS',OM:'AS',JO:'AS',LB:'AS',IL:'AS',PS:'AS',IR:'AS',
  // Europe
  DE:'EU',FR:'EU',GB:'EU',IT:'EU',ES:'EU',PL:'EU',NL:'EU',BE:'EU',SE:'EU',
  NO:'EU',DK:'EU',FI:'EU',CH:'EU',AT:'EU',PT:'EU',CZ:'EU',RO:'EU',HU:'EU',
  GR:'EU',BG:'EU',HR:'EU',SK:'EU',LT:'EU',LV:'EU',EE:'EU',SI:'EU',RS:'EU',
  UA:'EU',BY:'EU',MD:'EU',AL:'EU',MK:'EU',ME:'EU',BA:'EU',RU:'EU',LU:'EU',
  MT:'EU',CY:'EU',IS:'EU',LI:'EU',MC:'EU',SM:'EU',AD:'EU',VA:'EU',
  // North America
  US:'NA',CA:'NA',MX:'NA',GT:'NA',BZ:'NA',HN:'NA',SV:'NA',NI:'NA',CR:'NA',
  PA:'NA',CU:'NA',DO:'NA',HT:'NA',JM:'NA',TT:'NA',BB:'NA',BS:'NA',AG:'NA',
  DM:'NA',GD:'NA',KN:'NA',LC:'NA',VC:'NA',
  // South America
  BR:'SA',AR:'SA',CO:'SA',PE:'SA',VE:'SA',CL:'SA',EC:'SA',BO:'SA',PY:'SA',
  UY:'SA',GY:'SA',SR:'SA',
  // Oceania
  AU:'OC',NZ:'OC',PG:'OC',FJ:'OC',SB:'OC',VU:'OC',WS:'OC',TO:'OC',KI:'OC',
  FM:'OC',MH:'OC',PW:'OC',NR:'OC',TV:'OC',
  // Middle East (grouped with Asia above, extras)
  TR:'EU', // Turkey straddles both but grouped EU for simplicity
};

const NEAR_CONTINENTS: Record<string, string[]> = {
  AF: ['EU','AS'],
  EU: ['AF','AS','NA'],
  AS: ['EU','AF','OC'],
  NA: ['EU','SA'],
  SA: ['NA','EU'],
  OC: ['AS'],
};

/* Default zone table. Zones run 1 (nearest, best-served) to 9 (most remote).
   Rates rise with zone number. Adjustments shift a specific destination up or
   down relative to its region — Morocco is closer and better connected to
   Europe and North America than most of Africa, so it shifts down. */
export const DEFAULT_ZONE_TABLE: ZoneTable = {
  regions: {
    NA: { NA: 2, SA: 4, EU: 4, AF: 7, AS: 6, OC: 8 },
    EU: { EU: 2, NA: 4, AF: 5, AS: 5, SA: 7, OC: 8 },
    AS: { AS: 3, OC: 5, EU: 5, AF: 6, NA: 6, SA: 8 },
    AF: { AF: 4, EU: 5, AS: 6, NA: 7, SA: 8, OC: 9 },
    SA: { SA: 3, NA: 4, EU: 7, AF: 8, AS: 8, OC: 9 },
    OC: { OC: 3, AS: 5, NA: 8, EU: 8, AF: 9, SA: 9 },
  },
  countryAdjust: {
    // Well-connected hubs — shift toward cheaper zones
    SG: -1, HK: -1, AE: -1, NL: -1, GB: -1, DE: -1, US: -1, JP: -1,
    MA: -1, ZA: -1, KR: -1, CN: -1, CA: -1, FR: -1, BE: -1,
    // Thin or costly lanes — shift toward pricier zones
    NZ: 1, PG: 1, BO: 1, PY: 1, MN: 1, NP: 1, AF: 1, SS: 1,
    TD: 1, NE: 1, ML: 1, MG: 1, ER: 1, SO: 1, YE: 1,
  },
};

/** Default multiplier per zone. Applied to the per-kg rate. */
export const DEFAULT_ZONE_MULTIPLIERS: Record<string, number> = {
  "1": 0.80, "2": 0.95, "3": 1.10, "4": 1.25, "5": 1.45,
  "6": 1.65, "7": 1.85, "8": 2.10, "9": 2.40,
};

/** Resolves the carrier zone (1–9) for a lane. */
export function getShippingZone(
  fromCode: string,
  toCode: string,
  table: ZoneTable = DEFAULT_ZONE_TABLE
): number {
  const from = COUNTRY_CONTINENT[String(fromCode || '').toUpperCase()] || 'NA';
  const to = COUNTRY_CONTINENT[String(toCode || '').toUpperCase()] || 'NA';

  const base = table.regions?.[from]?.[to] ?? 6;
  const adjust = table.countryAdjust?.[String(toCode || '').toUpperCase()] ?? 0;

  return Math.min(9, Math.max(1, base + adjust));
}

/** Multiplier for a lane, falling back to the legacy 3-band scheme. */
export function getZoneMultiplier(
  fromCode: string,
  toCode: string,
  zoneRates: Record<string, number> | undefined,
  legacy: ZoneMultipliers,
  table?: ZoneTable
): number {
  const zone = getShippingZone(fromCode, toCode, table);
  const fromTable = zoneRates?.[String(zone)];
  if (Number.isFinite(fromTable) && (fromTable as number) > 0) return fromTable as number;

  const preset = DEFAULT_ZONE_MULTIPLIERS[String(zone)];
  if (Number.isFinite(preset)) return preset;

  // Legacy fallback
  const band = getContinentZone(fromCode, toCode);
  return legacy?.[band] ?? 1;
}

export function getContinentZone(fromCode: string, toCode: string): keyof ZoneMultipliers {
  const from = COUNTRY_CONTINENT[fromCode] || 'NA';
  const to = COUNTRY_CONTINENT[toCode] || 'NA';
  if (from === to) return 'sameContinent';
  const near = NEAR_CONTINENTS[from] || [];
  if (near.includes(to)) return 'nearContinent';
  return 'farContinent';
}

// ─── Land zone detection ─────────────────────────────────────
export type LandZone = 'zone1' | 'zone2' | 'zone3' | 'zone4';

/* Zone is chosen by actual distance rather than by name matching.
   The previous version compared first letters of state names, so Lagos and
   Oyo landed in zone4 despite bordering, while California and Colorado
   landed in zone3 despite being 1,500 km apart.
   Same city and same state still short-circuit, since those are certain. */
export function getLandZone(
  senderCity: string, senderState: string,
  receiverCity: string, receiverState: string,
  distanceKm?: number
): LandZone {
  const sc = senderCity.trim().toLowerCase();
  const rc = receiverCity.trim().toLowerCase();
  const ss = senderState.trim().toLowerCase();
  const rs = receiverState.trim().toLowerCase();

  if (sc && rc && sc === rc && ss === rs) return 'zone1';
  if (ss && rs && ss === rs) return 'zone2';

  const km = Number(distanceKm);
  if (Number.isFinite(km) && km > 0) {
    if (km < 50) return 'zone1';
    if (km < 300) return 'zone2';
    if (km < 800) return 'zone3';
    return 'zone4';
  }

  return 'zone4';
}

// ─── Auto-select means ────────────────────────────────────────
export function autoSelectMeans(
  scope: ShipmentScope,
  serviceLevel: ServiceLevel,
  weightKg: number,
  shipmentType: ShipmentType
): ShipmentMeans {
  if (scope === 'local') return 'land';
  const isBulk = shipmentType === 'Container' || shipmentType === 'Bulk / Pallet';
  // Container / bulk → always sea
  if (isBulk) return 'sea';
  // > 10,000 kg → force Sea Freight (Air disabled at this weight)
  if (weightKg > 10000) return 'sea';
  // International, ≤ 10,000 kg → air
  return 'air';
}



// ─── Distance-based delivery time ────────────────────────────
/* `label` is English and for internal use only — logs, admin views, emails
   that have not been localised yet. Customer-facing surfaces should render
   min/max through Delivery.* so the text follows the reader's language. */
export function getDeliveryDays(
  means: ShipmentMeans,
  serviceLevel: ServiceLevel,
  distanceKm: number = 5000
): { min: number; max: number; label: string } {
  const km = Math.max(0, distanceKm);

  if (means === 'land') {
    // Local delivery — distance in km between states/cities
    if (serviceLevel === 'Express') {
      if (km < 50) return { min: 0, max: 1, label: 'Same-day – next day' };
      if (km < 300) return { min: 1, max: 2, label: '1–2 business days' };
      if (km < 700) return { min: 1, max: 2, label: '1–2 business days' };
      return { min: 2, max: 3, label: '2–3 business days' };
    }
    // Standard
    if (km < 50) return { min: 1, max: 2, label: '1–2 business days' };
    if (km < 300) return { min: 2, max: 4, label: '2–4 business days' };
    if (km < 700) return { min: 2, max: 5, label: '2–5 business days' };
    return { min: 3, max: 6, label: '3–6 business days' };
  }

  if (means === 'air') {
    // International air freight
    if (serviceLevel === 'Express') {
      if (km < 3000) return { min: 2, max: 3, label: '2–3 business days' };
      if (km < 7000) return { min: 3, max: 5, label: '3–5 business days' };
      if (km < 12000) return { min: 4, max: 7, label: '4–7 business days' };
      return { min: 5, max: 8, label: '5–8 business days' };
    }
    // Standard
    if (km < 3000) return { min: 4, max: 7, label: '4–7 business days' };
    if (km < 7000) return { min: 5, max: 10, label: '5–10 business days' };
    if (km < 12000) return { min: 7, max: 12, label: '7–12 business days' };
    return { min: 10, max: 14, label: '10–14 business days' };
  }

  // Sea — always Standard
  if (km < 5000) return { min: 15, max: 25, label: '15–25 business days' };
  if (km < 10000) return { min: 20, max: 35, label: '20–35 business days' };
  if (km < 15000) return { min: 25, max: 40, label: '25–40 business days' };
  return { min: 30, max: 45, label: '30–45 business days' };
}



export function getEstimatedDeliveryDate(
  means: ShipmentMeans,
  serviceLevel: ServiceLevel,
  distanceKm: number = 5000
): string {
  const { max } = getDeliveryDays(means, serviceLevel, distanceKm);
  const date = addBusinessDays(new Date(), max);
  return date.toISOString().split('T')[0];
}


// ─── Invoice breakdown ────────────────────────────────────────
export type InvoiceBreakdown = {
  means: ShipmentMeans;
  shipping: number;
  baseFreight: number;
  fuel: number;
  insurance: number;
  handling: number;
  customs: number;
  tax: number;
  discount: number;
  subtotal: number;
  total: number;
  declaredValue: number;
  weightKg: number;
  currency: string;
};

export function computeInvoice(params: {
  scope: ShipmentScope;
  means: ShipmentMeans;
  serviceLevel: ServiceLevel;
  weightKg: number;
  declaredValue: number;
  currency: string;
  /** Units of `currency` per 1 USD. All pricing settings are USD-denominated,
   *  so declared value is converted in and every output is converted back out.
   *  Omit or pass 1 when the amounts are already USD. */
  fxRate?: number;
  senderCountryCode: string;
  receiverCountryCode: string;
  senderCity: string;
  senderState: string;
  receiverCity: string;
  receiverState: string;
  pricing: PricingProfiles;
}): InvoiceBreakdown {
 const {
    scope, means, serviceLevel, weightKg, declaredValue, currency,
    senderCountryCode, receiverCountryCode,
    senderCity, senderState, receiverCity, receiverState,
    pricing,
  } = params;

  const fx = Number.isFinite(params.fxRate) && (params.fxRate as number) > 0
    ? (params.fxRate as number)
    : 1;

 const profile = scope === 'local'
    ? resolveLocalProfile(senderCountryCode, pricing)
    : resolveInternationalProfile(senderCountryCode, pricing);
  const w = Math.max(0, weightKg);
  // Declared value arrives in the display currency; rates are USD
  const dv = Math.max(0, declaredValue) / fx;

  let baseFreight = 0;

  if (means === 'air') {
    const rate = serviceLevel === 'Express'
      ? pricing.air.ratePerKgExpress
      : pricing.air.ratePerKgStandard;
   const mult = getZoneMultiplier(
      senderCountryCode, receiverCountryCode,
      pricing.air.zoneRates, pricing.air.zoneMultipliers, pricing.zoneTable
    );
    baseFreight = rate * effectiveWeight(w) * mult;
  } else if (means === 'sea') {
    const mult = getZoneMultiplier(
      senderCountryCode, receiverCountryCode,
      pricing.sea.zoneRates, pricing.sea.zoneMultipliers, pricing.zoneTable
    );
    baseFreight = pricing.sea.ratePerKgStandard * effectiveWeight(w) * mult;
  } else {
    // land — admin-configured per-km-per-kg rate, chosen by distance zone
    const km = getStateDistance(senderCountryCode, senderState, receiverState);
    const zone = getLandZone(senderCity, senderState, receiverCity, receiverState, km);
    const landRates = resolveLandRates(senderCountryCode, pricing);
    const ratePerKmKg = landRates.zoneRates?.[zone] ?? 0.010;
    let base = km * ratePerKmKg * effectiveWeight(w);
    if (serviceLevel === 'Express') {
      base *= landRates.expressMultiplier;
    }
    baseFreight = Math.max(landRates.minimumCharge, base);
  }

  // Add declared value factor (0.5% of declared value as cargo value fee)
  const cargoValueFee = dv * 0.005;
  baseFreight += cargoValueFee;

  const fuel = baseFreight * profile.fuelRate;
  const insurance = dv * profile.insuranceRate;
  const handling = profile.handlingFee;
  const customs = scope === 'international' ? profile.customsFee : 0;
  const discount = profile.discountFee;
  const shippingFixed = profile.shippingFee;

  const subtotal = baseFreight + fuel + insurance + handling + customs + shippingFixed;

  /* Tax applies to the discounted subtotal, which is standard practice.
     taxRate is a fraction of that; taxFee is a flat amount on top. */
  const taxable = Math.max(0, subtotal - discount);
  const tax = (profile.taxFee || 0) + taxable * (profile.taxRate || 0);

  const total = Math.max(0, taxable + tax);

  // Convert every output back into the display currency
  const out = (usd: number) => Math.round(usd * fx * 100) / 100;

  return {
    means,
    shipping: out(shippingFixed),
    baseFreight: out(baseFreight),
    fuel: out(fuel),
    insurance: out(insurance),
    handling: out(handling),
    customs: out(customs),
    tax: out(tax),
    discount: out(discount),
    subtotal: out(subtotal),
    total: out(total),
    declaredValue: Math.max(0, declaredValue), // as entered
    weightKg: w,
    currency,
  };
}

// Keep backward compat export for existing admin create shipment page
export function computeInvoiceFromDeclaredValue(
  declaredValue: number,
  settings: PricingSettings
): {
  declaredValue: number; shipping: number; fuel: number; handling: number;
  customs: number; insurance: number; tax: number; discount: number;
  subtotal: number; total: number;
} {
  const dv = Math.max(0, declaredValue);
  const shipping = settings.shippingFee || 0;
  const fuel = shipping * (settings.fuelRate || 0);
  const handling = settings.handlingFee || 0;
  const customs = settings.customsFee || 0;
  const insurance = dv * (settings.insuranceRate || 0);
  const tax = settings.taxFee || 0;
  const discount = settings.discountFee || 0;
  const subtotal = shipping + fuel + handling + customs + insurance;
  const total = Math.max(0, subtotal + tax - discount);
  return { declaredValue: dv, shipping, fuel, handling, customs, insurance, tax, discount, subtotal, total };
}