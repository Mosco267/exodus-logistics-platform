import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shipmentId } = await req.json();
  if (!shipmentId) return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const shipment = await db.collection('shipments').findOne({ shipmentId });
  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

  const invoice = shipment.invoice || {};
  const amount = Number(invoice.amount || 0);
  const currency = String(invoice.currency || 'USD').toLowerCase();

  if (amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  if (invoice.paid) return NextResponse.json({ error: 'Already paid' }, { status: 400 });

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency,
      metadata: {
        shipmentId,
        trackingNumber: shipment.trackingNumber || '',
        invoiceNumber: invoice.invoiceNumber || '',
        userEmail: session.user.email || '',
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      intentId: intent.id,
    });
  } catch (err: any) {
    console.error('Stripe error:', err);
    return NextResponse.json({ error: err.message || 'Stripe error' }, { status: 500 });
  }
}