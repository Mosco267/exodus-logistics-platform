// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendBanEmailOptions = {
  to: string;
  name?: string;
  supportUrl?: string; // where the button goes
};

export async function sendBanEmail(to: string, opts: SendBanEmailOptions = { to }) {
  if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  // IMPORTANT: This must be a PUBLIC https URL that works on Vercel (not localhost).
  // Example: https://exodus-logistics-platform.vercel.app/logo.png
  const logoUrl =
    process.env.PUBLIC_APP_URL
      ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, "")}/logo.png`
      : "";

  const name = opts.name?.trim() || "Customer";
  const supportUrl =
    opts.supportUrl?.trim() ||
    (process.env.SUPPORT_URL || `${process.env.PUBLIC_APP_URL?.replace(/\/$/, "") || ""}/en/support`);

  const year = new Date().getFullYear();

  const subject = "Account banned — access removed";

  const html = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <!-- Wrapper -->
    <div style="width:100%;padding:28px 12px;background:#f4f6fb;">
      <!-- Card -->
      <div style="max-width:620px;margin:0 auto;background:#0b1220;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(2,6,23,.25);">
        
        <!-- Header -->
        <div style="padding:22px 24px 14px 24px;background:linear-gradient(180deg,#0b1220 0%,#0b1220 60%,#0a1020 100%);">
          ${
            logoUrl
              ? `<div style="display:flex;align-items:center;gap:12px;">
                   <img src="${logoUrl}" width="120" alt="Exodus Logistics" style="display:block;max-width:120px;height:auto;" />
                 </div>`
              : `<div style="font-size:18px;font-weight:700;color:#e5e7eb;">Exodus Logistics</div>`
          }
        </div>

        <!-- Body -->
        <div style="padding:22px 24px 10px 24px;background:#0b1220;">
          <h1 style="margin:0 0 14px 0;font-size:26px;line-height:1.25;color:#ffffff;">
            Account banned — access removed
          </h1>

          <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#e5e7eb;">
            Hello ${escapeHtml(name)},
          </p>

          <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#e5e7eb;">
            This email confirms that the Exodus Logistics account associated with
            <span style="color:#93c5fd;font-weight:700;">${escapeHtml(to)}</span>
            has been <span style="color:#ffffff;font-weight:700;">permanently banned</span>
            due to a violation of our policies.
          </p>

          <p style="margin:0 0 18px 0;font-size:16px;line-height:1.7;color:#e5e7eb;">
            Access has been removed and you will not be able to register another account using this email address.
          </p>

          <!-- Button -->
          <div style="margin:18px 0 18px 0;">
            <a href="${supportUrl}" target="_blank"
              style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                     padding:14px 20px;border-radius:999px;font-size:16px;font-weight:700;">
              Contact support
            </a>
          </div>

          <p style="margin:0 0 6px 0;font-size:14px;line-height:1.7;color:#cbd5e1;">
            If you believe this action was taken in error, please contact our support team to request a review.
          </p>

          <p style="margin:18px 0 0 0;font-size:15px;line-height:1.7;color:#e5e7eb;">
            Regards,<br/>
            <strong style="color:#ffffff;">Exodus Logistics Support</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px;background:#070d18;border-top:1px solid rgba(148,163,184,.18);">
          <p style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#94a3b8;">
            Need help? Email us at
            <a href="mailto:support@exoduslogistics.com" style="color:#93c5fd;text-decoration:none;">support@exoduslogistics.com</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
            © ${year} Exodus Logistics. All rights reserved.
          </p>
        </div>
      </div>

      <!-- Small footer outside card -->
      <div style="max-width:620px;margin:10px auto 0 auto;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
        Please do not reply to this automated message.
      </div>
    </div>
  </body>
</html>
`;

  return await resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}