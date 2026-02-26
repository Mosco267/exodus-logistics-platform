import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const normalize = (s: string) => (s || "").toLowerCase().trim().replace(/[\s_-]+/g, "");

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ciExact(field: string, value: string) {
  return { [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" } };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const q = String(body?.trackingNumber || body?.q || "").trim();

    if (!q) {
      return NextResponse.json({ error: "Tracking number or shipmentId is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Find by trackingNumber OR shipmentId (case-insensitive exact)
    const shipment = await db.collection("shipments").findOne(
      { $or: [ciExact("trackingNumber", q), ciExact("shipmentId", q)] },
      { projection: { _id: 0 } }
    );

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const statuses = await db
      .collection("statuses")
      .find({})
      .project({ _id: 0, key: 1, label: 1, defaultUpdate: 1, nextStep: 1 })
      .toArray();

    // Prefer a stable order if you ever add "order" later; for now label sort
    const ordered = [...statuses].sort((a: any, b: any) =>
      String(a?.label || "").localeCompare(String(b?.label || ""))
    );

    const currentStatusLabel = String((shipment as any)?.status || "").trim();
    const currentStatusKey = normalize(currentStatusLabel);

    // Build steps from statuses list
    const steps = ordered.map((st: any) => ({
      name: String(st?.label || st?.key || "Update"),
      details: [
        st?.defaultUpdate ? String(st.defaultUpdate) : "",
        st?.nextStep ? `Next step: ${String(st.nextStep)}` : "",
      ].filter(Boolean),
    }));

    // Determine currentStep by matching current shipment status to status.label OR status.key
    let currentStep = steps.findIndex((s: any) => normalize(s.name) === currentStatusKey);
    if (currentStep < 0) {
      // If status not found in statuses table, append it
      steps.push({
        name: currentStatusLabel || "Shipment Update",
        details: [
          String((shipment as any)?.statusNote || "").trim(),
          (shipment as any)?.nextStep ? `Next step: ${String((shipment as any).nextStep)}` : "",
        ].filter(Boolean),
      });
      currentStep = steps.length - 1;
    }

    // “Estimated delivery” (simple placeholder for now — you can improve later)
    const estimatedDelivery =
      (shipment as any)?.estimatedDelivery ||
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toDateString();

    return NextResponse.json({
      shipmentId: (shipment as any)?.shipmentId || "",
      trackingNumber: (shipment as any)?.trackingNumber || "",
      currentStatus: currentStatusLabel,
      statusNote: (shipment as any)?.statusNote || "",
      nextStep: (shipment as any)?.nextStep || "",
      steps,
      currentStep,
      estimatedDelivery,
      updatedAt: (shipment as any)?.updatedAt || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}