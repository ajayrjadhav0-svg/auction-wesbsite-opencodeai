import React from 'react';
import { Shield, X, Lock } from 'lucide-react';
import { AdminOtpLogin } from './AdminOtpLogin';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-extrabold text-lg text-slate-900 leading-tight">
                Admin Authentication
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Password + authenticator app code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security notice */}
        <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
          <Lock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <span>
            This panel controls the whole tournament. Access requires the administrator password and
            a one-time code from your authenticator app (Google Authenticator, Authy, etc.).
          </span>
        </div>

        <AdminOtpLogin
          compact
          onSuccess={() => {
            onClose();
            if (onSuccess) onSuccess();
          }}
        />
      </div>
    </div>
  );
};
