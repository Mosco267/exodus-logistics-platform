import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import { STATE_COORDS } from "@/lib/distances";
import { COUNTRIES_WITH_STATES } from "@/lib/countriesData";

export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Check if any seed has been done. If first-time, seed countries with state coords.
  const existingCount = await db.collection("local_availability").countDocuments();
  const seedFlag = await db.collection("system_flags").findOne({ key: "local_availability_seeded" });

  if (existingCount === 0 && !seedFlag) {
    const codesWithStates = Object.keys(STATE_COORDS);
    const seedDocs = codesWithStates
      .map(code => {
        const country = COUNTRIES_WITH_STATES.find(c => c.code === code);
        if (!country) return null;
        return {
          countryCode: code,
          countryName: country.name,
          enabled: true,
          addedAt: new Date(),
          addedBy: 'system_seed',
        };
      })
      .filter(Boolean);

    if (seedDocs.length > 0) {
      await db.collection("local_availability").insertMany(seedDocs as any);
    }

    await db.collection("system_flags").insertOne({
      key: "local_availability_seeded",
      seededAt: new Date(),
    });
  }

  const list = await db.collection("local_availability")
    .find({})
    .sort({ countryCode: 1 })
    .toArray();

  return NextResponse.json({
    countries: list.map(c => ({
      countryCode: c.countryCode,
      countryName: c.countryName,
      enabled: c.enabled !== false,
      addedAt: c.addedAt || null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { countryCode, countryName, enabled } = await req.json();
  if (!countryCode || !countryName)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  await db.collection("local_availability").updateOne(
    { countryCode: countryCode.toUpperCase() },
    {
      $set: {
        countryCode: countryCode.toUpperCase(),
        countryName,
        enabled: enabled !== false,
        updatedAt: new Date(),
        updatedBy: (session?.user as any)?.email || 'admin',
      },
      $setOnInsert: { addedAt: new Date() },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { countryCode } = await req.json();
  if (!countryCode)
    return NextResponse.json({ error: "Missing countryCode" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  await db.collection("local_availability").deleteOne({ countryCode: countryCode.toUpperCase() });

  return NextResponse.json({ ok: true });
}