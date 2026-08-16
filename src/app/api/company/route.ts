// src/app/api/company/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/* Public, read-only view of company settings.
   Deliberately whitelists fields rather than returning the document, so
   anything added in admin later is not exposed by accident. Editing lives
   at /api/admin/company-settings and requires an admin session. */

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const dbName = process.env.MONGODB_DB;
    if (!dbName) return NextResponse.json({ ok: true, company: {} });

    const client = await clientPromise;
    const db = client.db(dbName);
    const doc: any = await db
      .collection("company_settings")
      .findOne({ _id: "default" as any });

    return NextResponse.json({
      ok: true,
      company: {
        name: doc?.name || "",
        address: doc?.address || "",
        phone: doc?.phone || "",
        email: doc?.email || "",
        registrationNumber: doc?.registrationNumber || "",
        country: doc?.country || "",
        timezone: doc?.timezone || "",
      },
    });
  } catch {
    return NextResponse.json({ ok: true, company: {} });
  }
}