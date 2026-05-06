import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import clientPromise from '@/lib/mongodb';
import { sendInvoiceUpdateEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const shipmentId = intent.metadata?.shipmentId;
    if (!shipmentId) return NextResponse.json({ ok: true });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const shipment = await db.collection('shipments').findOne({ shipmentId });
    if (!shipment) return NextResponse.json({ ok: true });

    await db.collection('shipments').updateOne(
      { shipmentId },
      {
        $set: {
          'invoice.paid': true,
          'invoice.status': 'paid',
          'invoice.paidAt': new Date(),
          'invoice.paymentMethod': 'card',
          'invoice.stripeIntentId': intent.id,
        },
      }
    );

    // Send confirmation email
    try {
      const senderEmail = shipment.senderEmail;
      if (senderEmail) {
        await sendInvoiceUpdateEmail(senderEmail, {
          name: shipment.senderName,
          shipmentId,
          status: 'paid',
          paid: true,
          trackingNumber: shipment.trackingNumber,
          invoiceNumber: shipment.invoice?.invoiceNumber,
          recipientRole: 'sender',
          otherPartyName: shipment.receiverName,
        });
      }
    } catch (e) {
      console.error('Email send failed:', e);
    }
  }

  return NextResponse.json({ ok: true });
}