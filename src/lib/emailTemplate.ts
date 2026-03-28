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
const logoUrl = `https://www.goexoduslogistics.com/logo.png`;

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
        <td align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%"
  style="max-width:600px;margin:0 auto;" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">
            <tr>
              <td style="padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                  style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;overflow:hidden;">

                  <tr>
                    <td style="padding:${outerPad}px ${outerPad}px 14px ${outerPad}px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="left" style="vertical-align:middle;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" width="200" height="45" fill="none" style="display:block;">
  <defs>
    <radialGradient id="gOceanLight" cx="35%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#dbeafe" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#93c5fd" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.3"/>
    </radialGradient>
    <radialGradient id="gOceanDark" cx="35%" cy="28%" r="70%">
      <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0.3"/>
    </radialGradient>
    <radialGradient id="gShine" cx="28%" cy="22%" r="40%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gStrokeLight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
    <linearGradient id="gRingF" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.15"/>
      <stop offset="30%" stop-color="#f97316" stop-opacity="1"/>
      <stop offset="70%" stop-color="#ea580c" stop-opacity="1"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0.15"/>
    </linearGradient>
    <linearGradient id="gRingB" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7c2d12" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#7c2d12" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#7c2d12" stop-opacity="0.1"/>
    </linearGradient>
    <clipPath id="gC"><circle cx="36" cy="34" r="18"/></clipPath>
    <clipPath id="gRB"><rect x="0" y="40" width="72" height="20"/></clipPath>
    <clipPath id="gRF"><rect x="0" y="0" width="72" height="40"/></clipPath>
  </defs>
  <style>
    .hex-outer { stroke: rgba(29,78,216,0.3); }
    .hex-inner { fill: rgba(219,234,254,0.4); }
    .globe-circle { fill: url(#gOceanLight); stroke: url(#gStrokeLight); }
    .continent { fill: rgba(29,78,216,0.32); }
    .continent-sm { fill: rgba(29,78,216,0.25); }
    .grid-line { stroke: rgba(29,78,216,0.28); }
    .grid-line-sm { stroke: rgba(29,78,216,0.15); }
    .exodus-text { fill: #1e293b; }
    .logistics-text { fill: #475569; }
    .antarctica { fill: rgba(29,78,216,0.15); }
    @media (prefers-color-scheme: dark) {
      .hex-outer { stroke: rgba(255,255,255,0.25); }
      .hex-inner { fill: rgba(255,255,255,0.08); }
      .globe-circle { fill: url(#gOceanDark); stroke: rgba(255,255,255,0.7); }
      .continent { fill: rgba(255,255,255,0.52); }
      .continent-sm { fill: rgba(255,255,255,0.38); }
      .grid-line { stroke: rgba(255,255,255,0.32); }
      .grid-line-sm { stroke: rgba(255,255,255,0.16); }
      .exodus-text { fill: #ffffff; }
      .logistics-text { fill: rgba(255,255,255,0.82); }
      .antarctica { fill: rgba(255,255,255,0.32); }
    }
  </style>
  <polygon class="hex-outer" points="36,4 62,19 62,49 36,64 10,49 10,19" fill="none" stroke-width="1.5"/>
  <polygon class="hex-inner" points="36,11 56,22.5 56,45.5 36,57 16,45.5 16,22.5"/>
  <circle class="globe-circle" cx="36" cy="34" r="18" stroke-width="1.6"/>
  <g clip-path="url(#gC)">
    <path class="continent" d="M18 22 Q20 18 24 17 Q27 16 28 19 Q30 21 29 25 Q27 28 24 29 Q21 30 19 28 Q17 26 18 22 Z"/>
    <ellipse class="continent-sm" cx="28" cy="18" rx="2.5" ry="2"/>
    <path class="continent" d="M23 31 Q25 29 27 31 Q28 34 27 38 Q25 41 23 39 Q21 36 22 33 Z"/>
    <path class="continent" d="M33 19 Q35 17 37 18 Q39 19 38 22 Q37 24 35 24 Q33 23 33 21 Z"/>
    <path class="continent" d="M33 25 Q35 23 37 24 Q39 26 39 30 Q39 35 37 37 Q35 38 33 36 Q31 33 31 29 Q31 26 33 25 Z"/>
    <path class="continent" d="M38 17 Q42 15 47 16 Q51 17 52 20 Q53 23 51 25 Q48 27 44 27 Q40 27 38 25 Q37 22 38 19 Z"/>
    <path class="continent-sm" d="M43 27 Q45 26 46 28 Q47 31 45 33 Q43 33 42 31 Q42 29 43 27 Z"/>
    <path class="continent" d="M48 31 Q51 29 53 31 Q54 34 52 36 Q50 37 48 35 Q47 33 48 31 Z"/>
    <ellipse class="antarctica" cx="36" cy="50" rx="10" ry="2.5"/>
  </g>
  <ellipse class="grid-line" cx="36" cy="34" rx="18" ry="6.5" fill="none" stroke-width="0.7"/>
  <ellipse class="grid-line-sm" cx="36" cy="34" rx="18" ry="13" fill="none" stroke-width="0.6"/>
  <ellipse class="grid-line" cx="36" cy="34" rx="7" ry="18" fill="none" stroke-width="0.7"/>
  <ellipse class="grid-line-sm" cx="36" cy="34" rx="14" ry="18" fill="none" stroke-width="0.6"/>
  <line class="grid-line" x1="18" y1="34" x2="54" y2="34" stroke-width="0.8"/>
  <line class="grid-line" x1="36" y1="16" x2="36" y2="52" stroke-width="0.8"/>
  <g clip-path="url(#gRB)">
    <ellipse cx="36" cy="34" rx="25" ry="8.5" fill="none" stroke="url(#gRingB)" stroke-width="4" transform="rotate(-20,36,34)"/>
  </g>
  <circle cx="36" cy="34" r="18" fill="url(#gShine)"/>
  <g clip-path="url(#gRF)">
    <ellipse cx="36" cy="34" rx="25" ry="8.5" fill="none" stroke="url(#gRingF)" stroke-width="4" transform="rotate(-20,36,34)"/>
  </g>
  <text class="exodus-text" x="80" y="38" font-family="Georgia,'Times New Roman',serif" font-size="27" font-weight="bold" letter-spacing="4">EXODUS</text>
  <circle cx="235" cy="30" r="3.5" fill="#f97316"/>
  <text class="logistics-text" x="80" y="56" font-family="Georgia,'Times New Roman',serif" font-size="11" font-weight="normal" letter-spacing="8">LOGISTICS</text>
  <line x1="80" y1="61" x2="240" y2="61" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
</svg>
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