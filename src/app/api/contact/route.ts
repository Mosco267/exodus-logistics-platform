// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Resend } from "resend";
import { renderEmailTemplate } from "@/lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.goexoduslogistics.com").replace(/\/$/, "");

/* Subjects the form offers. Anything else is rejected rather than stored,
   so the admin list stays filterable and a crafted request cannot inject
   arbitrary text into the subject line of an outgoing email. */
const SUBJECTS = ["general", "support", "billing", "quote", "complaint", "partnership"] as const;
type Subject = typeof SUBJECTS[number];

const SUBJECT_LABELS: Record<Subject, string> = {
  general: "General enquiry",
  support: "Technical support",
  billing: "Billing question",
  quote: "Quote request",
  complaint: "Complaint",
  partnership: "Partnership",
};

/* In-memory rate limit. Resets on deploy, which is fine — it exists to stop
   casual form spam, not a determined attacker. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function clean(v: any, max = 500): string {
  return String(v ?? "").trim().slice(0, max);
}

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (rateLimited(ip)) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    const name = clean(body.name, 120);
    const email = clean(body.email, 200).toLowerCase();
    const phone = clean(body.phone, 40);
    const company = clean(body.company, 160);
    const subject = clean(body.subject, 40) as Subject;
    const message = clean(body.message, 5000);
    const locale = clean(body.locale, 5) || "en";

    if (!name || !email || !message) {
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
    }
    if (!SUBJECTS.includes(subject)) {
      return NextResponse.json({ error: "INVALID_SUBJECT" }, { status: 400 });
    }

    const dbName = process.env.MONGODB_DB;
    if (!dbName) return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });

    const client = await clientPromise;
    const db = client.db(dbName);

    /* Store first. If the email then fails we still have the message,
       rather than losing it and telling the sender it went through. */
    const doc = {
      name, email, phone, company, subject, message, locale,
      status: "new" as const,
      ip,
      userAgent: clean(req.headers.get("user-agent"), 300),
      createdAt: new Date(),
      readAt: null as Date | null,
      repliedAt: null as Date | null,
    };

    const result = await db.collection("contact_messages").insertOne(doc);

    // Where to send the notification
    const companyDoc: any = await db.collection("company_settings").findOne({ _id: "default" as any });
    const supportEmail =
      String(companyDoc?.email || "").trim() ||
      process.env.SUPPORT_EMAIL ||
      "";
    const from = process.env.RESEND_FROM || (supportEmail ? `Exodus Logistics <${supportEmail}>` : "");

    if (supportEmail && from) {
      const label = SUBJECT_LABELS[subject];
      const rows = [
        ["Name", name],
        ["Email", email],
        ["Phone", phone || "—"],
        ["Company", company || "—"],
        ["Subject", label],
        ["Language", locale],
      ];

      const rowsHtml = rows.map(([k, v]) => `
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#6b7280;font-weight:600;width:35%;">${esc(k)}</td>
          <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;">${esc(v)}</td>
        </tr>
      `).join("");

      const bodyHtml = `
        <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
          A new message has arrived through the contact form.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
          ${rowsHtml}
        </table>
        <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Message</p>
        <div style="background:#ffffff;border-left:4px solid #1d4ed8;border-radius:8px;padding:16px 20px;">
          <p style="margin:0;font-size:15px;line-height:24px;color:#111827;white-space:pre-line;">${esc(message)}</p>
        </div>
        <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;">
          Reply directly to this email to respond to ${esc(name)}.
        </p>
      `;

      try {
        await resend.emails.send({
          from,
          to: supportEmail,
          replyTo: email,
          subject: `[${label}] ${name}`,
          html: renderEmailTemplate({
            subject: `New contact message from ${name}`,
            title: "New contact message",
            preheader: `${label} from ${name}`,
            bodyHtml,
            appUrl: APP_URL,
            supportEmail,
            sentTo: supportEmail,
          }),
        });
      } catch (e) {
        console.error("Contact notification email failed:", e);
      }

      // Acknowledgement to the sender
      try {
        const ackBody = `
          <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
            Hi <strong>${esc(name)}</strong>,
          </p>
          <p style="margin:0 0 16px 0;font-size:16px;line-height:26px;color:#111827;">
            Thanks for getting in touch. We have your message and someone from our team
            will reply to this address shortly.
          </p>
          <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Your message</p>
          <div style="background:#f8fafc;border-left:4px solid #1d4ed8;border-radius:8px;padding:16px 20px;">
            <p style="margin:0;font-size:15px;line-height:24px;color:#4b5563;white-space:pre-line;">${esc(message)}</p>
          </div>
          <p style="margin:20px 0 0 0;font-size:14px;line-height:22px;color:#6b7280;">
            No need to reply to this email. We will be in touch soon.
          </p>
        `;

        await resend.emails.send({
          from,
          to: email,
          replyTo: supportEmail,
          subject: "We received your message",
          html: renderEmailTemplate({
            subject: "We received your message",
            title: "Message received",
            preheader: "Thanks for getting in touch. We will reply shortly.",
            bodyHtml: ackBody,
            appUrl: APP_URL,
            supportEmail,
            sentTo: email,
          }),
        });
      } catch (e) {
        console.error("Contact acknowledgement email failed:", e);
      }
    }

    return NextResponse.json({ ok: true, id: String(result.insertedId) });
  } catch (e) {
    console.error("/api/contact error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}