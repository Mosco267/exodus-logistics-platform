import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(name: string, email: string) {
  await resend.emails.send({
  from: "Exodus Logistics <noreply@goexoduslogistics.com>",
  replyTo: "support@goexoduslogistics.com",
  to: email,
  subject: "Welcome to Exodus Logistics, Your account is ready!",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
          <img src="https://goexoduslogistics.com/logo-email.svg" alt="Exodus Logistics" style="height:48px;width:auto;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">
          <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;">Congratulations, ${name}!</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.7;">
            Your Exodus Logistics account is now fully activated. Welcome to a smarter way to manage shipments, invoices, and global logistics — all in one place.
          </p>

          <!-- What's next -->
          <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;border-left:4px solid #1d4ed8;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;">What you can do with Exodus Logistics:</p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Track shipments in real time across 120+ countries</p>
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Generate and manage invoices automatically</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">Access our global logistics network instantly</p>
          </div>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td align="center">
              <a href="https://goexoduslogistics.com/en/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                Go to My Dashboard
              </a>
            </td></tr>
          </table>
          
          <!-- Divider -->
          <div style="height:1px;background:#f1f5f9;margin-bottom:24px;"></div>

          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
            Need help getting started? Our team is ready to assist.<br/>
            <a href="mailto:support@goexoduslogistics.com" style="color:#1d4ed8;text-decoration:none;font-weight:600;">support@goexoduslogistics.com</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e293b;padding:24px 40px;text-align:center;border-radius:0 0 20px 20px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ffffff;">Exodus Logistics Ltd.</p>
          <p style="margin:0 0 12px;font-size:12px;color:rgba(255,255,255,0.5);">Your trusted global shipping partner</p>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);">© ${new Date().getFullYear()} Exodus Logistics Ltd. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`,
  });
}