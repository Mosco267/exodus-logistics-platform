import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const COLLECTION = "placeholder_content";

export const DEFAULT_PLACEHOLDER_CONTENT: Record<string, string> = {
  invoiceMessage_paid: "Payment for this invoice has been confirmed successfully in our system.",
  invoiceMessage_unpaid: "This invoice is currently unpaid and payment is still required.",
  invoiceMessage_overdue: "This invoice is now overdue and requires prompt attention.",
  invoiceMessage_cancelled: "This invoice has been cancelled in our system.",
  actionMessage_paid: "No further payment action is required at this time. Shipment processing may continue normally, and you may keep this invoice for your billing records and future reference.",
  actionMessage_unpaid: "Please review the invoice details carefully and complete payment as soon as possible so shipment processing can continue without unnecessary interruption.",
  actionMessage_overdue: "To avoid continued shipment delay, processing hold, or additional administrative follow-up, payment should be completed as soon as possible. We recommend reviewing the invoice immediately and settling the outstanding amount without delay.",
  actionMessage_cancelled: "No payment should be made against this invoice unless our support team has specifically instructed otherwise. If this update was not expected, please contact support for clarification.",
  paymentMessage_paid: "Payment has been confirmed successfully. Your shipment is now ready to move through the next logistics stage, and you will continue to receive progress updates as new checkpoints are reached.",
  paymentMessage_unpaid: "Payment is still required before shipment processing can continue. Once payment is completed, the shipment will move to the next stage and you will receive further updates automatically.",
  paymentMessage_overdue: "This invoice is currently overdue. Please complete payment as soon as possible to avoid delay in shipment processing and movement to the next logistics stage.",
  paymentMessage_cancelled: "This invoice has been cancelled. Shipment processing cannot continue under the current invoice status. Please contact support if you believe this was done in error.",
  closingText_invoice: "You can view the invoice directly using the button below.",
  closingText_shipment: "You can use the button below to open the shipment page for tracking updates. You can also use the invoice link below to review billing details.",
  closingText_tracking: "You can use the button below to open the shipment page for the latest tracking updates. You can also use the invoice link below to review billing information when needed.",
  closingText_edited: "You can use the button below to open the shipment page and review the latest details. You can also use the invoice link below if billing verification is needed.",
  timeline_pickup_intro: "We are pleased to inform you that your shipment has been successfully picked up and entered into our logistics network.",
  timeline_pickup_detail: "The shipment is now being processed for movement from the origin facility toward the destination.",
  timeline_pickup_extra: "Our team will continue processing the shipment and you will receive another update once it reaches the next checkpoint.",
  timeline_warehouse_intro: "Your shipment has been received at our warehouse facility.",
  timeline_warehouse_detail: "It is currently undergoing internal handling and preparation before moving to the next shipping stage.",
  timeline_warehouse_extra: "You will be notified again as soon as the shipment leaves the warehouse and proceeds to transit.",
  timeline_intransit_intro: "Your shipment is now in transit.",
  timeline_intransit_detail: "It is currently moving through our logistics network toward the destination.",
  timeline_intransit_extra: "Our system will continue to provide updates as the shipment progresses through the next checkpoints.",
  timeline_outfordelivery_intro: "Your shipment is now out for delivery.",
  timeline_outfordelivery_detail: "Our delivery process is in progress and the shipment is on its final route to the delivery address.",
  timeline_outfordelivery_extra: "Please make sure you are available and prepared to receive or pick up the shipment once delivery is completed.",
  timeline_delivered_intro: "This is to confirm that your shipment has been successfully delivered.",
  timeline_delivered_detail: "Delivery has been completed at the destination address.",
  timeline_delivered_extra: "If you have any concern regarding the delivery or need clarification, please contact our support team with your shipment details.",
  timeline_customclearance_intro: "Your shipment is currently undergoing customs clearance.",
  timeline_customclearance_detail: "This is a routine compliance stage before the shipment proceeds toward the destination.",
  timeline_customclearance_extra: "If any additional verification is required, our team will contact you promptly and provide further guidance.",
  timeline_cancelled_intro: "Your shipment has been marked as cancelled.",
  timeline_cancelled_detail: "This shipment is no longer progressing through our logistics network.",
  timeline_cancelled_extra: "If you believe this update was made in error or require clarification, please contact our support team for assistance.",
  timeline_unclaimed_intro: "Your shipment is currently marked as unclaimed.",
  timeline_unclaimed_detail: "The shipment is being held pending the next required action from the recipient or support team.",
  timeline_unclaimed_extra: "Please contact our support team as soon as possible for assistance regarding pickup, redelivery, or further instructions.",
  timeline_invalidaddress_intro: "Your shipment is currently on hold due to an address issue.",
  timeline_invalidaddress_detail: "We were unable to proceed normally because the destination address requires confirmation or correction.",
  timeline_invalidaddress_extra: "Please contact support to verify the correct delivery details so shipment processing can continue without further delay.",
  timeline_paymentissue_intro: "Your shipment has been updated to Payment Issue.",
  timeline_paymentissue_detail: "There is currently an issue affecting payment confirmation or processing for this shipment.",
  timeline_paymentissue_extra: "Please review the invoice and complete any required payment so shipment processing can resume normally.",
};

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const doc = await db.collection(COLLECTION).findOne({ _id: "main" as any });

    const content = {
      ...DEFAULT_PLACEHOLDER_CONTENT,
      ...(doc?.content || {}),
    };

    return NextResponse.json({ content });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load placeholder content." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updates = body?.content || {};

    if (typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid content." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection(COLLECTION).updateOne(
      { _id: "main" as any },
      {
        $set: {
          content: updates,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save placeholder content." }, { status: 500 });
  }
}