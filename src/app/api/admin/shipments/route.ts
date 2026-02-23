// src/app/api/admin/shipments/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Collection } from "mongodb";

async function getShipmentsCollection(): Promise<Collection> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "exodus_logistics";
  return client.db(dbName).collection("shipments");
}

async function getTrackingHistoryCollection(): Promise<Collection> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "exodus_logistics";
  return client.db(dbName).collection("tracking_history");
}

// ✅ Sample shipments (VALID JS objects)
const sampleShipments = [
  {
    id: "shp_1",
    trackingCode: "EX-2024-US-1234567",
    carrier: "fedex",
    carrierTrackingId: "FDX123456789",
    status: "delivered",
    origin: {
      city: "Los Angeles",
      state: "CA",
      zipCode: "90001",
      country: "USA",
    },
    destination: {
      city: "New York",
      state: "NY",
      zipCode: "10001",
      country: "USA",
    },
    recipient: {
      name: "John Anderson",
      email: "john.anderson@email.com",
      phone: "+1 (555) 987-6543",
    },
    sender: {
      name: "TechCorp Solutions",
      email: "shipping@techcorp.com",
      phone: "+1 (555) 123-4567",
    },
    package: {
      weight: 25.5,
      dimensions: { length: 24, width: 18, height: 12 },
      description: "Electronics equipment",
      value: 1500,
      currency: "USD",
    },
    estimatedDelivery: new Date("2024-02-14"),
    actualDelivery: null,
    createdAt: new Date("2024-02-11"),
    updatedAt: new Date("2024-02-11"),
  },
];

// ✅ Sample tracking history
const sampleHistory = [
  {
    shipmentId: "shp_1",
    status: "picked_up",
    location: "Los Angeles, CA",
    description: "Package picked up from sender",
    timestamp: new Date("2024-02-11T14:00:00Z"),
  },
  {
    shipmentId: "shp_1",
    status: "in_transit",
    location: "Phoenix, AZ",
    description: "Package in transit",
    timestamp: new Date("2024-02-11T18:30:00Z"),
  },
  {
    shipmentId: "shp_1",
    status: "in_transit",
    location: "Chicago, IL",
    description: "Package arrived at sorting facility",
    timestamp: new Date("2024-02-12T06:15:00Z"),
  },
  {
    shipmentId: "shp_1",
    status: "delivered",
    location: "New York, NY",
    description: "Package delivered to recipient",
    timestamp: new Date("2024-02-14T12:05:00Z"),
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing action" },
        { status: 400 }
      );
    }

    if (action === "seed-shipments") {
      const shipmentsCollection = await getShipmentsCollection();
      const historyCollection = await getTrackingHistoryCollection();

      await shipmentsCollection.deleteMany({});
      await historyCollection.deleteMany({});

      const shipRes = await shipmentsCollection.insertMany(sampleShipments as any);
      const histRes = await historyCollection.insertMany(sampleHistory as any);

      return NextResponse.json(
        {
          success: true,
          message: "Shipments and tracking history seeded successfully",
          shipmentsInserted: shipRes.insertedCount,
          historyInserted: histRes.insertedCount,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Admin Shipments API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Unable to complete request.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const shipmentsCollection = await getShipmentsCollection();
    const shipments = await shipmentsCollection.find({}).limit(200).toArray();

    return NextResponse.json({ success: true, data: shipments }, { status: 200 });
  } catch (error) {
    console.error("Admin Shipments GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}