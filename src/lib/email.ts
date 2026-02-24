import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = (process.env.PUBLIC_APP_URL || "https://goexoduslogistics.com").replace(/\/$/, "");
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@goexoduslogistics.com";
const RESEND_FROM = process.env.RESEND_FROM || `Exodus Logistics <${SUPPORT_EMAIL}>`;
const SUPPORT_URL =
  process.env.SUPPORT_URL || `mailto:${SUPPORT_EMAIL}?subject=Account%20Review%20Request`;

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

  // Make sure this exists: https://goexoduslogistics.com/logo.png
  const logoUrl = `${APP_URL}/logo.png`;
  const year = new Date().getFullYear();

  const subject = "Exodus Logistics: Account access removed";
  const preheader =
    "Your account access has been removed. Contact support if you believe this was a mistake.";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <!-- Preheader (hidden) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;">
      <!-- Top brand bar -->
      <tr>
        <td style="background:#0b3aa4;height:6px;line-height:6px;font-size:0;">&nbsp;</td>
      </tr>

      <tr>
        <td align="center" style="padding:26px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">
            <!-- Header -->
            <tr>
              <td style="padding:0 0 14px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                  style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding:18px 18px 14px 18px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left" style="vertical-align:middle;">
                            <img
                              src="${logoUrl}"
                              alt="Exodus Logistics"
                              width="140"
                              height="38"
                              style="display:block;width:140px;height:38px;border:0;outline:none;text-decoration:none;"
                            />
                          </td>
                          <td align="right" style="vertical-align:middle;font-size:12px;line-height:18px;color:#6b7280;">
                            Security Notice
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Divider -->
                  <tr>
                    <td style="padding:0 18px;">
                      <div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:18px;">
                      <h1 style="margin:0 0 10px 0;font-size:22px;line-height:28px;font-weight:700;color:#0f172a;">
                        Account access removed
                      </h1>

                      <p style="margin:0 0 12px 0;font-size:15px;line-height:22px;color:#111827;">
                        Hello ${safeName},
                      </p>

                      <p style="margin:0 0 12px 0;font-size:15px;line-height:22px;color:#111827;">
                        This email confirms that the Exodus Logistics account associated with
                        <strong>${safeTo}</strong> has been permanently banned due to a violation of our policies.
                      </p>

                      <p style="margin:0 0 16px 0;font-size:15px;line-height:22px;color:#111827;">
                        Access has been removed, and you will not be able to register another account using this email address.
                      </p>

                      <!-- Callout -->
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                        style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;">
                        <tr>
                          <td style="padding:12px 12px;font-size:13px;line-height:18px;color:#1e3a8a;">
                            If you believe this was a mistake, you can request a review by contacting support.
                          </td>
                        </tr>
                      </table>

                      <!-- CTA -->
                      <div style="padding:16px 0 4px 0;">
                        <a href="${SUPPORT_URL}"
                          style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                          padding:12px 16px;border-radius:10px;font-size:14px;font-weight:700;">
                          Contact support
                        </a>
                      </div>

                      <p style="margin:14px 0 0 0;font-size:15px;line-height:22px;color:#111827;">
                        Regards,<br />
                        <strong>Exodus Logistics Support</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:0 18px 18px 18px;">
                      <div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div>
                      <p style="margin:12px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        Support: <a href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb;text-decoration:none;">${SUPPORT_EMAIL}</a>
                      </p>
                      <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        © ${year} Exodus Logistics. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Small legal line -->
            <tr>
              <td style="padding:10px 6px 0 6px;font-size:11px;line-height:16px;color:#9ca3af;text-align:center;">
                This message was sent to ${safeTo}. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    replyTo: SUPPORT_EMAIL,
    html,
  });
}