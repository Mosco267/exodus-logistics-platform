import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const sessionEmail = (session.user.email || '').toLowerCase();
const sessionId = (session.user as any).id || '';

const user = await db.collection("users").findOne(
  sessionId
    ? { $or: [{ email: sessionEmail }, { _id: new (require('mongodb').ObjectId)(sessionId) }] }
    : { email: sessionEmail },
    { projection: { _id: 0, name: 1, email: 1, phone: 1, country: 1, phoneDialCode: 1, address: 1, addressStreet: 1, addressCity: 1, addressState: 1, addressPostalCode: 1, avatarUrl: 1, createdAt: 1, provider: 1 } }
  );

  return NextResponse.json(user || {});
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, phone, address, country, phoneDialCode,
    addressStreet, addressCity, addressState, addressPostalCode,
  } = body;

  // If `name` is provided, validate it. If not provided, leave existing name alone.
  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const sessionEmail = (session.user.email || '').toLowerCase();
  const sessionId = (session.user as any).id || '';
  const { ObjectId } = require('mongodb');

  const filter = sessionId
    ? { $or: [{ email: sessionEmail }, { _id: new ObjectId(sessionId) }] }
    : { email: sessionEmail };

  // Build $set with only fields that were actually provided
  const updates: Record<string, any> = {};

  if (name !== undefined) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone?.trim() || '';
  if (country !== undefined) updates.country = country?.trim() || '';
  if (phoneDialCode !== undefined) updates.phoneDialCode = phoneDialCode?.trim() || '';

  // Address fields — update if any address-related field was provided
  const hasAddressUpdate =
    addressStreet !== undefined ||
    addressCity !== undefined ||
    addressState !== undefined ||
    addressPostalCode !== undefined ||
    address !== undefined;

  if (hasAddressUpdate) {
    if (addressStreet !== undefined) updates.addressStreet = addressStreet?.trim() || '';
    if (addressCity !== undefined) updates.addressCity = addressCity?.trim() || '';
    if (addressState !== undefined) updates.addressState = addressState?.trim() || '';
    if (addressPostalCode !== undefined) updates.addressPostalCode = addressPostalCode?.trim() || '';

    // Auto-build composite address string from updated fields
    const composite = [
      addressStreet ?? body.addressStreet,
      addressCity ?? body.addressCity,
      addressState ?? body.addressState,
      addressPostalCode ?? body.addressPostalCode,
      country ?? body.country,
    ].filter(Boolean).map((s: string) => s.trim()).join(', ');

    updates.address = address?.trim() || composite || '';
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, message: 'No updates' });
  }

  await db.collection("users").updateOne(filter, { $set: updates });

  return NextResponse.json({ ok: true, updated: Object.keys(updates) });
}