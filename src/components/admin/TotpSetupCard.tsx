import React, { useCallback, useEffect, useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  KeyRound,
  QrCode,
  Copy,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const ADMIN_TOKEN_KEY = 'cricket_auction_admin_token';

interface TotpStatus {
  enrolled: boolean;
  enrolledAt: string;
  account: string;
  issuer: string;
  backupCodesRemaining: number;
}

interface SetupPayload {
  secret?: string;
  qrDataUrl?: string;
  otpauthUrl?: string;
  message?: string;
}

/**
 * "Account Security" card — enroll, confirm, and manage authenticator-app
 * (TOTP) two-step verification for the admin login.
 *
 * Requires a signed-in admin session token (issued by AdminOtpLogin).
 */
export const TotpSetupCard: React.FC = () => {
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [serverReachable, setServerReachable] = useState(true);
  const [mode, setMode] = useState<'idle' | 'setup' | 'confirm' | 'backups' | 'disable'>('idle');
  const [setup, setSetup] = useState<SetupPayload>({});
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [info, setInfo] = useState('');
  const [copied, setCopied] = useState(false);

  const getToken = () => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  };

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/totp/status');
      const data = await res.json();
      setServerReachable(true);
      setStatus(data as TotpStatus);
    } catch {
      setServerReachable(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const postJson = async (url: string, body: Record<string, unknown>) => {
    const token = getToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status === 401) {
      const err = new Error(data.message || 'Admin session expired. Please sign in again.');
      (err as any).sessionExpired = true;
      throw err;
    }
    if (!res.ok) {
      throw new Error(data.message || 'Request failed.');
    }
    return data;
  };

  const startSetup = async () => {
    setErrorMsg('');
    setInfo('');
    setBusy(true);
    try {
      const data = await postJson('/api/auth/totp/setup', {});
      setSetup(data as SetupPayload);
      setCode('');
      setMode('confirm');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not start setup.');
      if (err.sessionExpired) setMode('idle');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    if (code.trim().length !== 6) {
      setErrorMsg('Enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setBusy(true);
    try {
      const data = await postJson('/api/auth/totp/confirm', { code: code.trim() });
      const codes = Array.isArray(data.backupCodes) ? data.backupCodes : [];
      setBackupCodes(codes);
      setInfo(data.message || 'Authenticator app enrolled.');
      setCode('');
      await loadStatus();
      setMode(codes.length ? 'backups' : 'idle');
    } catch (err: any) {
      setErrorMsg(err.message || 'That code did not match. Wait 30s for a fresh code and retry.');
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setBusy(true);
    try {
      const data = await postJson('/api/auth/totp/disable', { code: code.trim() });
      setInfo(data.message || 'Authenticator app disabled.');
      setCode('');
      await loadStatus();
      setMode('idle');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not disable. Enter a valid current code.');
    } finally {
      setBusy(false);
    }
  };

  const copyBackups = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('Copy failed — select the codes manually.');
    }
  };

  const downloadBackups = () => {
    const text = [
      'ADMIN BACKUP CODES — keep this somewhere safe (offline).',
      'Each code works ONCE if your phone is lost.',
      '',
      ...backupCodes,
      '',
      `Tournament: ${status?.issuer || ''}`,
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admin_backup_codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputBase =
    'w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 outline-hidden transition-all bg-white';

  if (!serverReachable) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
          <Smartphone className="w-4 h-4 text-slate-400" />
          <span className="font-['Outfit']">Authenticator App</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          The Node server is unreachable (static/offline mode), so authenticator setup is
          unavailable here. When the server runs, come back to enroll Google Authenticator / Authy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Smartphone className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit'] font-black text-sm text-slate-900">
                Authenticator App
              </span>
              {status?.enrolled ? (
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Enrolled
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  Not set up
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Two-step login with a rotating 6-digit code — works offline at the venue.
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      {info && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ---------- IDLE ---------- */}
      {mode === 'idle' && (
        <div className="space-y-3">
          {status?.enrolled ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p>
                  Enrolled <strong>{status.enrolledAt ? new Date(status.enrolledAt).toLocaleString() : ''}</strong>
                  {' — '}{status.issuer || 'tournament'} / {status.account || 'admin'}
                </p>
                <p>
                  Backup codes remaining: <strong>{status.backupCodesRemaining}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setErrorMsg('');
                    setInfo('');
                    setCode('');
                    setMode('disable');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-['Outfit'] font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disable Authenticator</span>
                </button>
                <span className="text-[11px] text-slate-500">
                  To switch phones: disable here, then set up again with the new phone.
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={startSetup}
              disabled={busy}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              <span>{busy ? 'Generating QR...' : 'Set Up Authenticator App'}</span>
            </button>
          )}
        </div>
      )}

      {/* ---------- CONFIRM (scan QR, enter code) ---------- */}
      {mode === 'confirm' && (
        <form onSubmit={confirmSetup} className="space-y-4">
          <ol className="text-[11px] text-slate-600 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Open Google Authenticator, Authy or any similar app on your phone.</li>
            <li>Tap <strong>Scan a QR code</strong> and point the camera at the QR below.</li>
            <li>Type the current 6-digit code it shows into the box below.</li>
          </ol>

          {setup.qrDataUrl ? (
            <div className="flex justify-center">
              <div className="p-3 bg-white border-2 border-indigo-200 rounded-2xl shadow-2xs">
                <img
                  src={setup.qrDataUrl}
                  alt="Authenticator enrollment QR code"
                  className="w-56 h-56"
                />
              </div>
            </div>
          ) : null}

          {setup.secret && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showSecret ? 'Hide' : 'Show'} the key for manual entry</span>
              </button>
              {showSecret && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
                  {setup.secret}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Confirm With A Live Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/[^0-9]/g, ''));
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="••••••"
                className={`${inputBase} tracking-[0.5em] font-mono text-center text-lg`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setCode('');
                setErrorMsg('');
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{busy ? 'Confirming...' : 'Confirm & Activate'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ---------- BACKUP CODES (shown once) ---------- */}
      {mode === 'backups' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-xs">
              <AlertCircle className="w-4 h-4" />
              Save These Backup Codes Now
            </div>
            <p>
              Each code works <strong>once</strong> if your phone is lost — they are shown only
              this one time. Copy or download them before closing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((c) => (
              <div
                key={c}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-sm text-slate-800 text-center tracking-wider"
              >
                {c}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={copyBackups}
              className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 font-['Outfit'] font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy All'}</span>
            </button>
            <button
              onClick={downloadBackups}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>
            <button
              onClick={() => {
                setBackupCodes([]);
                setMode('idle');
              }}
              className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-['Outfit'] font-bold text-xs transition-colors"
            >
              I Have Saved Them — Done
            </button>
          </div>
        </div>
      )}

      {/* ---------- DISABLE (requires a valid code) ---------- */}
      {mode === 'disable' && (
        <form onSubmit={disableTotp} className="space-y-4">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            To turn off authenticator verification, enter a <strong>current code</strong> from your
            app (or an unused backup code). Email verification will be used again afterwards.
          </p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^0-9]/g, ''));
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="••••••"
              className={`${inputBase} tracking-[0.5em] font-mono text-center text-lg`}
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setCode('');
                setErrorMsg('');
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{busy ? 'Disabling...' : 'Disable Authenticator'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
