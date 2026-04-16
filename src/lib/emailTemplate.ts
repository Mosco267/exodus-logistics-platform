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

  const preheader =
    params.preheader || "You have a new message from Exodus Logistics.";

  const buttonHtml = params.button
    ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 6px 0;">
  <tr>
    <td>
      <a href="${params.button.href}"
        style="display:inline-block;background:linear-gradient(135deg,#0b3aa4 0%,#0e7490 100%);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:12px;font-size:15px;font-weight:800;letter-spacing:0.2px;">
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
          <td style="padding:14px 16px;font-size:14px;line-height:22px;color:#1e3a8a;">
            ${params.calloutHtml}
          </td>
        </tr>
      </table>`
    : "";

  const sentToLine = params.sentTo
    ? `<p style="margin:6px 0 0 0;font-size:11px;line-height:16px;color:#9ca3af;text-align:center;">
        This message was sent to ${esc(params.sentTo)}.
      </p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>${esc(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#111827;">

  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;">
    ${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

              <!-- HEADER: gradient background with logo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#0b3aa4 0%,#0c52c4 40%,#0e7490 100%);padding:28px 32px;border-radius:20px 20px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <img
                            src="${logoUrl}"
                            alt="Exodus Logistics"
                            width="180"
                            height="auto"
                            style="display:block;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;"
                          />
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;">Logistics Platform</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Title bar -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:28px 32px 0 32px;">
                    <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:800;color:#0f172a;letter-spacing:-0.3px;">
                      ${esc(params.title)}
                    </h1>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:16px 32px 0 32px;">
                    <div style="height:1px;background:linear-gradient(90deg,#e2e8f0 0%,#f1f5f9 100%);font-size:0;line-height:0;">&nbsp;</div>
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:24px 32px 0 32px;">
                    ${params.bodyHtml}
                    ${calloutHtml}
                    ${buttonHtml}
                  </td>
                </tr>
              </table>

              <!-- Regards -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:24px 32px 0 32px;">
                    <p style="margin:0;font-size:15px;line-height:24px;color:#374151;">
                      Regards,<br />
                      <strong style="color:#0f172a;">Exodus Logistics Support</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:24px 32px 0 32px;">
                    <div style="height:1px;background:#e2e8f0;font-size:0;line-height:0;">&nbsp;</div>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:20px 32px 28px 32px;">

                    <!-- Footer logo row -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:14px;">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;background:linear-gradient(135deg,#0b3aa4 0%,#0e7490 100%);border-radius:10px;padding:8px 16px;">
                            <img
                              src="${logoUrl}"
                              alt="Exodus Logistics"
                              width="120"
                              height="auto"
                              style="display:block;width:120px;height:auto;border:0;"
                            />
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Footer links -->
                    <p style="margin:0 0 8px 0;font-size:12px;line-height:18px;color:#94a3b8;text-align:center;">
                      <a href="${appUrl}" style="color:#64748b;text-decoration:none;font-weight:600;">Website</a>
                      &nbsp;&bull;&nbsp;
                      <a href="mailto:${params.supportEmail}" style="color:#64748b;text-decoration:none;font-weight:600;">Support</a>
                      &nbsp;&bull;&nbsp;
                      <a href="${appUrl}/en/privacy" style="color:#64748b;text-decoration:none;font-weight:600;">Privacy</a>
                      &nbsp;&bull;&nbsp;
                      <a href="${appUrl}/en/terms" style="color:#64748b;text-decoration:none;font-weight:600;">Terms</a>
                    </p>

                    <!-- Copyright -->
                    <p style="margin:0 0 6px 0;font-size:11px;line-height:17px;color:#94a3b8;text-align:center;">
                      &copy; ${year} Exodus Logistics Ltd. All rights reserved.
                    </p>

                    <!-- Support email -->
                    <p style="margin:0;font-size:11px;line-height:17px;color:#94a3b8;text-align:center;">
                      Need help?&nbsp;
                      <a href="mailto:${params.supportEmail}" style="color:#0b3aa4;text-decoration:none;font-weight:700;">${params.supportEmail}</a>
                    </p>

                    ${sentToLine}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Bottom spacer tag -->
          <tr>
            <td style="padding:16px 0 0 0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
                Exodus Logistics &mdash; Simplifying Global Shipping
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}