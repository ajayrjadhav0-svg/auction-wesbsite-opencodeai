import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

/**
 * TOTP authenticator-app two-step verification (RFC 6238).
 *
 * Works with Google Authenticator, Authy, Microsoft Authenticator, 1Password,
 * and any other RFC 6238-compatible app. No SMS/email/network required — the
 * code is generated on the phone, so it keeps working at a venue with poor
 * connectivity.
 *
 * Secrets live in `data/admin-totp.json` (server-only, never sent to clients,
 * git-ignored). One-time backup codes are stored hashed.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const TOTP_FILE = path.join(DATA_DIR, 'admin-totp.json');

const STEP_SECONDS = 30; // standard TOTP period
const DIGITS = 6;
const SECRET_BYTES = 20; // 160-bit secret, the RFC 4226 recommendation
const BACKUP_CODE_COUNT = 8;
const PENDING_TTL_MS = 10 * 60 * 1000;

/* ------------------------------------------------------------------ *
 *  base32 (RFC 4648) — the encoding authenticator apps expect
 * ------------------------------------------------------------------ */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += B32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/* ------------------------------------------------------------------ *
 *  TOTP generation / verification (HMAC-SHA1, 30s, 6 digits)
 * ------------------------------------------------------------------ */

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

function currentCounter(): number {
  return Math.floor(Date.now() / 1000 / STEP_SECONDS);
}

/** Generate the current 6-digit code for a base32 secret. */
export function generateTotpCode(secretBase32: string): string {
  return hotp(base32Decode(secretBase32), currentCounter());
}

/** Verify a submitted code, tolerating ±1 time step (clock drift). */
export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const clean = normalizeCode(code);
  if (!clean) return false;
  const secret = base32Decode(secretBase32);
  const counter = currentCounter();
  for (let i = -1; i <= 1; i++) {
    if (hotp(secret, counter + i) === clean) return true;
  }
  return false;
}

/** Accept "123456", "123 456", "123-456" — apps display codes in many styles. */
function normalizeCode(code: string): string {
  return String(code || '').replace(/[^0-9]/g, '').slice(0, DIGITS);
}

/* ------------------------------------------------------------------ *
 *  Persistent storage — data/admin-totp.json (server-only file)
 * ------------------------------------------------------------------ */

interface TotpFile {
  enrolled: boolean;
  secret?: string;
  enrolledAt?: string;
  account?: string;
  issuer?: string;
  backupCodes?: string[]; // sha256 hashes, one per unused code
}

function loadTotpFile(): TotpFile {
  try {
    if (fs.existsSync(TOTP_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TOTP_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.warn('Could not read admin TOTP file:', err);
  }
  return { enrolled: false };
}

function saveTotpFile(data: TotpFile): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(TOTP_FILE, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.chmodSync(TOTP_FILE, 0o600); // best-effort: owner-only on POSIX hosts
    } catch {
      /* Windows or restricted FS — ignore */
    }
  } catch (err) {
    console.warn('Could not persist admin TOTP file:', err);
    throw new Error('Failed to save authenticator configuration on the server.');
  }
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/* ------------------------------------------------------------------ *
 *  One-time backup codes
 * ------------------------------------------------------------------ */

// Unambiguous alphabet (no 0/O, 1/I/L) so printed codes are easy to retype.
const BACKUP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += BACKUP_ALPHABET[crypto.randomInt(0, BACKUP_ALPHABET.length)];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }
  return codes;
}

/* ------------------------------------------------------------------ *
 *  Pending enrollments (in-memory, keyed by the admin session token)
 * ------------------------------------------------------------------ */

interface PendingEnrollment {
  secret: string;
  account: string;
  issuer: string;
  createdAt: number;
}

const pendingEnrollments = new Map<string, PendingEnrollment>();

function cleanupPending(): void {
  const now = Date.now();
  for (const [key, p] of pendingEnrollments) {
    if (now - p.createdAt > PENDING_TTL_MS) pendingEnrollments.delete(key);
  }
}

/* ------------------------------------------------------------------ *
 *  Public API used by auth.ts / routes.ts
 * ------------------------------------------------------------------ */

export function isTotpEnrolled(): boolean {
  return loadTotpFile().enrolled === true;
}

export function getTotpStatus() {
  const data = loadTotpFile();
  return {
    enrolled: data.enrolled === true,
    enrolledAt: data.enrolledAt || '',
    account: data.account || '',
    issuer: data.issuer || '',
    backupCodesRemaining: Array.isArray(data.backupCodes) ? data.backupCodes.length : 0,
  };
}

export interface TotpSetupStart {
  ok: boolean;
  message: string;
  secret?: string;
  otpauthUrl?: string;
  qrDataUrl?: string;
}

/**
 * Step 1 of enrollment: mint a fresh secret for this admin session and return
 * everything needed to scan it (QR image + otpauth URL + manual-entry secret).
 */
