import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = (process.env.PUBLIC_APP_URL || "https://goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const SUPPORT_URL = process.env.SUPPORT_URL || `mailto:${SUPPORT_EMAIL}?subject=Account%20Review%20Request`;

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

  // ✅ Make sure this file exists publicly: https://goexoduslogistics.com/logo.png
  const logoUrl = `${APP_URL}/logo.png`;
  const year = new Date().getFullYear();

  const subject = "Exodus Logistics: Account access removed";

  // Nice preheader text (shows in inbox preview sometimes)
  const preheader = "Your account access has been removed. Contact support if you believe this was a mistake.";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#ffffff;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">
            <tr>
              <td align="center" style="padding:8px 0 18px 0;">
                <img src="${logoUrl}" alt="Exodus Logistics" width="140"
                  style="display:block;width:140px;height:auto;border:0;outline:none;text-decoration:none;" />
              </td>
            </tr>

            <tr>
              <td style="padding:0 10px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:30px;font-weight:700;color:#0f172a;">
                  Account access removed
                </h1>

                <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
                  Hello ${safeName},
                </p>

                <p style="margin:0 0 14px 0;font-size:16px;line-height:24px;color:#111827;">
                  This email confirms that the Exodus Logistics account associated with
                  <strong>${safeTo}</strong> has been permanently banned due to a violation of our policies.
                </p>

                <p style="margin:0 0 18px 0;font-size:16px;line-height:24px;color:#111827;">
                  Access has been removed, and you will not be able to register another account using this email address.
                </p>

                <div style="padding:8px 0 18px 0;">
                  <a href="${SUPPORT_URL}"
                    style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                    padding:12px 18px;border-radius:10px;font-size:15px;font-weight:700;">
                    Contact support
                  </a>
                </div>

                <p style="margin:0 0 18px 0;font-size:14px;line-height:22px;color:#374151;">
                  If you believe this action was taken in error, please contact support to request a review.
                </p>

                <p style="margin:0;font-size:16px;line-height:24px;color:#111827;">
                  Regards,<br />
                  <strong>Exodus Logistics Support</strong>
                </p>

                <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0;" />

                <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                  Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;">${SUPPORT_EMAIL}</a>
                </p>
                <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
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
    from: RESEND_FROM,          // ✅ This is what makes Gmail show “Exodus Logistics”
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
  });
}