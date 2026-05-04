// src/lib/pricing.ts

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
};

// ─── Air freight settings ─────────────────────────────────────
export type AirFreightSettings = {
  ratePerKgExpress: number;
  ratePerKgStandard: number;
  zoneMultipliers: ZoneMultipliers;
};

// ─── Sea freight settings ─────────────────────────────────────
export type SeaFreightSettings = {
  ratePerKgStandard: number;
  zoneMultipliers: ZoneMultipliers;
};

// ─── Land freight settings ───────────────────────────────────
export type LandFreightSettings = {
  zoneRates: LandZoneRates;
  expressMultiplier: number;
};

// ─── Full pricing profiles ───────────────────────────────────
export type PricingProfiles = {
  international: PricingSettings;
  local: PricingSettings;
  air: AirFreightSettings;
  sea: SeaFreightSettings;
  land: LandFreightSettings;
};

// ─── Defaults ────────────────────────────────────────────────
export const DEFAULT_PRICING: PricingProfiles = {
  international: {
    shippingFee: 0,
    handlingFee: 25,
    customsFee: 50,
    taxFee: 0,
    discountFee: 0,
    fuelRate: 0.05,
    insuranceRate: 0.01,
  },
  local: {
    shippingFee: 0,
    handlingFee: 10,
    customsFee: 0,
    taxFee: 0,
    discountFee: 0,
    fuelRate: 0.05,
    insuranceRate: 0.005,
  },
  air: {
    ratePerKgExpress: 8,
    ratePerKgStandard: 5,
    zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 },
  },
  sea: {
    ratePerKgStandard: 0.8,
    zoneMultipliers: { sameContinent: 1.0, nearContinent: 1.3, farContinent: 1.6 },
  },
  land: {
    zoneRates: { zone1: 5, zone2: 15, zone3: 35, zone4: 60 },
    expressMultiplier: 1.5,
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

export function getLandZone(
  senderCity: string, senderState: string,
  receiverCity: string, receiverState: string
): LandZone {
  const sc = senderCity.trim().toLowerCase();
  const rc = receiverCity.trim().toLowerCase();
  const ss = senderState.trim().toLowerCase();
  const rs = receiverState.trim().toLowerCase();
  if (sc && rc && sc === rc) return 'zone1';
  if (ss && rs && ss === rs) return 'zone2';
  // Simple heuristic: first letter of state same = adjacent
  if (ss && rs && ss[0] === rs[0]) return 'zone3';
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

// ─── Delivery date calculation ────────────────────────────────
export function getDeliveryDays(
  means: ShipmentMeans,
  serviceLevel: ServiceLevel
): { min: number; max: number; label: string } {
  if (means === 'land') {
    if (serviceLevel === 'Express') return { min: 2, max: 3, label: '2–3 business days' };
    return { min: 3, max: 5, label: '3–5 business days' };
  }
  if (means === 'air') {
    if (serviceLevel === 'Express') return { min: 3, max: 7, label: '3–7 business days' };
    return { min: 5, max: 10, label: '5–10 business days' };
  }
  // sea — always standard
  return { min: 20, max: 40, label: '20–40 business days' };
}

export function getEstimatedDeliveryDate(means: ShipmentMeans, serviceLevel: ServiceLevel): string {
  const { max } = getDeliveryDays(means, serviceLevel);
  const date = new Date();
  let added = 0;
  while (added < max) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date.toISOString().split('T')[0];
}

// ─── Invoice breakdown ────────────────────────────────────────
export type InvoiceBreakdown = {
  means: ShipmentMeans;
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

  const profile = scope === 'local' ? pricing.local : pricing.international;
  const w = Math.max(0, weightKg);
  const dv = Math.max(0, declaredValue);

  let baseFreight = 0;

  if (means === 'air') {
    const rate = serviceLevel === 'Express'
      ? pricing.air.ratePerKgExpress
      : pricing.air.ratePerKgStandard;
    const zone = getContinentZone(senderCountryCode, receiverCountryCode);
    const mult = pricing.air.zoneMultipliers[zone];
    baseFreight = rate * w * mult;
  } else if (means === 'sea') {
    const zone = getContinentZone(senderCountryCode, receiverCountryCode);
    const mult = pricing.sea.zoneMultipliers[zone];
    baseFreight = pricing.sea.ratePerKgStandard * w * mult;
  } else {
    // land
    const zone = getLandZone(senderCity, senderState, receiverCity, receiverState);
    const baseRate = pricing.land.zoneRates[zone];
    const expMult = serviceLevel === 'Express' ? pricing.land.expressMultiplier : 1;
    baseFreight = baseRate * w * expMult;
  }

  // Add declared value factor (0.5% of declared value as cargo value fee)
  const cargoValueFee = dv * 0.005;
  baseFreight += cargoValueFee;

  const fuel = baseFreight * profile.fuelRate;
  const insurance = dv * profile.insuranceRate;
  const handling = profile.handlingFee;
  const customs = scope === 'international' ? profile.customsFee : 0;
  const tax = profile.taxFee;
  const discount = profile.discountFee;
  const shippingFixed = profile.shippingFee;

  const subtotal = baseFreight + fuel + insurance + handling + customs + shippingFixed;
  const total = Math.max(0, subtotal + tax - discount);

  return {
    means, baseFreight, fuel, insurance, handling, customs, tax, discount,
    subtotal, total, declaredValue: dv, weightKg: w, currency,
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