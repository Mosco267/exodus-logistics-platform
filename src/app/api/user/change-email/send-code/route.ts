// src/app/api/user/change-email/send-code/route.ts

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { auth } from "@/auth";
import crypto from "crypto";
import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.goexoduslogistics.com"
).replace(/\/$/, "");

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM =
  process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newEmail } = await req.json();
  if (!newEmail || !/^\S+@\S+\.\S+$/.test(newEmail))
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

  const normalizedNew = newEmail.toLowerCase().trim();
  const currentEmail = (session.user.email || "").toLowerCase();

  if (normalizedNew === currentEmail)
    return NextResponse.json(
      { error: "This is already your current email" },
      { status: 400 }
    );

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const existing = await db.collection("users").findOne({ email: normalizedNew });
  if (existing)
    return NextResponse.json(
      { error: "This email is already in use" },
      { status: 409 }
    );

  // Generate 6-digit code
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);

  await db.collection("users").updateOne(
    { email: currentEmail },
    {
      $set: {
        emailChangeCode: code,
        emailChangeExpiry: expiry,
        emailChangePending: normalizedNew,
      },
    }
  );

  // Build the 6 code boxes
  const codeBoxes = code.split("").map(digit => `
    <td style="padding:0 4px;">
      <div style="
        width:44px;
        height:52px;
        background:#f8fafc;
        border:2px solid #e2e8f0;
        border-radius:12px;
        text-align:center;
        line-height:52px;
        font-size:26px;
        font-weight:900;
        color:#0b3aa4;
        font-family:monospace;
        letter-spacing:0;
      ">${digit}</div>
    </td>
  `).join("");

  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
      Hello,
    </p>

    <p style="margin:0 0 14px 0;font-size:16px;line-height:26px;color:#111827;">
      You requested to change your Exodus Logistics account email to
      <strong>${normalizedNew}</strong>.
    </p>

    <p style="margin:0 0 20px 0;font-size:15px;line-height:24px;color:#374151;">
      Enter the verification code below in the app to confirm the change.
      This code expires in <strong>10 minutes</strong>.
    </p>

    <!-- Code boxes -->
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px auto;">
      <tr>
        ${codeBoxes}
      </tr>
    </table>

    <p style="margin:0 0 14px 0;font-size:13px;line-height:20px;color:#6b7280;text-align:center;">
      If you did not request this change, you can safely ignore this email.
      Your account remains secure.
    </p>
  `;

  const html = renderEmailTemplate({
    subject: "Verify your new email address",
    title: "Email Verification Code",
    preheader: `Your Exodus Logistics verification code is ${code}`,
    bodyHtml,
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: normalizedNew,
  });

  await resend.emails.send({
    from: RESEND_FROM,
    to: normalizedNew,
    subject: "Verify your new email address",
    html,
    replyTo: SUPPORT_EMAIL,
  });

  return NextResponse.json({ ok: true });
}