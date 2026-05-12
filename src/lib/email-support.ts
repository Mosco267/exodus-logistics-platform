// src/lib/email-support.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || "Exodus Logistics <support@goexoduslogistics.com>";

function esc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function categoryLabel(cat: string): string {
  const m: Record<string, string> = {
    billing: "Billing",
    shipment: "Shipment Issue",
    account: "Account",
    technical: "Technical Issue",
    feature: "Feature Request",
    other: "Other",
  };
  return m[String(cat).toLowerCase()] || "Support";
}

/**
 * Reusable email shell (matches your existing template style — gradient header,
 * branded footer). If you have a `renderEmail()` or `EMAIL_TEMPLATE` in
 * @/lib/email already, swap this shell for that one.
 */
function shell({ title, preview, contentHtml }: { title: string; preview: string; contentHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<style>
  body { margin: 0; padding: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .wrap { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #0b3aa4 0%, #0e7490 100%); padding: 28px 24px; text-align: center; }
  .header img { height: 36px; }
  .header h1 { color: #ffffff; font-size: 20px; margin: 12px 0 0; font-weight: 800; }
  .body { padding: 28px 24px; color: #1f2937; line-height: 1.6; font-size: 15px; }
  .body p { margin: 0 0 14px; }
  .btn { display: inline-block; background: #0b3aa4; color: #ffffff !important; text-decoration: none; padding: 12px 22px; border-radius: 12px; font-weight: 700; font-size: 14px; }
  .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; }
  .info-row { font-size: 14px; padding: 4px 0; }
  .info-row strong { color: #6b7280; font-weight: 600; display: inline-block; min-width: 110px; }
  .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 24px; text-align: center; color: #6b7280; font-size: 12px; }
  .preview { display: none; max-height: 0; overflow: hidden; }
</style>
</head>
<body>
  <div class="preview">${esc(preview)}</div>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <img src="https://www.goexoduslogistics.com/logo.png" alt="Exodus Logistics" />
        <h1>${esc(title)}</h1>
      </div>
      <div class="body">
        ${contentHtml}
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Exodus Logistics Ltd. · <a href="https://www.goexoduslogistics.com" style="color: #0b3aa4;">goexoduslogistics.com</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── 1) Ticket created — to admin support inbox ──────────────────
export async function sendSupportTicketCreatedAdminEmail(
  adminEmail: string,
  data: {
    ticketNumber: string;
    subject: string;
    category: string;
    userName: string;
    userEmail: string;
    body: string;
    shipmentRef?: string | null;
  }
) {
  const title = `New Support Ticket: ${data.subject}`;
  const preview = `${data.userName} opened a new support ticket: ${data.subject}`;
  const adminUrl = `https://www.goexoduslogistics.com/en/dashboard/admin/support`;

  const contentHtml = `
    <p>A new support ticket has been opened by <strong>${esc(data.userName)}</strong>.</p>
    <div class="info-card">
      <div class="info-row"><strong>Ticket:</strong> ${esc(data.ticketNumber)}</div>
      <div class="info-row"><strong>Subject:</strong> ${esc(data.subject)}</div>
      <div class="info-row"><strong>Category:</strong> ${esc(categoryLabel(data.category))}</div>
      <div class="info-row"><strong>From:</strong> ${esc(data.userName)} (${esc(data.userEmail)})</div>
      ${data.shipmentRef ? `<div class="info-row"><strong>Shipment:</strong> ${esc(data.shipmentRef)}</div>` : ""}
    </div>
    <p><strong>Message:</strong></p>
    <div class="info-card" style="white-space: pre-wrap;">${esc(data.body)}</div>
    <p style="text-align: center; margin-top: 24px;">
      <a href="${adminUrl}" class="btn">Open Ticket in Admin Panel</a>
    </p>
  `;

  const html = shell({ title, preview, contentHtml });

  return resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `[Support] ${data.ticketNumber} — ${data.subject}`,
    html,
  });
}

// ─── 2) Admin replied — to user ──────────────────────────────────
export async function sendSupportTicketReplyUserEmail(
  userEmail: string,
  data: {
    ticketNumber: string;
    subject: string;
    userName: string;
    replyBody: string;
  }
) {
  const title = `Support replied to your ticket`;
  const preview = `Our support team has responded to ticket ${data.ticketNumber}`;
  const url = `https://www.goexoduslogistics.com/en/dashboard/support`;

  const contentHtml = `
    <p>Hi ${esc(data.userName || "there")},</p>
    <p>Our support team has replied to your ticket <strong>${esc(data.ticketNumber)}</strong>:</p>
    <div class="info-card">
      <div class="info-row"><strong>Subject:</strong> ${esc(data.subject)}</div>
    </div>
    <p><strong>Reply:</strong></p>
    <div class="info-card" style="white-space: pre-wrap;">${esc(data.replyBody)}</div>
    <p style="text-align: center; margin-top: 24px;">
      <a href="${url}" class="btn">View Ticket</a>
    </p>
    <p style="font-size: 13px; color: #6b7280; margin-top: 16px;">
      You can reply directly from your dashboard. If your issue is resolved, no further action is needed —
      the ticket will auto-close after 30 days of inactivity.
    </p>
  `;

  const html = shell({ title, preview, contentHtml });

  return resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `[Support] Re: ${data.subject} (${data.ticketNumber})`,
    html,
  });
}