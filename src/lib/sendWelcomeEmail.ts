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
          <img src="https://goexoduslogistics.com/logo-email.svg" alt="Exodus Logistics" style="height:48px;width:auto;display:block;margin:0 auto;" />
        </td></tr>

        <!-- Orange accent bar -->
        <tr><td style="background:linear-gradient(90deg,#f97316,#ea580c);padding:14px 40px;text-align:center;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">Account Activated</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:44px 40px;">

          <h1 style="margin:0 0 6px;font-size:28px;font-weight:800;color:#111827;line-height:1.2;">
            Congratulations, ${name}!
          </h1>
          <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.7;">
            Your Exodus Logistics account is now fully active. You are part of a growing network of individuals and businesses shipping smarter across the globe.
          </p>

          <!-- Divider -->
          <div style="height:1px;background:#f1f5f9;margin-bottom:28px;"></div>

          <!-- Feature list -->
          <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#111827;letter-spacing:2px;text-transform:uppercase;">What you can do now</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td width="36" valign="top" style="padding-top:2px;">
                <div style="width:28px;height:28px;background:#eff6ff;border-radius:8px;text-align:center;line-height:28px;">
                  <span style="font-size:14px;color:#1d4ed8;font-weight:700;">1</span>
                </div>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">Track shipments in real time</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">Monitor every delivery live across 120+ countries.</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td width="36" valign="top" style="padding-top:2px;">
                <div style="width:28px;height:28px;background:#eff6ff;border-radius:8px;text-align:center;line-height:28px;">
                  <span style="font-size:14px;color:#1d4ed8;font-weight:700;">2</span>
                </div>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">Generate invoices automatically</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">Professional billing handled for every shipment.</p>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td width="36" valign="top" style="padding-top:2px;">
                <div style="width:28px;height:28px;background:#eff6ff;border-radius:8px;text-align:center;line-height:28px;">
                  <span style="font-size:14px;color:#1d4ed8;font-weight:700;">3</span>
                </div>
              </td>
              <td style="padding-left:12px;">
                <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">Access your global dashboard</p>
                <p style="margin:0;font-size:13px;color:#6b7280;">Manage everything from one place, anytime.</p>
              </td>
            </tr>
          </table>

          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td align="center">
              <a href="https://goexoduslogistics.com/en/dashboard"
                style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.5px;">
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
        <tr><td style="background:#1e293b;padding:28px 40px;text-align:center;border-radius:0 0 20px 20px;">
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