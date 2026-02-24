import { NextResponse } from "next/server";
import { sendBanEmail } from "@/lib/emails";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Optional protection
    const requiredToken = process.env.EMAIL_TEST_TOKEN;
    if (requiredToken) {
      const token = String(url.searchParams.get("token") || "");
      if (token !== requiredToken) return jsonError("Unauthorized", 401);
    }

    const to = String(url.searchParams.get("to") || "").trim().toLowerCase();
    const name = String(url.searchParams.get("name") || "Customer").trim();

    if (!to) return jsonError("Missing 'to' query param (example: ?to=name@email.com)");
    if (!to.includes("@")) return jsonError("Invalid 'to' email address");

    const result = await sendBanEmail(to, { name });

    return NextResponse.json({ ok: true, sentTo: to, name, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}