import nodemailer from 'nodemailer';

/**
 * Email delivery for the admin two-step verification (OTP) flow.
 *
 * Configure via environment variables (.env):
 *   ADMIN_EMAIL     - destination address that receives the verification code
 *   ADMIN_PASSWORD  - admin login password (defaults to "admin123" if unset)
 *   SMTP_HOST       - SMTP server host, e.g. smtp.gmail.com
 *   SMTP_PORT       - SMTP port, e.g. 587 (STARTTLS) or 465 (SSL)
 *   SMTP_SECURE     - "true" for port 465, otherwise STARTTLS
 *   SMTP_USER       - SMTP username / login
 *   SMTP_PASS       - SMTP password or app password
 *   MAIL_FROM       - optional "From" header (defaults to SMTP_USER)
 *
 * If SMTP is not configured the app falls back to "dev mode": the code is
 * logged to the server console and returned to the client so testing still works.
 */

export interface MailResult {
  delivered: boolean;
  dev: boolean;
  error?: string;
}

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || '').trim();
}

export function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD || 'admin123').trim();
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Turns "director@example.com" into "di***@example.com" for safe display. */
export function maskEmail(email: string): string {
  const trimmed = (email || '').trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed ? '***' : '';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(1, local.length - visible.length))}${domain}`;
}

export async function sendOtpEmail(to: string, code: string, tournamentName?: string): Promise<MailResult> {
  if (!isMailConfigured()) {
    // Dev fallback: no SMTP configured, print the code so the operator can log in.
    console.log('\n================ ADMIN EMAIL VERIFICATION (DEV MODE) ================');
    console.log(` No SMTP configured. Verification code for ${to}: ${code}`);
    console.log(' Set SMTP_HOST / SMTP_USER / SMTP_PASS / ADMIN_EMAIL to send real email.');
    console.log('====================================================================\n');
    return { delivered: false, dev: true };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const league = tournamentName || 'Cricket League Auction';
    const subject = `${code} is your ${league} admin verification code`;

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: `Your admin verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      html: `
        <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#0f172a;border-radius:16px;color:#e2e8f0">
          <p style="text-transform:uppercase;letter-spacing:2px;font-size:11px;color:#818cf8;font-weight:800;margin:0 0 8px">${league}</p>
          <h2 style="color:#ffffff;margin:0 0 12px;font-size:20px">Admin Two-Step Verification</h2>
          <p style="font-size:14px;line-height:1.5;color:#cbd5e1;margin:0 0 20px">
            Enter the code below to finish signing in to the administrator panel. This code expires in 10 minutes.
          </p>
          <div style="font-size:34px;letter-spacing:10px;font-weight:800;color:#ffffff;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:18px 24px;text-align:center">${code}</div>
          <p style="font-size:12px;color:#94a3b8;margin:20px 0 0">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { delivered: true, dev: false };
  } catch (err: any) {
    console.error('Failed to send admin OTP email:', err?.message || err);
    return { delivered: false, dev: true, error: err?.message || 'Failed to send email' };
  }
}
