// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendBanEmail(to: string, name: string = "Customer") {
  const from = process.env.RESEND_FROM || "onboarding@resend.dev";

  const logoUrl =
    "https://exodus-logistics-platform.vercel.app/logo.png";

  const subject = "Account banned — access removed";

  return await resend.emails.send({
    from,
    to,
    subject,
    html: `
<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>

<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">

  <!-- Main Wrapper -->
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;text-align:center;">

    <!-- Logo -->
    <div style="margin-bottom:30px;">
      <img src="${logoUrl}" width="70" style="display:block;margin:0 auto;" alt="Exodus Logistics"/>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 20px 0;font-size:26px;color:#0f172a;">
      Account banned — access removed
    </h1>

    <!-- Greeting -->
    <p style="margin:0 0 16px 0;font-size:16px;">
      Hello ${escapeHtml(name)},
    </p>

    <!-- Message -->
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
      This email confirms that the Exodus Logistics account associated with
      <strong>${escapeHtml(to)}</strong>
      has been permanently banned due to a violation of our policies.
    </p>

    <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;">
      Access has been removed and you will not be able to register another account using this email address.
    </p>

    <!-- Button -->
    <div style="margin:25px 0;">
      <a href="mailto:support@exoduslogistics.com"
         style="background:#2563eb;color:#ffffff;text-decoration:none;
                padding:14px 24px;font-size:15px;font-weight:bold;
                border-radius:8px;display:inline-block;">
        Contact Support
      </a>
    </div>

    <!-- Closing -->
    <p style="margin:30px 0 0 0;font-size:15px;">
      Regards,<br/>
      <strong>Exodus Logistics Support</strong>
    </p>

  </div>

  <!-- Footer Strip -->
  <div style="background:#0f172a;color:#ffffff;text-align:center;padding:18px 10px;font-size:12px;">
    © ${new Date().getFullYear()} Exodus Logistics. All rights reserved.<br/>
    support@exoduslogistics.com
  </div>

</body>
</html>
    `,
  });
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}