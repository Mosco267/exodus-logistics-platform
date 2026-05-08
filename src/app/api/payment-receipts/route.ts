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

    await db.collection('shipments').updateOne(
      { shipmentId: receipt.shipmentId },
      {
        $set: {
          'invoice.paid': true,
          'invoice.status': 'paid',
          'invoice.paidAt': new Date(),
          'invoice.paymentStatus': 'confirmed',
        },
      }
    );

    // Send "invoice paid" email to sender (existing behavior)
    try {
      const { sendInvoiceUpdateEmail } = await import('@/lib/email');
      const shipment = await db.collection('shipments').findOne({ shipmentId: receipt.shipmentId });
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

    await db.collection('shipments').updateOne(
      { shipmentId: receipt.shipmentId },
      {
        $set: {
          'invoice.paymentStatus': 'rejected',
          // Clear the under-review payment method so the user can pick again
          'invoice.paid': false,
        },
      }
    );

    // Send cancellation email to the SENDER only
    try {
      const shipment = await db.collection('shipments').findOne({ shipmentId: receipt.shipmentId });
      if (shipment?.senderEmail) {
        const { sendPaymentCancelledEmail } = await import('@/lib/email');
        await sendPaymentCancelledEmail(shipment.senderEmail, {
          name: shipment.senderName,
          shipmentId: receipt.shipmentId,
          trackingNumber: shipment.trackingNumber,
          invoiceNumber: shipment.invoice?.invoiceNumber,
          paymentMethod: receipt.paymentMethod,
          reason, // empty string -> reason block omitted in email
        });

        // Dashboard notification too
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