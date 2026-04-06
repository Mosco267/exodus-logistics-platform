import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(name: string, email: string) {
  await resend.emails.send({
    from: "Exodus Logistics <noreply@goexoduslogistics.com>",
    to: email,
    subject: "Welcome to Exodus Logistics — You're all set!",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);border-radius:20px 20px 0 0;padding:36px 40px;text-align:center;">
          <img src="https://goexoduslogistics.com/logo-email.svg" alt="Exodus Logistics" style="height:64px;width:auto;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Congrats banner -->
        <tr><td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:1px;">Account Verified Successfully</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:40px;">
          <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#111827;">Congratulations, ${name}!</h1>
          <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7;">
            Your Exodus Logistics account is now fully activated. You have access to our complete global logistics platform — from real-time shipment tracking to automated invoicing.
          </p>

          <!-- Feature cards -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="48%" style="background:#f0f4ff;border-radius:12px;padding:16px 20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1d4ed8;">Real-time Tracking</p>
                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">Monitor every shipment live across 120+ countries worldwide.</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#f0f4ff;border-radius:12px;padding:16px 20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1d4ed8;">Smart Invoicing</p>
                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">Generate and manage professional invoices automatically.</p>
              </td>
            </tr>
            <tr><td colspan="3" style="padding-top:12px;"></td></tr>
            <tr>
              <td width="48%" style="background:#f0f4ff;border-radius:12px;padding:16px 20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1d4ed8;">Global Network</p>
                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">Access logistics partners in over 120 countries instantly.</p>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#f0f4ff;border-radius:12px;padding:16px 20px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1d4ed8;">24/7 Support</p>
                <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">Our team is always available to assist with your shipments.</p>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td align="center">
              <a href="https://goexoduslogistics.com/en/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#0891b2);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                Go to Dashboard
              </a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            Need help getting started? Contact us at
            <a href="mailto:support@goexoduslogistics.com" style="color:#1d4ed8;text-decoration:none;font-weight:600;">support@goexoduslogistics.com</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#1e293b;padding:24px 40px;text-align:center;border-radius:0 0 20px 20px;">
          <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ffffff;">Exodus Logistics Ltd.</p>
          <p style="margin:0 0 10px;font-size:12px;color:rgba(255,255,255,0.5);">Your trusted global shipping partner</p>
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