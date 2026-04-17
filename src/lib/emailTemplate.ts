type EmailTemplateParams = {
  subject: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  calloutHtml?: string;
  button?: { text: string; href: string };
  appUrl: string;
  logoPath?: string;
  supportEmail: string;
  sentTo?: string;
};

function esc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderEmailTemplate(params: EmailTemplateParams) {
  const year = new Date().getFullYear();
  const appUrl = params.appUrl.replace(/\/$/, "");
  const logoUrl = `${appUrl}/logo-transparent.png`;
  const preheader = params.preheader || "You have a new message from Exodus Logistics.";

  const buttonHtml = params.button
    ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 6px 0;">
  <tr>
    <td>
      <a href="${params.button.href}"
        style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:12px;font-size:15px;font-weight:800;letter-spacing:0.2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        ${esc(params.button.text)}
      </a>
    </td>
  </tr>
</table>`
    : "";

  const calloutHtml = params.calloutHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
        style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;margin-top:16px;">
        <tr>
          <td style="padding:14px 16px;font-size:14px;line-height:22px;color:#1e3a8a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            ${params.calloutHtml}
          </td>
        </tr>
      </table>`
    : "";

  const sentToLine = params.sentTo
    ? `<p class="footer-text" style="margin:6px 0 0 0;font-size:11px;line-height:16px;color:rgba(255,255,255,0.3);text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
        Sent to ${esc(params.sentTo)}
      </p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(params.subject)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 20px 8px !important; }
      .email-container { width: 100% !important; }
      .logo-img { width: 180px !important; max-width: 180px !important; margin: 0 auto 0 30px !important; }
      .header-td { padding: 20px 24px !important; }
      .body-td { padding: 24px 20px !important; }
      .footer-td { padding: 18px 20px !important; }
      .footer-text { font-size: 10px !important; line-height: 15px !important; }
      .footer-links { font-size: 10px !important; }
      h1 { font-size: 22px !important; line-height: 30px !important; }
      .code-box { width: 32px !important; height: 40px !important; font-size: 20px !important; line-height: 40px !important; }
     .code-cell { padding: 0 3px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;">
    ${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-wrapper" style="background:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table class="email-container" role="presentation" cellspacing="0" cellpadding="0" style="width:560px;max-width:560px;">

          <!-- HEADER -->
          <tr>
            <td class="header-td" style="background:linear-gradient(135deg,#1d4ed8 0%,#0891b2 100%);border-radius:20px 20px 0 0;padding:28px 40px;">
              <img
                src="${logoUrl}"
                alt="Exodus Logistics"
                class="logo-img"
                width="240"
                style="width:240px;max-width:240px;height:auto;display:block;margin:0 auto 0 48px;border:0;"
              />
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td class="body-td" style="background:#ffffff;padding:36px 40px 28px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <h1 style="margin:0 0 6px 0;font-size:26px;line-height:34px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                ${esc(params.title)}
              </h1>

              <div style="height:1px;background:#f1f5f9;margin:16px 0 20px 0;"></div>

              ${params.bodyHtml}
              ${calloutHtml}
              ${buttonHtml}

              <p style="margin:24px 0 0 0;font-size:15px;line-height:24px;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                Regards,<br />
                <strong style="color:#111827;">Exodus Logistics Support</strong>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td class="footer-td" style="background:#1e293b;padding:24px 40px;text-align:center;border-radius:0 0 20px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
              <p class="footer-text" style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Exodus Logistics Ltd.</p>
              <p class="footer-text" style="margin:0 0 10px 0;font-size:11px;color:rgba(255,255,255,0.5);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Your trusted global shipping partner</p>
              <p class="footer-links" style="margin:0 0 8px 0;font-size:11px;color:rgba(255,255,255,0.4);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                <a href="${appUrl}" style="color:rgba(255,255,255,0.5);text-decoration:none;margin:0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Website</a>
                &bull;
                <a href="mailto:${params.supportEmail}" style="color:rgba(255,255,255,0.5);text-decoration:none;margin:0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Support</a>
                &bull;
                <a href="${appUrl}/en/privacy" style="color:rgba(255,255,255,0.5);text-decoration:none;margin:0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Privacy</a>
                &bull;
                <a href="${appUrl}/en/terms" style="color:rgba(255,255,255,0.5);text-decoration:none;margin:0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">Terms</a>
              </p>
              <p class="footer-text" style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
                &copy; ${year} Exodus Logistics Ltd. All rights reserved.
              </p>
              ${sentToLine}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}