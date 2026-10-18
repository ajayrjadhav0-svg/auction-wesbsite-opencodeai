import React from 'react';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { AdminOtpLogin } from './AdminOtpLogin';

interface AdminAccessGateProps {
  onUnlockSuccess?: () => void;
  onReturnToDashboard: () => void;
}

export const AdminAccessGate: React.FC<AdminAccessGateProps> = ({
  onUnlockSuccess,
  onReturnToDashboard,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-md p-6 sm:p-8 text-center space-y-6">
        {/* Lock / Shield Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
          <Shield className="w-8 h-8" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Lock className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Title and Explanation */}
        <div className="space-y-2">
          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-extrabold uppercase tracking-wider">
            RESTRICTED ACCESS
          </span>
          <h2 className="font-['Outfit'] font-black text-2xl text-slate-900 tracking-tight">
            ADMIN PANEL IS FOR ORGANIZERS ONLY
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Sign in with the administrator password, then complete the one-time verification step —
            an authenticator app code (when enrolled) or a code sent to the registered admin
            address — before access is granted.
          </p>
        </div>

        {/* Two-step verification form */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-left">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-700">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span>Two-Step Verification</span>
          </div>
          <AdminOtpLogin onSuccess={() => onUnlockSuccess && onUnlockSuccess()} />
        </div>

        {/* Return to Spectator Dashboard */}
        <div className="pt-2">
          <button
            onClick={onReturnToDashboard}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Spectator Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
