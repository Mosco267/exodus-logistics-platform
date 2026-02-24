type EmailTemplateParams = {
  subject: string;
  title: string;
  preheader?: string;
  // Body content you pass in (HTML). Keep it simple: <p>...</p><p>...</p>
  bodyHtml: string;

  // Optional callout box
  calloutHtml?: string;

  // Optional button
  button?: { text: string; href: string };

  // Branding
  appUrl: string; // e.g. https://goexoduslogistics.com
  logoPath?: string; // default /logo.png
  supportEmail: string;
  sentTo?: string; // optional footer line
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderEmailTemplate(params: EmailTemplateParams) {
  const year = new Date().getFullYear();

  const appUrl = params.appUrl.replace(/\/$/, "");
  const logoPath = params.logoPath || "/logo.png";
  const logoUrl = `${appUrl}${logoPath}`;

  const preheader =
    params.preheader ||
    "You have a new message from Exodus Logistics.";

  const outerPad = 24;
  const innerPad = 20;

  const buttonHtml = params.button
    ? `<div style="padding:18px 0 6px 0;">
         <a href="${params.button.href}"
           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
           padding:12px 18px;border-radius:10px;font-size:15px;font-weight:800;">
           ${esc(params.button.text)}
         </a>
       </div>`
    : "";

  const calloutHtml = params.calloutHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="background:#eff6ff;border:1px solid #dbeafe;border-radius:12px;margin-top:2px;">
          <tr>
            <td style="padding:12px 14px;font-size:14px;line-height:20px;color:#1e3a8a;">
              ${params.calloutHtml}
            </td>
          </tr>
        </table>`
    : "";

  const sentToLine = params.sentTo
    ? `<tr>
         <td style="padding:10px 10px 0 10px;font-size:11px;line-height:16px;color:#9ca3af;text-align:center;">
           This message was sent to ${esc(params.sentTo)}.
         </td>
       </tr>`
    : "";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(params.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${esc(preheader)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f3f4f6;">
      <tr>
        <td style="background:#0b3aa4;height:6px;line-height:6px;font-size:0;">&nbsp;</td>
      </tr>

      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                  style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">

                  <tr>
                    <td style="padding:${outerPad}px ${outerPad}px 14px ${outerPad}px;">
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
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 ${outerPad}px;">
                      <div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:${innerPad}px ${outerPad}px;">
                      <h1 style="margin:0 0 12px 0;font-size:24px;line-height:30px;font-weight:800;color:#0f172a;">
                        ${esc(params.title)}
                      </h1>

                      ${params.bodyHtml}

                      ${calloutHtml}

                      ${buttonHtml}

                      <p style="margin:14px 0 0 0;font-size:16px;line-height:24px;color:#111827;">
                        Regards,<br />
                        <strong>Exodus Logistics Support</strong>
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0 ${outerPad}px;">
                      <div style="height:1px;background:#e5e7eb;line-height:1px;font-size:0;">&nbsp;</div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:14px ${outerPad}px ${outerPad}px ${outerPad}px;">
                      <p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        Support: <a href="mailto:${params.supportEmail}" style="color:#2563eb;text-decoration:none;">${params.supportEmail}</a>
                      </p>
                      <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#6b7280;text-align:center;">
                        © ${year} Exodus Logistics. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>

            ${sentToLine}

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return html;
}