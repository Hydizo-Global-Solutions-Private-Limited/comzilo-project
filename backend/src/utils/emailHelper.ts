import { SmtpService } from '../services/smtpService';
import crypto from 'crypto';

export interface OnboardingEmailParams {
  tenantId: number;
  recipientEmail: string;
  ownerName: string;
  storeName: string;
  tempPassword: string;
  loginUrl?: string;
}

export function generateSecureTempPassword(): string {
  const digits = '23456789';
  const pick = (len: number) =>
    Array.from({ length: len }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  return `Store${pick(3)}Pass#${pick(3)}`;
}

export function getSellerOnboardingHtml(params: {
  ownerName: string;
  storeName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Comzilo Platform</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #F1F5F9; color: #1E293B;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 40px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1);">
        <!-- HEADER BANNER -->
        <tr>
          <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 36px 40px; text-align: center;">
            <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
              Comzilo Multi-Tenant Portal
            </h1>
            <p style="color: #94A3B8; margin: 8px 0 0 0; font-size: 14px; font-weight: 500;">
              Merchant Store Onboarding & Entitlements
            </p>
          </td>
        </tr>

        <!-- BODY CONTENT -->
        <tr>
          <td style="padding: 40px;">
            <h2 style="color: #0F172A; margin: 0 0 16px 0; font-size: 22px; font-weight: 700;">
              Welcome, ${params.ownerName}! 🎉
            </h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
              Congratulations! Your seller application for <strong>${params.storeName}</strong> has been officially approved by the Comzilo Super Admin team. Your store and administrative workspace have been provisioned.
            </p>

            <!-- CREDENTIALS BOX -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px;">
              <tr>
                <td style="padding: 24px;">
                  <h3 style="color: #0F172A; margin: 0 0 16px 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Your Merchant Credentials
                  </h3>

                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-size: 14px; width: 140px;">Registered Store:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-size: 14px; font-weight: 700;">${params.storeName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-size: 14px;">Login Email:</td>
                      <td style="padding: 6px 0; color: #0F172A; font-size: 14px; font-weight: 700;">${params.email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; color: #64748B; font-size: 14px;">Temporary Password:</td>
                      <td style="padding: 6px 0;">
                        <span style="background-color: #E2E8F0; color: #0F172A; font-family: monospace; font-size: 16px; font-weight: 800; padding: 6px 12px; border-radius: 6px; border: 1px solid #CBD5E1; display: inline-block;">
                          ${params.tempPassword}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- DIRECT CTA BUTTON -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
              <tr>
                <td align="center">
                  <a href="${params.loginUrl}" target="_blank" style="background-color: #2563EB; color: #FFFFFF; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                    Access Seller Portal →
                  </a>
                </td>
              </tr>
            </table>

            <!-- SECURITY NOTICE -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF1F2; border: 1px solid #FECDD3; border-radius: 8px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 16px; color: #9F1239; font-size: 13px; line-height: 1.5;">
                  <strong>⚠️ Mandatory Security Notice:</strong> For your protection, this temporary password requires an immediate password update upon your initial login. You will be automatically redirected to the secure password change screen.
                </td>
              </tr>
            </table>

            <p style="color: #64748B; font-size: 14px; line-height: 1.5; margin: 0;">
              If you have any questions or need assistance setting up your products, warehouses, or domain settings, please contact our support team at <a href="mailto:support@comzilo.com" style="color: #2563EB;">support@comzilo.com</a>.
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 40px; text-align: center;">
            <p style="color: #94A3B8; font-size: 12px; margin: 0 0 6px 0;">
              © ${new Date().getFullYear()} Comzilo SaaS Multi-Tenant Platform. All rights reserved.
            </p>
            <p style="color: #CBD5E1; font-size: 11px; margin: 0;">
              Automated system notification. Please do not reply directly to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendSellerOnboardingEmail(
  params: OnboardingEmailParams
): Promise<{ success: boolean; messageId: string }> {
  const smtpService = new SmtpService();

  const loginUrl = params.loginUrl || process.env.SELLER_LOGIN_URL || 'http://localhost:5173/login';

  const html = getSellerOnboardingHtml({
    ownerName: params.ownerName,
    storeName: params.storeName,
    email: params.recipientEmail,
    tempPassword: params.tempPassword,
    loginUrl,
  });

  return smtpService.sendEmail({
    tenantId: params.tenantId,
    to: params.recipientEmail,
    subject: `Welcome to Comzilo! Login Credentials for ${params.storeName}`,
    html,
    templateName: 'seller_onboarding',
  });
}
