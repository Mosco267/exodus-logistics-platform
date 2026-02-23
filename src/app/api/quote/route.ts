import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    // ADMIN CONFIG: Set to true when your admin panel has set the quote values
    const adminDataAvailable = false;

    if (!adminDataAvailable) {
      return NextResponse.json(
        { message: 'Quote unavailable at this moment. Please try again later or contact support.' },
        { status: 503 }
      );
    }

    // Mock calculation
    const shipping = 50 + Math.random() * 50;
    const insurance = 10 + Math.random() * 10;
    const fuel = 5 + Math.random() * 5;
    const subtotal = shipping + insurance + fuel;
    const discount = Math.random() * 5;
    const tax = subtotal * 0.08;
    const total = subtotal - discount + tax;

    const result = {
      quoteNumber: `Q-${Date.now().toString(36).slice(-8).toUpperCase()}`,
      serviceType: data.packageType || 'standard',
      charges: { shipping, insurance, fuel, subtotal, discount, tax, total },
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: 'Unable to calculate quote. Please try again.' },
      { status: 500 }
    );
  }
}