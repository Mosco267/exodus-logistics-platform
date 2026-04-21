// src/app/api/admin/payment-messages/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;

export async function GET() {
  const session = await auth();
  const role = String((session as any)?.user?.role || '').toUpperCase();
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const messages = await db.collection('payment_messages')
    .find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return NextResponse.json({ messages: messages.map(m => ({ ...m, _id: String(m._id) })) });
}

export async function POST(req: Request) {
  // User submits "Others" payment request
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { shipmentId, paymentMethod, message } = await req.json();
  if (!shipmentId || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const msgDoc = {
    shipmentId,
    userId: String((session.user as any).id || ''),
    userEmail: session.user.email || '',
    userName: session.user.name || '',
    paymentMethod: paymentMethod || 'Other',
    message,
    status: 'pending',
    createdAt: new Date(),
  };

  const result = await db.collection('payment_messages').insertOne(msgDoc);

  // Notify admin via notification
  await db.collection('notifications').insertOne({
    userEmail: SUPPORT_EMAIL,
    title: 'New Payment Request',
    message: `${session.user.name || 'A user'} wants to pay for shipment ${shipmentId} via ${paymentMethod || 'Other method'}.`,
    shipmentId, read: false, createdAt: new Date(),
  });

  // Email admin
  try {
    await resend.emails.send({
      from: RESEND_FROM, to: SUPPORT_EMAIL,
      subject: `New payment request — ${shipmentId}`,
      html: `<p><strong>${session.user.name}</strong> (${session.user.email}) wants to pay for shipment <strong>${shipmentId}</strong> via <strong>${paymentMethod}</strong>.</p><p>Message: ${message}</p><p><a href="${APP_URL}/en/dashboard/admin/payment-settings">View in admin</a></p>`,
    });
  } catch {}

  return NextResponse.json({ ok: true, id: String(result.insertedId) });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const role = String((session as any)?.user?.role || '').toUpperCase();

  const { id, action, adminDetails, shipmentId, userEmail, paymentMethod } = await req.json();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  if (action === 'upload_receipt') {
    // User uploads receipt — no admin auth needed
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { receiptUrl } = await req.json();
    await db.collection('payment_messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { receiptUrl, status: 'receipt_uploaded', updatedAt: new Date() } }
    );
    // Update shipment invoice status to pending_payment
    await db.collection('shipments').updateOne(
      { shipmentId },
      { $set: { 'invoice.status': 'unpaid', 'invoice.paymentPending': true, updatedAt: new Date() } }
    );
    // Notify admin
    await db.collection('notifications').insertOne({
      userEmail: SUPPORT_EMAIL,
      title: 'Receipt Uploaded',
      message: `Receipt uploaded for shipment ${shipmentId}. Awaiting your confirmation.`,
      shipmentId, read: false, createdAt: new Date(),
    });
    return NextResponse.json({ ok: true });
  }

  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (action === 'send_details') {
    await db.collection('payment_messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { adminDetails, status: 'details_sent', updatedAt: new Date() } }
    );
    // Email user with payment details
    try {
      await resend.emails.send({
        from: RESEND_FROM, to: userEmail,
        subject: `Payment details for your shipment — ${shipmentId}`,
        html: `<p>Here are the payment details for your shipment <strong>${shipmentId}</strong>:</p><p style="background:#f0f4ff;padding:16px;border-radius:8px;">${adminDetails}</p><p>Once you have made the payment, please upload your receipt in the payment page.</p><p><a href="${APP_URL}/en/dashboard/shipments/${shipmentId}/payment">Go to payment page</a></p>`,
      });
    } catch {}
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm_payment') {
    await db.collection('payment_messages').updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'confirmed', updatedAt: new Date() } }
    );
    // Update shipment invoice to paid
    await db.collection('shipments').updateOne(
      { shipmentId },
      { $set: { 'invoice.status': 'paid', 'invoice.paid': true, 'invoice.paymentPending': false, 'invoice.paymentMethod': paymentMethod, 'invoice.paidAt': new Date(), updatedAt: new Date() } }
    );
    // Notify user
    const msgDoc = await db.collection('payment_messages').findOne({ _id: new ObjectId(id) });
    if (msgDoc) {
      await db.collection('notifications').insertOne({
        userEmail: msgDoc.userEmail,
        userId: msgDoc.userId,
        title: 'Payment Confirmed',
        message: `Your payment for shipment ${shipmentId} has been confirmed. Your invoice is now marked as paid.`,
        shipmentId, read: false, createdAt: new Date(),
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}