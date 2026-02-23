// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type BanEmailOptions = {
  to: string;
  name?: string;
  // If you have a support page, put it here (otherwise mailto will be used)
  supportUrl?: string;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[c] || c;
  });
}

export async function sendBanEmail(to: string, opts: BanEmailOptions = { to }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const supportEmail = process.env.SUPPORT_EMAIL || "support@exoduslogistics.com";

  // ✅ Logo must be a PUBLIC https URL for emails.
  // Put a file in /public like: /logo-email.png
  // Then set APP_URL=https://yourdomain.com and it becomes:
  // https://yourdomain.com/logo-email.png
  const logoUrl =
    appUrl ? `${appUrl}/logo-email.png` : ""; // leave blank in local/dev if you don't have a public URL

  const safeName = opts.name ? escapeHtml(opts.name) : "there";
  const safeTo = escapeHtml(to);

  const supportUrl =
    opts.supportUrl ||
    (supportEmail ? `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent("Account ban review request")}` : "#");

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Account banned — access removed</title>
  </head>
  <body style="margin:0;padding:0;background:#0b1220;">
    <!-- Full width background -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1220;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <!-- Container -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;">
            <!-- Header -->
            <tr>
              <td style="padding:0 0 14px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="left" style="padding:0 6px;">
                      ${
                        logoUrl
                          ? `<img src="${logoUrl}" width="140" alt="Exodus Logistics" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:140px;" />`
                          : `<div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:.2px;">Exodus Logistics</div>`
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Main content (no “card border”, simple + clean) -->
            <tr>
              <td style="padding:0 6px;">
                <div style="font-family:Arial,Helvetica,sans-serif;color:#eaf0ff;line-height:1.55;">
                  <div style="font-size:22px;font-weight:800;margin:0 0 10px 0;color:#ffffff;">
                    Account banned — access removed
                  </div>

                  <div style="font-size:16px;margin:0 0 18px 0;">
                    Hello ${safeName},
                  </div>

                  <div style="font-size:16px;margin:0 0 14px 0;">
                    We’re writing to inform you that your Exodus Logistics account (<span style="color:#cfe0ff;font-weight:700;">${safeTo}</span>)
                    has been <span style="color:#ffffff;font-weight:800;">permanently banned</span> due to a violation of our policies.
                  </div>

                  <div style="font-size:16px;margin:0 0 18px 0;">
                    As a result, your access has been removed and you will <span style="color:#ffffff;font-weight:800;">not</span> be able to create another account using this email address.
                  </div>

                  <!-- Button -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 18px 0;">
                    <tr>
                      <td bgcolor="#2d6bff" style="border-radius:999px;">
                        <a href="${supportUrl}"
                           style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;
                                  font-size:16px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;">
                          Contact support
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="font-size:14px;color:#b8c6e6;margin:10px 0 0 0;">
                    If you believe this decision was made in error, contact support to request a review.
                  </div>

                  <div style="font-size:14px;color:#93a6cf;margin:22px 0 0 0;">
                    Regards,<br/>
                    <span style="font-weight:800;color:#ffffff;">Exodus Logistics Support</span>
                  </div>

                  <!-- Footer -->
                  <div style="margin-top:28px;padding-top:14px;border-top:1px solid rgba(255,255,255,.10);font-size:12px;color:#93a6cf;">
                    Support: <a href="mailto:${supportEmail}" style="color:#9fc0ff;text-decoration:none;">${supportEmail}</a><br/>
                    © ${new Date().getFullYear()} Exodus Logistics
                  </div>
                </div>
              </td>
            </tr>

          </table>
          <!-- /Container -->
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  return await resend.emails.send({
    from,
    to,
    subject: "Account banned — access removed",
    html,
  });
}