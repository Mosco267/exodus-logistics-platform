import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ Your app URL (use env first, fallback to your domain, fallback to vercel)
const APP_URL =
  process.env.PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://goexoduslogistics.com";

// ✅ Support email (use env first)
const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";

// ✅ FROM (IMPORTANT):
// - Before Resend domain verification: must use onboarding@resend.dev (or another verified sender)
// - After verification: set RESEND_FROM to "Exodus Logistics <support@goexoduslogistics.com>"
const FROM_EMAIL =
  process.env.RESEND_FROM || "Exodus Logistics <onboarding@resend.dev>";

const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || SUPPORT_EMAIL;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendBanEmail(to: string, opts?: { name?: string }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const name = opts?.name?.trim() || "there";
  const safeName = escapeHtml(name);
  const safeTo = escapeHtml(to);

  const baseUrl = APP_URL.replace(/\/$/, "");
  const logoUrl = `${baseUrl}/logo.png`;

  const supportLink = `mailto:${SUPPORT_EMAIL}?subject=Account%20Review%20Request`;
  const year = new Date().getFullYear();
  const subject = "Exodus Logistics: Account access removed";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background:#ffffff; font-family: Arial, Helvetica, sans-serif; color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff; width:100%;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px;">
            <tr>
              <td align="center" style="padding:6px 0 18px 0;">
                <img src="${logoUrl}" alt="Exodus Logistics" width="150"
                  style="display:block; width:150px; height:auto; border:0; outline:none; text-decoration:none;" />
              </td>
            </tr>

            <tr>
              <td style="padding:0 6px;">
                <h1 style="margin:0 0 14px 0; font-size:24px; line-height:30px; font-weight:700; color:#0f172a;">
                  Account access removed
                </h1>

                <p style="margin:0 0 14px 0; font-size:16px; line-height:24px; color:#111827;">
                  Hello ${safeName},
                </p>

                <p style="margin:0 0 14px 0; font-size:16px; line-height:24px; color:#111827;">
                  This email confirms that the Exodus Logistics account associated with
                  <strong>${safeTo}</strong> has been permanently banned due to a violation of our policies.
                </p>

                <p style="margin:0 0 18px 0; font-size:16px; line-height:24px; color:#111827;">
                  Access has been removed, and you will not be able to register another account using this email address.
                </p>

                <div style="padding:8px 0 18px 0;">
                  <a href="${supportLink}"
                    style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none;
                    padding:12px 18px; border-radius:10px; font-size:15px; font-weight:700;">
                    Contact support
                  </a>
                </div>

                <p style="margin:0 0 18px 0; font-size:14px; line-height:22px; color:#374151;">
                  If you believe this action was taken in error, please contact support to request a review.
                </p>

                <p style="margin:0; font-size:16px; line-height:24px; color:#111827;">
                  Regards,<br />
                  <strong>Exodus Logistics Support</strong>
                </p>

                <hr style="border:none; border-top:1px solid #e5e7eb; margin:22px 0;" />

                <p style="margin:0 0 6px 0; font-size:12px; line-height:18px; color:#6b7280; text-align:center;">
                  Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb; text-decoration:none;">${SUPPORT_EMAIL}</a>
                </p>
                <p style="margin:0; font-size:12px; line-height:18px; color:#6b7280; text-align:center;">
                  © ${year} Exodus Logistics. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return resend.emails.send({
  from: `Exodus Logistics <support@goexoduslogistics.com>`,
  to,
  subject,
  replyTo: "support@goexoduslogistics.com",
  html,
});
}