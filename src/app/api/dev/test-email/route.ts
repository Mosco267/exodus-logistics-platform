import { NextResponse } from "next/server";
import { sendBanEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Default to your Resend account email (testing limitation)
    const to =
      String(url.searchParams.get("to") || "gabrielmoses856@gmail.com")
        .toLowerCase()
        .trim();

    const name = String(url.searchParams.get("name") || "Gabriel");

    const result = await sendBanEmail(to, { to, name });

    return NextResponse.json({ ok: true, sentTo: to, name, result });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
        raw: String(err),
      },
      { status: 500 }
    );
  }
}