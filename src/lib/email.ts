import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://exodus-logistics-platform.vercel.app";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendBanEmail(to: string, opts?: { name?: string }) {
  const name = opts?.name?.trim() || "there";
  const safeName = escapeHtml(name);
  const safeTo = escapeHtml(to);

  const logoUrl = `${APP_URL}/logo.png`;
  const supportEmail = "support@exoduslogistics.com";
  const supportLink = `mailto:${supportEmail}?subject=Account%20Review%20Request`;
  const year = new Date().getFullYear();

  const subject = "Exodus Logistics: Account access removed";

  // Email HTML (simple, white, centered logo, no rounded card)
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0; padding:0; background:#ffffff; font-family: Arial, Helvetica, sans-serif; color:#111827;">
    <!-- Use a minimal table wrapper for best Gmail/iPhone compatibility -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff; width:100%;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px; max-width:600px;">
            <tr>
              <td align="center" style="padding:12px 0 20px 0;">
                <img src="${logoUrl}" alt="Exodus Logistics" width="140"
                     style="display:block; width:140px; height:auto; border:0; outline:none; text-decoration:none;" />
              </td>
            </tr>

            <tr>
              <td style="padding:0 6px;">
                <h1 style="margin:0 0 14px 0; font-size:26px; line-height:32px; font-weight:700; color:#0f172a;">
                  Account access removed
                </h1>

                <p style="margin:0 0 14px 0; font-size:16px; line-height:24px; color:#111827;">
                  Hello ${safeName},
                </p>

                <p style="margin:0 0 14px 0; font-size:16px; line-height:24px; color:#111827;">
                  This email confirms that the Exodus Logistics account associated with
                  <span style="font-weight:700;">${safeTo}</span> has been permanently banned due to a violation of our policies.
                </p>

                <p style="margin:0 0 18px 0; font-size:16px; line-height:24px; color:#111827;">
                  Access has been removed and you will not be able to register another account using this email address.
                </p>

                <div style="padding:8px 0 18px 0;">
                  <a href="${supportLink}"
                     style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none;
                            padding:14px 18px; border-radius:10px; font-size:16px; font-weight:700;">
                    Contact support
                  </a>
                </div>

                <p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#374151;">
                  If you believe this action was taken in error, please contact our support team to request a review.
                </p>

                <p style="margin:0; font-size:16px; line-height:24px; color:#111827;">
                  Regards,<br />
                  <strong>Exodus Logistics Support</strong>
                </p>

                <hr style="border:none; border-top:1px solid #e5e7eb; margin:22px 0;" />

                <p style="margin:0 0 6px 0; font-size:12px; line-height:18px; color:#6b7280;">
                  Support: <a href="mailto:${supportEmail}" style="color:#2563eb; text-decoration:none;">${supportEmail}</a>
                </p>
                <p style="margin:0; font-size:12px; line-height:18px; color:#6b7280;">
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
    from: "Exodus Logistics <onboarding@exoduslogistics.com>",
    to,
    subject,
    html,
  });
}