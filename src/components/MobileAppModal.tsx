import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  ExternalLink,
  FileCode,
  Check,
  Share2,
  Copy,
  Info,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const { showNotification } = useAuction();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const appUrl = window.location.origin;
  const pwaBuilderUrl = `https://www.pwabuilder.com/?site=${encodeURIComponent(appUrl)}`;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        showNotification('success', 'Cricket Auction App installed successfully!');
      }
      setDeferredPrompt(null);
    } else {
      showNotification(
        'info',
        'On your Android phone: Open this page in Chrome, tap ⋮ (menu), and tap "Install app" or "Add to Home screen"!'
      );
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    showNotification('success', 'App link copied! Open this on your Android phone to install.');
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  const handleDownloadHTML = () => {
    window.location.href = '/api/export/html';
    showNotification('success', 'Downloading standalone offline HTML file...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/90 border border-indigo-400/40 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Outfit'] font-black text-lg text-white tracking-tight flex items-center gap-2">
                <span>Android App & APK File</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Install as a native app on your phone or get the standalone APK file
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-mobile-app-modal"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* METHOD 1: Instant 1-Tap Android App Install (Recommended) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white">
                  METHOD 1 (FASTEST & EASIEST)
                </span>
                <h4 className="font-['Outfit'] font-black text-slate-900 text-base mt-1.5">
                  1-Tap Native Android Install (WebAPK)
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  No APK file downloading or manual file management needed. Android will compile and install the application directly to your home screen with its own icon, splash screen, and offline support.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                id="btn-modal-install-now"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isInstalled ? 'App Installed!' : 'Install App Now'}</span>
              </button>

              <button
                onClick={handleCopyUrl}
                id="btn-modal-copy-phone-link"
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-['Outfit'] font-bold text-xs border border-emerald-300 flex items-center gap-1.5 transition-all"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedUrl ? 'Link Copied!' : 'Copy Phone Link'}</span>
              </button>
            </div>

            {/* Step-by-step for Android Chrome */}
            <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 text-[11px] text-slate-700 space-y-1">
              <span className="font-bold text-emerald-900 block">📱 How to install directly from your Android phone:</span>
              <p>1. Open this link on your phone in <strong>Google Chrome</strong>.</p>
              <p>2. Tap the <strong>3 vertical dots (⋮)</strong> in Chrome's top right corner.</p>
              <p>3. Tap <strong>"Install App"</strong> (or "Add to Home screen"). Android will install it immediately like a Play Store app!</p>
            </div>
          </div>

          {/* METHOD 2: Download Signed .APK File (PWABuilder) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                METHOD 2
              </span>
              <h4 className="font-['Outfit'] font-black text-slate-900 text-base mt-1.5">
                Download Standalone Android Package (.APK File)
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                If you need an actual physical <code>.apk</code> installer file to share over WhatsApp/Telegram or sideload via Android file manager:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                <span>Click the button below to open PWABuilder (Microsoft's official Android packaging service).</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                <span>Click <strong>"Package for Android"</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
                <span>Download your ready-to-install signed <strong>CricketAuction.apk</strong> file.</span>
              </div>
            </div>

            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              id="btn-modal-pwabuilder-apk"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs shadow-xs transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Generate & Download .APK File (PWABuilder)</span>
            </a>
          </div>

          {/* METHOD 3: Standalone Offline Single-File HTML */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <FileCode className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h5 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                  Standalone Offline HTML File (.html)
                </h5>
                <p className="text-xs text-slate-500">
                  Single file with all data embedded. Opens in any phone or PC browser 100% offline.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadHTML}
              id="btn-modal-download-html"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs shrink-0 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .HTML</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-['Outfit'] font-bold text-xs border border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
