// src/app/api/support/meta/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Returns public-safe support metadata for the user UI.
 * Currently: the support email address for the mailto link.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    supportEmail: process.env.SUPPORT_ADMIN_EMAIL || "",
  });
}