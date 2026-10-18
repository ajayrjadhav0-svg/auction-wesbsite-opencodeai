import crypto from 'crypto';
import {
  getAdminEmail,
  getAdminPassword,
  isMailConfigured,
  maskEmail,
  sendOtpEmail,
} from './mailer';
import { isTotpEnrolled, verifyTotpLogin } from './totp';

/**
 * In-memory store for admin two-step verification challenges and sessions.
 * Suitable for a single-process server (this project's Express server).
 */

interface Challenge {
  id: string;
  code: string;
  email: string;
  /** 'totp' challenges are answered with an authenticator-app (or backup) code. */
  method: 'email' | 'totp';
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

interface AdminSession {
  token: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

const challenges = new Map<string, Challenge>();
const sessions = new Map<string, AdminSession>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_ATTEMPTS = 5;

function cleanup() {
  const now = Date.now();
  for (const [id, ch] of challenges) {
    if (ch.expiresAt < now) challenges.delete(id);
  }
  for (const [token, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(token);
  }
}

export interface AdminLoginStartResult {
  ok: boolean;
  message: string;
  challengeId?: string;
  email?: string;
  delivered?: boolean;
  devCode?: string;
  /** Which second step to expect: email code, or authenticator-app code. */
  method?: 'email' | 'totp';
}

export function getAuthStatus() {
  const email = getAdminEmail();
  return {
    emailConfigured: Boolean(email),
    email: email ? maskEmail(email) : '',
    mailConfigured: isMailConfigured(),
    passwordIsDefault: getAdminPassword() === 'admin123',
    totpEnrolled: isTotpEnrolled(),
  };
}

/**
 * Step 1: validate the admin password, then start the second step —
 * an authenticator-app code when TOTP is enrolled, otherwise a emailed code.
 */
export async function startAdminLogin(password: string, tournamentName?: string): Promise<AdminLoginStartResult> {
  cleanup();

  if ((password || '').trim() !== getAdminPassword()) {
    return { ok: false, message: 'Incorrect administrator password.' };
  }

  // Authenticator app enrolled — no email is involved at all.
  if (isTotpEnrolled()) {
    const id = crypto.randomBytes(16).toString('hex');
    challenges.set(id, {
      id,
      code: '',
      email: getAdminEmail(),
      method: 'totp',
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
      createdAt: Date.now(),
    });
    return {
      ok: true,
      challengeId: id,
      method: 'totp',
      message: 'Enter the current 6-digit code from your authenticator app.',
    };
  }

  const adminEmail = getAdminEmail();
  if (!adminEmail && isMailConfigured()) {
    return {
      ok: false,
      message:
        'No ADMIN_EMAIL configured on the server. Add ADMIN_EMAIL (and SMTP settings) to your .env file.',
    };
  }

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const id = crypto.randomBytes(16).toString('hex');

  challenges.set(id, {
    id,
    code,
    email: adminEmail,
    method: 'email',
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    createdAt: Date.now(),
  });

  const result = await sendOtpEmail(adminEmail, code, tournamentName);
  const masked = maskEmail(adminEmail);

  return {
    ok: true,
    challengeId: id,
    email: masked,
    delivered: result.delivered,
    devCode: result.delivered ? undefined : code,
    message: result.delivered
      ? `Verification code sent to ${masked}.`
      : 'Email service is not configured — use the on-screen code (dev mode).',
  };
}

export interface AdminVerifyResult {
  ok: boolean;
  message: string;
  token?: string;
  email?: string;
}

/**
 * Step 2: verify the one-time code and issue an admin session token.
 * Email challenges compare against the emailed code; TOTP challenges are
 * checked against the authenticator app (or a one-time backup code).
 */
export function verifyAdminOtp(challengeId: string, code: string): AdminVerifyResult {
  cleanup();

  const challenge = challenges.get(challengeId);
  if (!challenge) {
    return { ok: false, message: 'This verification session has expired. Please start again.' };
  }
  if (challenge.expiresAt < Date.now()) {
    challenges.delete(challengeId);
    return { ok: false, message: 'This verification code has expired. Please start again.' };
  }

  challenge.attempts += 1;
  if (challenge.attempts > MAX_ATTEMPTS) {
    challenges.delete(challengeId);
    return { ok: false, message: 'Too many incorrect attempts. Please start again.' };
  }

  if (challenge.method === 'totp') {
    const totpResult = verifyTotpLogin(code);
    if (!totpResult.ok) {
      return {
        ok: false,
        message: `${totpResult.message} ${MAX_ATTEMPTS - challenge.attempts} attempt(s) left.`,
      };
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, {
      token,
      email: challenge.email,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    challenges.delete(challengeId);

    return {
      ok: true,
      token,
      email: maskEmail(challenge.email),
      message: totpResult.usedBackup
        ? `Two-step verification complete (backup code — ${totpResult.message}).`
        : 'Two-step verification complete.',
    };
  }

  if ((code || '').trim() !== challenge.code) {
    return { ok: false, message: `Incorrect verification code. ${MAX_ATTEMPTS - challenge.attempts} attempt(s) left.` };
  }

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    token,
    email: challenge.email,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  challenges.delete(challengeId);

  return { ok: true, token, email: maskEmail(challenge.email), message: 'Two-step verification complete.' };
}

export function isValidAdminSession(token?: string): boolean {
  if (!token) return false;
  cleanup();
  const session = sessions.get(token);
  return Boolean(session && session.expiresAt > Date.now());
}

export function endAdminSession(token?: string): void {
  if (token) sessions.delete(token);
}
