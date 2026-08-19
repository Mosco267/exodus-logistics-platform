// src/app/api/auth-availability/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/* Public, read-only. The header and auth pages check this to decide
   whether to show sign-in and sign-up. Enforcement itself lives in
   middleware — hiding a button does not stop anyone typing the URL. */

/* No caching. This gates account creation, so a change from admin should
   take effect on the next page load rather than after a revalidate window. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const dbName = process.env.MONGODB_DB;
    if (!dbName) {
      return NextResponse.json({ ok: true, signInDisabled: false, signUpDisabled: false, message: "" });
    }

    const client = await clientPromise;
    const db = client.db(dbName);
    const doc: any = await db
      .collection("app_settings")
      .findOne({ _id: "auth" as any });

    return NextResponse.json({
      ok: true,
      signInDisabled: Boolean(doc?.signInDisabled),
      signUpDisabled: Boolean(doc?.signUpDisabled),
      message: String(doc?.message || ""),
    });
  } catch {
    /* Fail open. A database hiccup should not lock customers out of
       an account they already have. */
    return NextResponse.json({ ok: true, signInDisabled: false, signUpDisabled: false, message: "" });
  }
}