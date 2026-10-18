import React, { useEffect, useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Smartphone,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useAuction } from '../../context/AuctionContext';

interface AdminOtpLoginProps {
  /** Called after both password and verification code are verified. */
  onSuccess: () => void;
  /** When true, renders a tighter layout for use inside a modal. */
  compact?: boolean;
}

/**
 * Two-step admin login:
 *   1. Enter the administrator password.
 *   2. Enter the one-time code — from the authenticator app when TOTP is
 *      enrolled (Google Authenticator / Authy / etc.), otherwise emailed.
 *      With no SMTP and no TOTP configured, the emailed code is shown on
 *      screen (dev mode).
 */
export const AdminOtpLogin: React.FC<AdminOtpLoginProps> = ({ onSuccess, compact = false }) => {
  const { requestAdminOtp, verifyAdminOtp } = useAuction();

  const [step, setStep] = useState<'password' | 'code'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devCode, setDevCode] = useState('');
  const [info, setInfo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  /** Whether the server has an authenticator app enrolled (affects step-1 hints). */
  const [totpEnrolled, setTotpEnrolled] = useState(false);
  /** Which second step this login actually uses. */
  const [method, setMethod] = useState<'totp' | 'email'>('email');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data && typeof data.totpEnrolled === 'boolean') {
          setTotpEnrolled(data.totpEnrolled);
        }
      })
      .catch(() => {
        /* Server unreachable (static/offline mode) — email flow is the fallback. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    if (!password.trim()) {
      setErrorMsg('Please enter the administrator password.');
      return;
    }
    setBusy(true);
    try {
      const result = await requestAdminOtp(password);
      if (!result.ok) {
        setErrorMsg(result.message || 'Could not start verification.');
        return;
      }
      setChallengeId(result.challengeId || '');
      setMaskedEmail(result.email || '');
      setDevCode(result.devCode || '');
      setInfo(result.message || '');
      setMethod(result.method === 'totp' ? 'totp' : 'email');
      setCode('');
      setStep('code');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    if (!code.trim()) {
      setErrorMsg(
        method === 'totp'
          ? 'Enter the 6-digit code from your authenticator app.'
          : 'Enter the 6-digit verification code.'
      );
      return;
    }
    setBusy(true);
    try {
      const result = await verifyAdminOtp(challengeId, code.trim());
      if (!result.ok) {
        setErrorMsg(result.message || 'Verification failed.');
        return;
      }
      setStep('password');
      setPassword('');
      setCode('');
      onSuccess();
    } finally {
      setBusy(false);
    }
  };

  const inputBase =
    'w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 outline-hidden transition-all bg-white';

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        <span className={`flex items-center gap-1.5 ${step === 'password' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'password' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
          Password
        </span>
        <span className="w-6 h-px bg-slate-300" />
        <span className={`flex items-center gap-1.5 ${step === 'code' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'code' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
          {step === 'code' && method === 'totp' ? 'App Code' : totpEnrolled ? 'App Code' : 'Email Code'}
        </span>
      </div>

      {step === 'password' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              Administrator Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter admin password"
                className={`${inputBase} font-mono`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
              {totpEnrolled ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                  Next you will enter the current 6-digit code from your authenticator app.
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  A one-time verification code will be emailed to the registered admin address.
                </>
              )}
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : totpEnrolled ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            <span>{busy ? 'Verifying password...' : totpEnrolled ? 'Continue to App Code' : 'Send Verification Code'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
              {method === 'totp' ? 'Code From Authenticator App' : 'Enter 6-Digit Verification Code'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                {method === 'totp' ? <Smartphone className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/[^0-9]/g, ''));
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="••••••"
                className={`${inputBase} tracking-[0.5em] font-mono text-center text-lg`}
              />
            </div>
            {method === 'totp' ? (
              <p className="mt-2 text-[11px] text-slate-500">
                Open Google Authenticator, Authy or a similar app — the code refreshes every 30 seconds.
                Lost your phone? A one-time backup code works here too.
              </p>
            ) : (
              maskedEmail && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Code sent to <strong className="text-slate-700">{maskedEmail}</strong>. It expires in 10 minutes.
                </p>
              )
            )}
          </div>

          {info && !devCode && method !== 'totp' && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] text-indigo-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {devCode && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Dev mode — email not sent
              </div>
              <p className="text-[11px]">
                SMTP is not configured on the server. Use this verification code:
              </p>
              <div className="font-mono font-black text-xl tracking-[0.3em] bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-center">
                {devCode}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setStep('password');
                setCode('');
                setErrorMsg('');
              }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            {method === 'email' && (
              <button
                type="button"
                onClick={sendCode}
                disabled={busy}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors disabled:opacity-60"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend</span>
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-['Outfit'] font-bold text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
            >
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              <span>{busy ? 'Verifying...' : 'Verify & Unlock'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
