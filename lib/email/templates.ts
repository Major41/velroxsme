// lib/email/templates.ts

export interface BusinessVerificationEmailProps {
  businessName: string;
  contactPersonName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export function renderBusinessVerificationEmail({
  businessName,
  contactPersonName,
  verificationUrl,
  expiresInHours,
}: BusinessVerificationEmailProps): { html: string; text: string } {
  const text = `
Hi ${contactPersonName || "there"},

Welcome to Velrox!

Your business account for "${businessName}" has been created. Please verify your email address to activate your account and log in.

Verify your email: ${verificationUrl}

This link expires in ${expiresInHours} hours. If you didn't request this, you can safely ignore this email.

- The Velrox Team
  `.trim();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Verify your Velrox account</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b1b31;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fb;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(7,26,51,0.06);">

          <!-- Header band -->
          <tr>
            <td style="background-color:#071a33;padding:28px 40px;text-align:center;">
              <div style="font-size:22px;font-weight:800;letter-spacing:0.18em;color:#ffffff;">
                VELROX
              </div>
              <div style="font-size:11px;color:#8fa3b8;letter-spacing:0.14em;margin-top:6px;">
                BUSINESS MANAGEMENT PLATFORM
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px 40px;">
              <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#0b1b31;font-weight:700;">
                Verify your email address
              </h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4d5d70;">
                Hi ${escapeHtml(contactPersonName || "there")},
              </p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4d5d70;">
                Welcome to Velrox! Your business account for
                <strong style="color:#0b1b31;">${escapeHtml(businessName)}</strong>
                has been created. Please confirm your email address to activate
                your account and sign in to your dashboard.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius:8px;background-color:#0064d2;">
                    <a href="${verificationUrl}"
                       target="_blank"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#7a8b9c;">
                Or paste this link into your browser:
              </p>
              <p style="margin:0 0 24px 0;font-size:12px;line-height:1.6;color:#0064d2;word-break:break-all;">
                <a href="${verificationUrl}" style="color:#0064d2;text-decoration:underline;">${verificationUrl}</a>
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e9f0;margin:28px 0;" />

              <p style="margin:0;font-size:12px;line-height:1.6;color:#8996a5;">
                This link will expire in ${expiresInHours} hours. If you
                didn't request this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;border-top:1px solid #e2e9f0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#8996a5;">
                Need help? Contact us at
                <a href="mailto:support@velrox.app" style="color:#0064d2;text-decoration:none;">support@velrox.app</a>
              </p>
              <p style="margin:0;font-size:11px;color:#a3afbc;">
                © ${new Date().getFullYear()} Velrox. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Fallback line for dark mode -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:16px 8px;text-align:center;">
              <p style="margin:0;font-size:10px;color:#a3afbc;">
                You are receiving this because an account was created with this email.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}