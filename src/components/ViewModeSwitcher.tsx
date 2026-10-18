import React from 'react';
import { Monitor, Smartphone, Sparkles } from 'lucide-react';
import { useViewMode, ViewPreference } from '../context/ViewModeContext';

interface ViewModeSwitcherProps {
  /** 'segmented' shows all three options inline; 'compact' shows a single toggle button. */
  variant?: 'segmented' | 'compact';
}

/**
 * Lets the visitor pick which layout they want: follow the screen size (auto),
 * always use the mobile layout, or always use the desktop layout. Their choice
 * is saved on their own device.
 */
export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({ variant = 'segmented' }) => {
  const { preference, setPreference } = useViewMode();

  const options: { value: ViewPreference; label: string; icon: React.ReactNode; title: string }[] = [
    { value: 'auto', label: 'Auto', icon: <Sparkles className="w-3.5 h-3.5" />, title: 'Follow screen size automatically' },
    { value: 'mobile', label: 'Mobile', icon: <Smartphone className="w-3.5 h-3.5" />, title: 'Always use the mobile layout' },
    { value: 'desktop', label: 'Desktop', icon: <Monitor className="w-3.5 h-3.5" />, title: 'Always use the desktop layout' },
  ];

  if (variant === 'compact') {
    // Single cycling button: Auto → Mobile → Desktop → Auto …
    const next: Record<ViewPreference, ViewPreference> = { auto: 'mobile', mobile: 'desktop', desktop: 'auto' };
    const current = options.find((o) => o.value === preference)!;
    return (
      <button
        id="btn-view-mode-cycle"
        onClick={() => setPreference(next[preference])}
        title={`View mode: ${current.label}. Tap to change.`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
      >
        {current.icon}
        <span className="hidden sm:inline">{current.label}</span>
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Choose view mode"
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200"
    >
      {options.map((opt) => {
        const isActive = preference === opt.value;
        return (
          <button
            key={opt.value}
            id={`btn-view-mode-${opt.value}`}
            onClick={() => setPreference(opt.value)}
            title={opt.title}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
