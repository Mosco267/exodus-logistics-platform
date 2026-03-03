// src/lib/pricing.ts

export type PricingSettings = {
  // ✅ FIXED amounts (money)
  shippingFee: number;   // base shipping fee (money)
  handlingFee: number;   // fixed handling (money)
  customsFee: number;    // fixed customs (money)
  taxFee: number;        // fixed tax (money)
  discountFee: number;   // fixed discount (money)

  // ✅ PERCENTAGES (decimals in DB: 0.10 = 10%)
  fuelRate: number;        // % of shippingFee
  insuranceRate: number;   // % of declaredValue
};

export type InvoiceBreakdown = {
  declaredValue: number;

  shipping: number;
  fuel: number;
  handling: number;
  customs: number;
  insurance: number;

  subtotal: number; // excludes tax
  tax: number;      // fixed
  discount: number; // fixed
  total: number;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeInvoiceFromDeclaredValue(
  declaredValue: number,
  s: PricingSettings
): InvoiceBreakdown {
  const dv = Number(declaredValue || 0);

  const shipping = Number(s.shippingFee || 0);

  // % of shipping
  const fuel = shipping * (Number(s.fuelRate) || 0);

  // % of declared value
  const insurance = dv * (Number(s.insuranceRate) || 0);

  const handling = Number(s.handlingFee || 0);
  const customs = Number(s.customsFee || 0);

  // fixed amounts
  const discount = Number(s.discountFee || 0);
  const tax = Number(s.taxFee || 0);

  // subtotal excludes tax
  const subtotal = shipping + fuel + handling + customs + insurance - discount;
  const total = subtotal + tax;

  return {
    declaredValue: round2(dv),

    shipping: round2(shipping),
    fuel: round2(fuel),
    handling: round2(handling),
    customs: round2(customs),
    insurance: round2(insurance),

    subtotal: round2(subtotal),
    tax: round2(tax),
    discount: round2(discount),
    total: round2(total),
  };
}

// ✅ Defaults
export const DEFAULT_PRICING: PricingSettings = {
  shippingFee: 120,
  handlingFee: 10,
  customsFee: 25,
  taxFee: 0,
  discountFee: 0,

  fuelRate: 0.1,        // 10% of shipping
  insuranceRate: 0.02,  // 2% of declared value
};