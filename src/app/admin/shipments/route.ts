// src/app/admin/shipments/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Collection } from "mongodb";

async function getTrackingHistoryCollection(): Promise<Collection> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "exodus_logistics";
  return client.db(dbName).collection("tracking_history");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const shipmentId = String(body?.shipmentId || "").trim();

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, error: "Shipment ID is required" },
        { status: 400 }
      );
    }

    const historyCollection = await getTrackingHistoryCollection();
    const history = await historyCollection
      .find({ shipmentId })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json({ success: true, data: history }, { status: 200 });
  } catch (error) {
    console.error("Admin Tracking API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Unable to fetch tracking history. Please try again.",
      },
      { status: 500 }
    );
  }
}