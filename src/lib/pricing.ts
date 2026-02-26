// src/lib/pricing.ts
export type PricingSettings = {
  shippingRate: number;   // e.g. 0.10  (10% of declared value)
  insuranceRate: number;  // e.g. 0.10  (10% of shipping)
  customsRate: number;    // e.g. 0.20  (20% of shipping)
  fuelRate: number;       // e.g. 0.05  (5% of shipping)
  discountRate: number;   // e.g. 0.00  (0% of shipping) or subtotal (we use shipping)
  taxRate: number;        // e.g. 0.085 (8.5% of subtotal)
};

export type InvoiceBreakdown = {
  declaredValue: number;
  shipping: number;
  insurance: number;
  customs: number;
  fuel: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeInvoiceFromDeclaredValue(
  declaredValue: number,
  s: PricingSettings
): InvoiceBreakdown {
  const dv = Number(declaredValue || 0);
  const shipping = dv * (Number(s.shippingRate) || 0);

  // Others are calculated from SHIPPING (as you requested)
  const insurance = shipping * (Number(s.insuranceRate) || 0);
  const customs = shipping * (Number(s.customsRate) || 0);
  const fuel = shipping * (Number(s.fuelRate) || 0);

  // Discount from shipping (enterprise systems often do this)
  const discount = shipping * (Number(s.discountRate) || 0);

  const subtotal = shipping + insurance + customs + fuel - discount;
  const tax = subtotal * (Number(s.taxRate) || 0);

  const total = subtotal + tax;

  return {
    declaredValue: round2(dv),
    shipping: round2(shipping),
    insurance: round2(insurance),
    customs: round2(customs),
    fuel: round2(fuel),
    discount: round2(discount),
    subtotal: round2(subtotal),
    tax: round2(tax),
    total: round2(total),
  };
}

export const DEFAULT_PRICING: PricingSettings = {
  shippingRate: 0.1,
  insuranceRate: 0.1,
  customsRate: 0.2,
  fuelRate: 0.05,
  discountRate: 0.0,
  taxRate: 0.085,
};