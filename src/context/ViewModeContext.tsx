import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * View mode lets a visitor choose between a purpose-built mobile layout and
 * the full desktop layout. Their choice is remembered on their own device.
 *
 * The two layouts share ALL auction logic (state, mutations, roles) via
 * `useAuction()` — only the presentation differs. That means behaviour can
 * never drift between them; only the look does.
 */

export type ViewLayout = 'mobile' | 'desktop';

/** 'auto' follows the screen size; an explicit choice always wins. */
export type ViewPreference = 'auto' | ViewLayout;

const STORAGE_KEY = 'cricket_auction_view_preference';

/** Below Tailwind's `lg` breakpoint the sidebar collapses, so treat that as "small screen". */
const SMALL_SCREEN_QUERY = '(max-width: 1023px)';

interface ViewModeContextValue {
  /** The layout actually being rendered right now. */
  layout: ViewLayout;
  /** The visitor's stored preference ('auto' = follow screen size). */
  preference: ViewPreference;
  /** True when we're following the screen size rather than an explicit choice. */
  isAuto: boolean;
  setPreference: (pref: ViewPreference) => void;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

function readStoredPreference(): ViewPreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'mobile' || raw === 'desktop' || raw === 'auto') return raw;
  } catch {
    // Storage unavailable (private mode / disabled) — fall back to auto.
  }
  return 'auto';
}

function querySmallScreen(): boolean {
  try {
    return window.matchMedia(SMALL_SCREEN_QUERY).matches;
  } catch {
    return window.innerWidth < 1024;
  }
}

export const ViewModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ViewPreference>(readStoredPreference);
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(querySmallScreen);

  // Track screen-size changes so 'auto' mode stays correct on resize / rotate.
  useEffect(() => {
    const mql = window.matchMedia(SMALL_SCREEN_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const setPreference = (pref: ViewPreference) => {
    setPreferenceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Ignore storage errors — the choice still applies for this session.
    }
  };

  const value = useMemo<ViewModeContextValue>(() => {
    const layout: ViewLayout = preference === 'auto' ? (isSmallScreen ? 'mobile' : 'desktop') : preference;
    return { layout, preference, isAuto: preference === 'auto', setPreference };
    // `setPreference` is stable enough (recreated per render but only used as a
    // setter); including it would recompute on every render for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference, isSmallScreen]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
};

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error('useViewMode must be used within a ViewModeProvider');
  return ctx;
}
