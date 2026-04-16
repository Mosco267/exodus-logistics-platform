// src/lib/sendWelcomeEmail.ts

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

export async function sendWelcomeEmail(name: string, email: string) {
  const bodyHtml = `
    <p style="margin:0 0 16px 0;font-size:18px;line-height:28px;color:#111827;">
      Congratulations, <strong style="color:#111827;">${name}</strong>!
    </p>
    <p style="margin:0 0 20px 0;font-size:18px;line-height:28px;color:#111827;">
      Your Exodus Logistics account is now fully activated. Welcome to a smarter
      way to manage shipments, invoices, and global logistics — all in one place.
    </p>

    <!-- Getting started card -->
    <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #1d4ed8;">
      <p style="margin:0 0 12px 0;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;">Getting started is easy:</p>
      <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">&#x1F4E6;&nbsp; Create your first shipment and track it in real time</p>
      <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">&#x1F4CB;&nbsp; View and manage invoices from your dashboard</p>
      <p style="margin:0 0 8px 0;font-size:15px;color:#374151;">&#x1F514;&nbsp; Set your notification preferences to stay updated</p>
      <p style="margin:0;font-size:15px;color:#374151;">&#x1F310;&nbsp; Ship to 120+ countries through our global network</p>
    </div>

    <p style="margin:0 0 20px 0;font-size:16px;line-height:26px;color:#374151;">
      Your dashboard is ready and waiting. Click the button below to get started.
    </p>
  `;

  const html = renderEmailTemplate({
    subject: "Welcome to Exodus Logistics — Your account is ready!",
    title: `Welcome aboard, ${name}!`,
    preheader: `Your Exodus Logistics account is now active. Let's get started.`,
    bodyHtml,
    button: {
      text: "Go to My Dashboard",
      href: `${APP_URL}/en/dashboard`,
    },
    appUrl: APP_URL,
    supportEmail: SUPPORT_EMAIL,
    sentTo: email,
  });

  await resend.emails.send({
    from: RESEND_FROM,
    replyTo: SUPPORT_EMAIL,
    to: email,
    subject: "Welcome to Exodus Logistics — Your account is ready!",
    html,
  });
}