export async function startTotpEnrollment(
  sessionToken: string,
  issuer: string,
  account: string
): Promise<TotpSetupStart> {
  cleanupPending();

  if (isTotpEnrolled()) {
    return {
      ok: false,
      message: 'An authenticator app is already enrolled. Disable it before setting up a new one.',
    };
  }

  const secret = base32Encode(crypto.randomBytes(SECRET_BYTES));
  const safeIssuer = (issuer || 'Cricket Auction').trim().slice(0, 60) || 'Cricket Auction';
  const safeAccount = (account || 'admin').trim().slice(0, 60) || 'admin';

  pendingEnrollments.set(sessionToken, {
    secret,
    account: safeAccount,
    issuer: safeIssuer,
    createdAt: Date.now(),
  });

  const otpauthUrl =
    `otpauth://totp/${encodeURIComponent(safeIssuer)}:${encodeURIComponent(safeAccount)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(safeIssuer)}&algorithm=SHA1` +
    `&digits=${DIGITS}&period=${STEP_SECONDS}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: 'M',
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });
    return {
      ok: true,
      message: 'Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.',
      secret,
      otpauthUrl,
      qrDataUrl,
    };
  } catch (err: any) {
    return {
      ok: true,
      message: 'QR image could not be generated — enter the secret key manually in your app.',
      secret,
      otpauthUrl,
    };
  }
}

export interface TotpConfirmResult {
  ok: boolean;
  message: string;
  backupCodes?: string[];
}

/**
 * Step 2 of enrollment: the admin proves the app is scanning correctly by
 * entering one live code. On success the secret is persisted and one-time
 * backup codes are generated (returned exactly once, stored only hashed).
 */
export function confirmTotpEnrollment(sessionToken: string, code: string): TotpConfirmResult {
  cleanupPending();

  const pending = pendingEnrollments.get(sessionToken);
  if (!pending) {
    return {
      ok: false,
      message: 'Setup session expired. Start again from "Set up authenticator app".',
    };
  }

  if (!verifyTotpCode(pending.secret, code)) {
    return {
      ok: false,
      message: 'That code did not match. Wait for your app to refresh (30s) and try the new code.',
    };
  }

  const backupCodes = makeBackupCodes();
  saveTotpFile({
    enrolled: true,
    secret: pending.secret,
    enrolledAt: new Date().toISOString(),
    account: pending.account,
    issuer: pending.issuer,
    backupCodes: backupCodes.map(hashCode),
  });
  pendingEnrollments.delete(sessionToken);

  return {
    ok: true,
    message: 'Authenticator app enrolled successfully.',
    backupCodes,
  };
}

export interface TotpVerifyResult {
  ok: boolean;
  message: string;
  usedBackup?: boolean;
}

/**
 * Login-step verification: accepts the current TOTP code, or consumes one of
 * the one-time backup codes (useful if the phone is lost).
 */
export function verifyTotpLogin(code: string): TotpVerifyResult {
  const data = loadTotpFile();
  if (!data.enrolled || !data.secret) {
    return { ok: false, message: 'Authenticator app is not enrolled on this server.' };
  }

  const clean = String(code || '').trim();

  if (verifyTotpCode(data.secret, clean)) {
    return { ok: true, message: 'Authenticator code accepted.' };
  }

  // Try one-time backup codes (hashed comparison; consume on success).
  if (/^[A-Za-z0-9-]{4,12}$/.test(clean)) {
    const attemptHash = hashCode(clean.toUpperCase());
    const remaining = Array.isArray(data.backupCodes) ? data.backupCodes : [];
    const idx = remaining.indexOf(attemptHash);
    if (idx >= 0) {
      remaining.splice(idx, 1);
      saveTotpFile({ ...data, backupCodes: remaining });
      return {
        ok: true,
        usedBackup: true,
        message: `Backup code accepted. ${remaining.length} backup code(s) remaining.`,
      };
    }
  }

  return {
    ok: false,
    message: 'Incorrect authenticator code. Check your app (the code refreshes every 30 seconds).',
  };
}

export interface TotpDisableResult {
  ok: boolean;
  message: string;
}

/**
 * Turn authenticator verification off. When already enrolled, a valid current
 * code (or backup code) is required so an unattended admin session cannot
 * silently strip the second factor.
 */
export function disableTotp(code?: string): TotpDisableResult {
  const data = loadTotpFile();
  if (!data.enrolled) {
    return { ok: true, message: 'Authenticator app is not enrolled.' };
  }

  const verified = verifyTotpLogin(String(code || ''));
  if (!verified.ok) {
    return { ok: false, message: verified.message };
  }

  saveTotpFile({ enrolled: false });
  pendingEnrollments.clear();
  return { ok: true, message: 'Authenticator app disabled. Email verification will be used.' };
}
