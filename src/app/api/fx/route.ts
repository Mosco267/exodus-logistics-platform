// src/app/api/fx/route.ts
import { NextResponse } from 'next/server';
import { getRates } from '@/lib/fx';
 
/* Public read of exchange rates, for pages that compute client-side
   (e.g. the new-shipment invoice preview). Rates are not sensitive —
   unlike pricing settings, which must stay server-side. */
export async function GET() {
  try {
    const rates = await getRates();
    return NextResponse.json({ ok: true, rates });
  } catch {
    return NextResponse.json({ ok: true, rates: { USD: 1 } });
  }
}