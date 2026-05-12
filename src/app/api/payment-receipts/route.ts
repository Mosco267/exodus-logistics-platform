import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shipmentId, paymentMethod, receiptUrl, notes } = await req.json();
  if (!shipmentId || !paymentMethod || !receiptUrl)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const result = await db.collection('payment_receipts').insertOne({
    shipmentId,
    paymentMethod,
    receiptUrl,
    notes: notes || '',
    submittedBy: session.user.email,
    submittedByName: (session.user as any).name || '',
    submittedAt: new Date(),
    status: 'pending',
    confirmedAt: null,
    confirmedBy: null,
    rejectedReason: null,
  });

  await db.collection('shipments').updateOne(
    { shipmentId },
    {
      $set: {
        'invoice.paymentMethod': paymentMethod,
        'invoice.paymentStatus': 'under_review',
        'invoice.receiptId': result.insertedId.toString(),
      },
    }
  );

  return NextResponse.json({ ok: true, id: result.insertedId });
}

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const receipts = await db.collection('payment_receipts')
    .find({})
    .sort({ submittedAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({
    receipts: receipts.map(r => ({ ...r, _id: r._id.toString() })),
  });
}

// Capitalize first letter of each word
function capWords(s: string): string {
  if (!s) return '';
  return s.toLowerCase().split(/(\s+)/).map(p => /\s+/.test(p) ? p : (p.charAt(0).toUpperCase() + p.slice(1))).join('');
}

export async function PATCH(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, action, rejectedReason } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const receipt = await db.collection('payment_receipts').findOne({ _id: new ObjectId(id) });
  if (!receipt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch the shipment so we can re-use its current location for the new event
  const shipment = await db.collection('shipments').findOne({ shipmentId: receipt.shipmentId });

  // Build a default "location" from the latest event (fallback to sender) so the
  // new payment event aligns visually with the existing timeline rail.
  let eventLocation: any = {
    country: shipment?.senderCountry || '',
    state: shipment?.senderState || '',
    city: shipment?.senderCity || '',
    county: '',
  };
  if (Array.isArray(shipment?.trackingEvents) && shipment.trackingEvents.length > 0) {
    const lastEvent = shipment.trackingEvents[shipment.trackingEvents.length - 1];
    if (lastEvent?.location && (lastEvent.location.country || lastEvent.location.city)) {
      eventLocation = { ...lastEvent.location };
    }
  }

  const prettyMethod = capWords(String(receipt.paymentMethod || ''));

  if (action === 'confirm') {
    await db.collection('payment_receipts').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: (session?.user as any)?.email,
        },
      }
    );

    // New tracking event for the confirmed payment.
    // This is the "Payment Confirmed" sub-event under the Created stage with a
    // green badge. We keep it grouped under the "created" key so it shows up
    // as another entry inside the existing Created card on the timeline.
    const confirmEvent = {
      key: 'created',
      label: 'Created',
      details: `Your payment of ${shipment?.invoice?.currency || 'USD'} ${(Number(shipment?.invoice?.amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been confirmed${prettyMethod ? ` (paid via ${prettyMethod})` : ''}. Your shipment is now being prepared for dispatch.`,
      note: '',
      additionalNote: '',
      occurredAt: new Date().toISOString(),
      color: '#22c55e',
      detailColor: '#22c55e',
      badgeText: 'Paid',
      badgeColor: '#22c55e',
      badgeLocked: true,
      currentLocation: '',
      location: eventLocation,
    };

    await db.collection('shipments').updateOne(
      { shipmentId: receipt.shipmentId },
      {
        $set: {
          'invoice.paid': true,
          'invoice.status': 'paid',
          'invoice.paidAt': new Date(),
          'invoice.paymentStatus': 'confirmed',
          updatedAt: new Date(),
        },
        $push: { trackingEvents: confirmEvent as any },
      }
    );

    // Send paid email to sender (existing behavior)
    try {
      const { sendInvoiceUpdateEmail } = await import('@/lib/email');
      if (shipment?.senderEmail) {
        await sendInvoiceUpdateEmail(shipment.senderEmail, {
          name: shipment.senderName,
          shipmentId: receipt.shipmentId,
          status: 'paid',
          paid: true,
          trackingNumber: shipment.trackingNumber,
          invoiceNumber: shipment.invoice?.invoiceNumber,
          recipientRole: 'sender',
          otherPartyName: shipment.receiverName,
        });
      }
    } catch (e) {
      console.error('Confirm email failed:', e);
    }
  } else if (action === 'reject') {
    const reason = String(rejectedReason || '').trim();

    await db.collection('payment_receipts').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: (session?.user as any)?.email,
          rejectedReason: reason || null,
        },
      }
    );

    // Add a tracking event for the rejection
    const rejectEvent = {
      key: 'created',
      label: 'Created',
      details: `Your payment${prettyMethod ? ` via ${prettyMethod}` : ''} was cancelled and could not be confirmed by our team.${reason ? ` Reason: ${reason}` : ''} Please return to the payment page and submit payment again.`,
      note: '',
      additionalNote: '',
      occurredAt: new Date().toISOString(),
      color: '#ef4444',
      detailColor: '#ef4444',
      badgeText: 'Payment Cancelled',
      badgeColor: '#ef4444',
      badgeLocked: true,
      currentLocation: '',
      location: eventLocation,
    };

    await db.collection('shipments').updateOne(
      { shipmentId: receipt.shipmentId },
      {
        $set: {
          'invoice.paymentStatus': 'rejected',
          'invoice.paid': false,
          updatedAt: new Date(),
        },
        $unset: { 'invoice.paymentMethod': '' },
        $push: { trackingEvents: rejectEvent as any },
      }
    );

    // Cancellation email + dashboard notification (existing behavior)
    try {
      if (shipment?.senderEmail) {
        const { sendPaymentCancelledEmail } = await import('@/lib/email');
        await sendPaymentCancelledEmail(shipment.senderEmail, {
          name: shipment.senderName,
          shipmentId: receipt.shipmentId,
          trackingNumber: shipment.trackingNumber,
          invoiceNumber: shipment.invoice?.invoiceNumber,
          paymentMethod: receipt.paymentMethod,
          reason,
        });

        await db.collection('notifications').insertOne({
          userEmail: String(shipment.senderEmail).toLowerCase(),
          userId: shipment.createdByUserId || undefined,
          title: 'Payment Cancelled',
          message: `Your payment for shipment ${receipt.shipmentId} was cancelled${reason ? ': ' + reason : '.'}`,
          shipmentId: receipt.shipmentId,
          read: false,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.error('Cancellation email failed:', e);
    }
  }

  return NextResponse.json({ ok: true });
}