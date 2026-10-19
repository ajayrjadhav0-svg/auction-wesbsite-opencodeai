import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  FullAuctionState,
  Player,
  Team,
  TournamentSettings,
  UserRole,
  AuctionTransaction,
  CreateNewAuctionConfig,
  ImportPlayerRow,
} from '../types';
import { DEFAULT_AUCTION_STATE } from '../data/defaultAuctionState';
import { PRESET_PLAYER_AVATARS } from '../data/presetAvatars';
import {
  clientPlaceBid,
  clientSellPlayer,
  clientMarkUnsold,
  clientReopenPlayer,
  clientNavigatePlayer,
  clientAddPlayer,
  clientUpdatePlayer,
  clientDeletePlayer,
  clientUpdateSettings,
  clientResetAuction,
  clientCreateNewAuction,
  recalculateAllTeams,
} from '../utils/clientAuctionEngine';
import { SoldPopup } from '../components/SoldPopup';
export interface AdminOtpStartResult {
  ok: boolean;
  message: string;
  challengeId?: string;
  email?: string;
  delivered?: boolean;
  devCode?: string;
  /** 'totp' = enter the code from the authenticator app; 'email' = emailed code. */
  method?: 'email' | 'totp';
}

export interface AdminOtpVerifyResult {
  ok: boolean;
  message: string;
}

interface AuctionContextType {
  state: FullAuctionState;
  loading: boolean;
  error: string | null;
  role: UserRole;
  setRole: (role: UserRole) => void;
  notification: { type: 'success' | 'error' | 'warning'; message: string } | null;
  clearNotification: () => void;
  showNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
  recentSale: { transaction: AuctionTransaction; team: Team | null } | null;
  clearRecentSale: () => void;
  refreshState: () => Promise<void>;
  placeBid: (playerId: number, teamId: string | null, amount: number) => Promise<void>;
  validateSale: (playerId: number, teamId: string, price: number) => Promise<{
    valid: boolean;
    error?: string;
    warning?: string;
    teamRemaining?: number;
    maxSafeBid?: number;
  }>;
  sellPlayer: (playerId: number, teamId: string, price: number, adminOverride?: boolean) => Promise<boolean>;
  markUnsold: (playerId: number) => Promise<boolean>;
  reopenPlayer: (playerId: number) => Promise<boolean>;
  navigatePlayer: (direction?: 'next' | 'prev', playerId?: number) => Promise<void>;
  selectAuctionPlayer: (playerId: number) => Promise<boolean>;
  addPlayer: (player: Partial<Player>) => Promise<boolean>;
  updatePlayer: (id: number, player: Partial<Player>) => Promise<boolean>;
  deletePlayer: (id: number) => Promise<boolean>;
  updateSettings: (settings: Partial<TournamentSettings>) => Promise<boolean>;
  addTeam: (team: Partial<Team>) => Promise<boolean>;
  updateTeam: (id: string, team: Partial<Team>) => Promise<boolean>;
  deleteTeam: (id: string) => Promise<boolean>;
  resetAuction: (mode: 'official' | 'pre-auction' | 'clear' | 'clear-players') => Promise<void>;
  createNewAuction: (config: CreateNewAuctionConfig) => Promise<boolean>;
  clearAllPlayers: () => Promise<boolean>;
  importPlayers: (players: any[]) => Promise<number>;
  importCSV: (csvText: string, replaceExisting?: boolean) => Promise<{ count: number; message: string } | null>;
  importPlayerRows: (
    rows: ImportPlayerRow[],
    replaceExisting?: boolean
  ) => Promise<{ count: number; message: string } | null>;
  getViewerShareUrl: () => string;
  requestAdminOtp: (password: string) => Promise<AdminOtpStartResult>;
  verifyAdminOtp: (challengeId: string, code: string) => Promise<AdminOtpVerifyResult>;
  logoutAdmin: () => void;
  saveFileAs: (fileName?: string) => Promise<{ success: boolean; fileName: string }>;
  seedDemoPlayersWithPhotos: () => Promise<boolean>;
}

const LOCAL_STORAGE_KEY = 'cricket_auction_state';
const ROLE_STORAGE_KEY = 'cricket_auction_role';
const ADMIN_TOKEN_KEY = 'cricket_auction_admin_token';
/** Password accepted when the Node server is unreachable (static hosting / offline). */
const LOCAL_ADMIN_PASSWORD = 'admin123';

const getInitialState = (): FullAuctionState => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.teams) && Array.isArray(parsed.players)) {
        // Erase old 80 sample players if present in localStorage
        if (parsed.players.length === 80 || (parsed.players.length > 0 && parsed.players[0]?.name === 'ROHIT SHARMA')) {
          parsed.players = [];
          parsed.transactions = [];
          if (parsed.bidding) {
            parsed.bidding.currentPlayerId = 0;
            parsed.bidding.bidHistory = [];
          }
          if (parsed.summary) {
            parsed.summary.totalPlayers = 0;
            parsed.summary.playersSold = 0;
            parsed.summary.playersAvailable = 0;
            parsed.summary.playersUnsold = 0;
          }
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read saved auction state from localStorage', e);
  }
  return DEFAULT_AUCTION_STATE;
};

const AuctionContext = createContext<AuctionContextType | undefined>(undefined);

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FullAuctionState>(getInitialState);
  const stateRef = useRef<FullAuctionState>(state);
  stateRef.current = state;

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRoleState] = useState<UserRole>('viewer');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [recentSale, setRecentSale] = useState<{ transaction: AuctionTransaction; team: Team | null } | null>(null);
  const localChallengesRef = useRef<Map<string, string>>(new Map());
  const prevTxIdsRef = useRef<Set<string>>(new Set());
  const txInitializedRef = useRef<boolean>(false);
  const initialFetchDoneRef = useRef<boolean>(false);
  const suppressSalePopupRef = useRef<boolean>(false);
  const saleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize state changes to localStorage
  const updateStateAndPersist = useCallback((newState: FullAuctionState) => {
    setState(newState);
    stateRef.current = newState;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.warn('Failed to persist to localStorage', err);
    }
  }, []);

  // Initialize role from localStorage only. URL ?role=admin is ignored on
  // page load — shared links must always open as spectator view. Admin
  // state lives in localStorage (set after successful TOTP verification).
  useEffect(() => {
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      const saved = localStorage.getItem(ROLE_STORAGE_KEY);
      if (saved === 'admin' && token) {
        setRoleState('admin');
      } else {
        setRoleState('viewer');
        localStorage.setItem(ROLE_STORAGE_KEY, 'viewer');
      }
    } catch {
      setRoleState('viewer');
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
      // Do NOT write role=admin into the URL — shared links must always open
      // as spectator view. Admin state lives only in localStorage.
      const url = new URL(window.location.href);
      url.searchParams.set('role', 'viewer');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  };

  const getViewerShareUrl = () => {
    try {
      const url = new URL(window.location.href);
      // Always force spectator/viewer role on shared links — never admin.
      url.searchParams.set('role', 'viewer');
      url.searchParams.delete('view');
      return url.toString();
    } catch {
      return window.location.href;
    }
  };

  const grantAdminRole = (message: string) => {
    setRoleState('admin');
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, 'admin');
      // Keep the URL clean (role=viewer) so shared links always open as spectator.
      const url = new URL(window.location.href);
      url.searchParams.set('role', 'viewer');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
    showNotification('success', message);
  };

  /**
   * Step 1 of admin two-step verification.
   * Sends the password to the server, which emails a one-time code to ADMIN_EMAIL.
   * Falls back to a local dev challenge when the server is unreachable (static hosting).
   */
  const requestAdminOtp = async (password: string, bypassCode?: string): Promise<AdminOtpStartResult> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, bypassCode }),
      });
      const data = await res.json();
      if (data && typeof data.ok === 'boolean') {
        return data as AdminOtpStartResult;
      }
    } catch {
      // Server unreachable — fall through to local dev verification.
    }

    // Local dev fallback (no Node server available).
    if ((password || '').trim() !== LOCAL_ADMIN_PASSWORD) {
      return { ok: false, message: 'Incorrect administrator password.' };
    }
    const challengeId = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const devCode = String(Math.floor(100000 + Math.random() * 900000));
    localChallengesRef.current.set(challengeId, devCode);
    return {
      ok: true,
      challengeId,
      email: 'local device (server offline)',
      delivered: false,
      devCode,
      message: 'Server offline — using local dev verification. Use the on-screen code.',
    };
  };

  /** Step 2 of admin two-step verification: check the emailed one-time code. */
  const verifyAdminOtp = async (challengeId: string, code: string): Promise<AdminOtpVerifyResult> => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code }),
      });
      const data = await res.json();
      if (data && typeof data.ok === 'boolean') {
        if (data.ok) {
          try {
            if (data.token) localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
          } catch {}
          grantAdminRole('Two-step verification complete. Welcome, Administrator!');
        }
        return { ok: data.ok, message: data.message };
      }
    } catch {
      // Server unreachable — fall through to local dev verification.
    }

    const expected = localChallengesRef.current.get(challengeId);
    if (!expected) {
      return { ok: false, message: 'Verification session expired. Please start again.' };
    }
    if ((code || '').trim() !== expected) {
      return { ok: false, message: 'Incorrect verification code.' };
    }
    localChallengesRef.current.delete(challengeId);
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, `local_${Date.now().toString(36)}`);
    } catch {}
    grantAdminRole('Verification complete. Welcome, Administrator!');
    return { ok: true, message: 'Verification complete.' };
  };

  const logoutAdmin = () => {
    setRoleState('viewer');
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, 'viewer');
      const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
      const url = new URL(window.location.href);
      url.searchParams.set('role', 'viewer');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
    showNotification('warning', 'Signed out of admin. Switched to Spectator Mode.');
  };

  const clearNotification = () => setNotification(null);

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const clearRecentSale = () => {
    if (saleTimerRef.current) {
      clearTimeout(saleTimerRef.current);
      saleTimerRef.current = null;
    }
    setRecentSale(null);
  };

  // Detect newly added auction transactions (player sold) and surface a popup.
  useEffect(() => {
    const txs = state.transactions || [];
    const ids = txs.map((t) => t.id);
    if (suppressSalePopupRef.current) {
      prevTxIdsRef.current = new Set(ids);
      suppressSalePopupRef.current = false;
      return;
    }
    if (!txInitializedRef.current || !initialFetchDoneRef.current) {
      prevTxIdsRef.current = new Set(ids);
      txInitializedRef.current = true;
      return;
    }
    const newIds = ids.filter((id) => !prevTxIdsRef.current.has(id));
    if (newIds.length > 0) {
      const newTx = txs.find((t) => newIds.includes(t.id)) || txs[0];
      const team = state.teams.find((t) => t.id === newTx.teamId) || null;
      setRecentSale({ transaction: newTx, team });
      if (saleTimerRef.current) clearTimeout(saleTimerRef.current);
      saleTimerRef.current = setTimeout(() => setRecentSale(null), 8000);
    }
    prevTxIdsRef.current = new Set(ids);
  }, [state.transactions, state.teams]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data: FullAuctionState = await res.json();
        if (data && Array.isArray(data.teams) && Array.isArray(data.players)) {
          updateStateAndPersist(data);
          setError(null);
          return;
        }
      }

      // If /api/state failed (e.g. running statically on Netlify without Node backend),
      // try loading public/myauctionkpl.json if localStorage was empty
      if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
        try {
          const staticRes = await fetch('/myauctionkpl.json');
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            if (staticData && Array.isArray(staticData.teams) && Array.isArray(staticData.players)) {
              updateStateAndPersist(staticData);
              setError(null);
              return;
            }
          }
        } catch {
          // Ignore static fallback error
        }
      }
    } catch (err: any) {
      // Running on Netlify or offline without server
      // State is already loaded from DEFAULT_AUCTION_STATE or localStorage!
      // Do not blank out the UI or crash.
    } finally {
      setLoading(false);
      if (!initialFetchDoneRef.current) {
        prevTxIdsRef.current = new Set((stateRef.current.transactions || []).map((t) => t.id));
        txInitializedRef.current = true;
        initialFetchDoneRef.current = true;
      }
    }
  }, [updateStateAndPersist]);

  // Real-time synchronization polling every 2.5 seconds
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2500);
    return () => clearInterval(interval);
  }, [fetchState]);

  const placeBid = async (playerId: number, teamId: string | null, amount: number) => {
    // Client-side immediate update
    const nextState = clientPlaceBid(stateRef.current, playerId, teamId, amount);
    updateStateAndPersist(nextState);

    // Try server update if available
    try {
      const res = await fetch('/api/auction/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teamId, amount }),
      });
      if (res.ok) {
        const updatedServerState = await res.json();
        if (updatedServerState && updatedServerState.teams) {
          updateStateAndPersist(updatedServerState);
        }
      }
    } catch {
      // Operating in client/Netlify mode
    }
  };

  const validateSale = async (playerId: number, teamId: string, price: number) => {
    try {
      const res = await fetch('/api/auction/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teamId, price }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to client validation
    }

    // Client-side validation
    const team = stateRef.current.teams.find((t) => t.id === teamId);
    if (!team) return { valid: false, error: 'Team not found' };

    const remainingSlots = Math.max(0, (stateRef.current.settings.maxSquadSize || 15) - team.totalPlayers);
    if (remainingSlots <= 0) {
      return { valid: false, error: `${team.name} already has maximum squad size (${stateRef.current.settings.maxSquadSize || 15} players).` };
    }

    const minIncrement = stateRef.current.settings.minBidIncrement || 500;
    const reserveNeeded = (remainingSlots - 1) * minIncrement;
    const maxSafe = Math.max(0, team.pointsRemaining - reserveNeeded);

    if (price > maxSafe) {
      return {
        valid: true,
        warning: `Bid of ${price.toLocaleString()} pts exceeds safe limit (${maxSafe.toLocaleString()} pts). Team may need penalty cash.`,
        teamRemaining: team.pointsRemaining,
        maxSafeBid: maxSafe,
      };
    }

    return {
      valid: true,
      teamRemaining: team.pointsRemaining,
      maxSafeBid: maxSafe,
    };
  };

  const sellPlayer = async (
    playerId: number,
    teamId: string,
    price: number,
    adminOverride: boolean = false
  ): Promise<boolean> => {
    // Client-side auction transaction execution
    const clientResult = clientSellPlayer(stateRef.current, playerId, teamId, price);
    if (!clientResult.success) {
      showNotification('error', clientResult.message);
      return false;
    }

    updateStateAndPersist(clientResult.state);
    showNotification('success', clientResult.message);

    // Sync to backend if available
    try {
      const res = await fetch('/api/auction/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, teamId, price, adminOverride }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          suppressSalePopupRef.current = true;
          updateStateAndPersist(data.state);
        }
      }
    } catch {
      // Client/Netlify mode
    }

    return true;
  };

  const markUnsold = async (playerId: number): Promise<boolean> => {
    const result = clientMarkUnsold(stateRef.current, playerId);
    if (result.success) {
      updateStateAndPersist(result.state);
      showNotification('warning', 'Player marked as UNSOLD (Pool 2 eligible)');
    }

    try {
      await fetch('/api/auction/unsold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch {}

    return true;
  };

  const reopenPlayer = async (playerId: number): Promise<boolean> => {
    const result = clientReopenPlayer(stateRef.current, playerId);
    if (result.success) {
      updateStateAndPersist(result.state);
      showNotification('success', result.message);
    }

    try {
      await fetch('/api/auction/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch {}

    return true;
  };

  const navigatePlayer = async (direction?: 'next' | 'prev', playerId?: number) => {
    const nextState = clientNavigatePlayer(stateRef.current, direction, playerId);
    updateStateAndPersist(nextState);

    try {
      await fetch('/api/auction/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, playerId }),
      });
    } catch {}
  };

  const selectAuctionPlayer = async (playerId: number): Promise<boolean> => {
    const nextState = clientNavigatePlayer(stateRef.current, undefined, playerId);
    updateStateAndPersist(nextState);

    try {
      await fetch('/api/auction/select-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch {}

    showNotification('success', 'Player brought to the auction hammer!');
    return true;
  };

  const addPlayer = async (playerData: Partial<Player>): Promise<boolean> => {
    const result = clientAddPlayer(stateRef.current, playerData);
    if (result.success) {
      updateStateAndPersist(result.state);
      showNotification('success', result.message);
    }

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          updateStateAndPersist(data.state);
        }
      }
    } catch {}

    return true;
  };

  const updatePlayer = async (id: number, playerData: Partial<Player>): Promise<boolean> => {
    const result = clientUpdatePlayer(stateRef.current, id, playerData);
    if (result.success) {
      updateStateAndPersist(result.state);
      showNotification('success', result.message);
    }

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          updateStateAndPersist(data.state);
        }
      }
    } catch {}

    return true;
  };

  const deletePlayer = async (id: number): Promise<boolean> => {
    const result = clientDeletePlayer(stateRef.current, id);
    if (result.success) {
      updateStateAndPersist(result.state);
      showNotification('success', result.message);
    }

    try {
      await fetch(`/api/players/${id}`, { method: 'DELETE' });
    } catch {}

    return true;
  };

  const updateSettings = async (settingsUpdates: Partial<TournamentSettings>): Promise<boolean> => {
    const nextState = clientUpdateSettings(stateRef.current, settingsUpdates);
    updateStateAndPersist(nextState);
    showNotification('success', 'Tournament settings updated successfully!');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsUpdates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          updateStateAndPersist(data.state);
        }
      }
    } catch (err) {
      console.warn('Could not sync settings to server', err);
    }

    return true;
  };

  const addTeam = async (teamData: Partial<Team>): Promise<boolean> => {
    const newId = teamData.name?.toLowerCase().replace(/\s+/g, '-') || `team-${Date.now()}`;
    const newTeam: Team = {
      id: newId,
      name: teamData.name || 'NEW TEAM',
      shortCode: teamData.shortCode || 'NT',
      color: teamData.color || '#4f46e5',
      badgeBg: '#e0e7ff',
      badgeText: '#3730a3',
      startingPoints: teamData.startingPoints || stateRef.current.settings.startingPoints || 100000,
      iconCost: 0,
      auctionBudget: teamData.startingPoints || stateRef.current.settings.startingPoints || 100000,
      totalPlayers: 0,
      iconPlayersCount: 0,
      auctionPlayersCount: 0,
      totalPointsSpent: 0,
      pointsRemaining: teamData.startingPoints || stateRef.current.settings.startingPoints || 100000,
      maxSafeBid: (teamData.startingPoints || 100000) - (14 * 500),
      committeeCash: 0,
      status: 'OK',
    };

    const updatedTeams = [...stateRef.current.teams, newTeam];
    const { updatedTeams: recalculated, summary } = recalculateAllTeams(updatedTeams, stateRef.current.players, stateRef.current.settings);

    updateStateAndPersist({
      ...stateRef.current,
      teams: recalculated,
      summary,
    });

    showNotification('success', `Team ${newTeam.name} created!`);

    try {
      await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });
    } catch {}

    return true;
  };

  const updateTeam = async (id: string, teamData: Partial<Team>): Promise<boolean> => {
    const updatedTeams = stateRef.current.teams.map((t) => (t.id === id ? { ...t, ...teamData } : t));
    const { updatedTeams: recalculated, summary } = recalculateAllTeams(updatedTeams, stateRef.current.players, stateRef.current.settings);

    updateStateAndPersist({
      ...stateRef.current,
      teams: recalculated,
      summary,
    });

    showNotification('success', 'Team updated successfully!');

    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          updateStateAndPersist(data.state);
        }
      }
    } catch (err) {
      console.warn('Could not sync team update to server', err);
    }

    return true;
  };

  const deleteTeam = async (id: string): Promise<boolean> => {
    const updatedTeams = stateRef.current.teams.filter((t) => t.id !== id);
    const updatedPlayers = stateRef.current.players.map((p) =>
      p.soldToTeamId === id ? { ...p, status: 'AVAILABLE' as const, soldToTeamId: null, soldPrice: 0 } : p
    );
    const { updatedTeams: recalculated, summary } = recalculateAllTeams(updatedTeams, updatedPlayers, stateRef.current.settings);

    updateStateAndPersist({
      ...stateRef.current,
      teams: recalculated,
      players: updatedPlayers,
      summary,
    });

    showNotification('success', 'Team deleted successfully');

    try {
      await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    } catch {}

    return true;
  };

  const resetAuction = async (mode: 'official' | 'pre-auction' | 'clear' | 'clear-players') => {
    if (mode === 'clear-players') {
      await clearAllPlayers();
      return;
    }
    suppressSalePopupRef.current = true;
    const nextState = clientResetAuction(stateRef.current, mode);
    updateStateAndPersist(nextState);
    showNotification('success', `Reset auction to ${mode} mode.`);

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
    } catch {}
  };

  const createNewAuction = async (config: CreateNewAuctionConfig): Promise<boolean> => {
    // 1. Compute new atomic state client-side immediately
    suppressSalePopupRef.current = true;
    const nextState = clientCreateNewAuction(stateRef.current, config);
    updateStateAndPersist(nextState);
    showNotification('success', `New auction "${config.tournamentName}" created successfully!`);

    // 2. Persist to server if available
    try {
      const res = await fetch('/api/auction/create-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.state) {
          updateStateAndPersist(data.state);
        }
      }
    } catch {
      // Client mode operates standalone
    }

    return true;
  };

  const clearAllPlayers = async (): Promise<boolean> => {
    try {
      await fetch('/api/players/clear', { method: 'POST' });
    } catch {}

    const updatedTeams = stateRef.current.teams.map((t) => ({
      ...t,
      totalPlayers: 0,
      iconPlayersCount: 0,
      auctionPlayersCount: 0,
      totalPointsSpent: 0,
      pointsRemaining: t.startingPoints || 100000,
      maxSafeBid: (t.startingPoints || 100000) - ((stateRef.current.settings.maxSquadSize - 1) * 500),
    }));

    suppressSalePopupRef.current = true;
    const nextState: FullAuctionState = {
      ...stateRef.current,
      players: [],
      transactions: [],
      teams: updatedTeams,
      bidding: {
        currentPlayerId: 0,
        currentBid: stateRef.current.settings.defaultReservePrice || 500,
        selectedTeamId: stateRef.current.teams[0]?.id || null,
        isActive: false,
        bidHistory: [],
      },
      summary: {
        totalPlayers: 0,
        playersSold: 0,
        playersAvailable: 0,
        playersUnsold: 0,
        totalAuctionPointsSpent: 0,
        totalCommitteeCash: 0,
        auctionProgressPct: 0,
        completedTeamsCount: 0,
      },
    };

    updateStateAndPersist(nextState);
    showNotification('success', 'All 80 players and data erased successfully!');
    return true;
  };

  const importCSV = async (csvText: string, replaceExisting: boolean = false) => {
    try {
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, replaceExisting }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) updateStateAndPersist(data.state);
        showNotification('success', data.message);
        return { count: data.count, message: data.message };
      }
    } catch {}

    // Client-side CSV parser fallback
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      showNotification('error', 'CSV file appears empty');
      return null;
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    let startIndex = 0;
    let idCol = -1;
    let nameCol = -1;
    let roleCol = -1;
    let villageCol = -1;

    const firstParts = parseLine(lines[0]);
    const lowerFirst = firstParts.map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const isHeader = lowerFirst.some((h) =>
      ['id', 'srno', 'sr', 'name', 'playername', 'player', 'role', 'village', 'city', 'town'].includes(h)
    );

    if (isHeader) {
      startIndex = 1;
      lowerFirst.forEach((h, idx) => {
        if (h === 'id' || h === 'srno' || h === 'sr' || h === 'no' || h === 'slno') idCol = idx;
        else if (h.includes('name') || h.includes('player')) nameCol = idx;
        else if (h.includes('role')) roleCol = idx;
        else if (h.includes('village') || h.includes('city') || h.includes('town')) villageCol = idx;
      });
    }

    if (nameCol === -1) {
      if (firstParts.length >= 4) {
        idCol = 0;
        nameCol = 1;
        roleCol = 2;
        villageCol = 3;
      } else if (firstParts.length === 3) {
        const firstIsNum = /^\d+$/.test(firstParts[0].replace(/\D/g, ''));
        if (firstIsNum) {
          idCol = 0;
          nameCol = 1;
          roleCol = 2;
        } else {
          nameCol = 0;
          roleCol = 1;
          villageCol = 2;
        }
      } else if (firstParts.length === 2) {
        nameCol = 0;
        roleCol = 1;
      } else {
        nameCol = 0;
      }
    }

    let parsedCount = 0;
    const newPlayersList: Player[] = replaceExisting ? [] : [...stateRef.current.players];
    let currentMaxId = replaceExisting ? 0 : newPlayersList.reduce((max, p) => Math.max(max, p.id || 0), 0);

    for (let i = startIndex; i < lines.length; i++) {
      const parts = parseLine(lines[i]);
      if (parts.length === 0 || !parts.some((p) => p.length > 0)) continue;

      const rawName = nameCol >= 0 && parts[nameCol] ? parts[nameCol] : '';
      if (!rawName.trim()) continue;

      let customId: number | null = null;
      if (idCol >= 0 && parts[idCol]) {
        const numOnly = parts[idCol].replace(/[^0-9]/g, '');
        if (numOnly) {
          const parsed = parseInt(numOnly, 10);
          if (!isNaN(parsed) && parsed > 0) customId = parsed;
        }
      }

      const assignedId = customId !== null ? customId : ++currentMaxId;
      const rawRole = roleCol >= 0 && parts[roleCol] ? parts[roleCol] : 'All-Rounder';
      let role: Player['role'] = 'All-Rounder';
      const rLower = rawRole.toLowerCase();
      if (rLower.includes('bat')) role = 'Batsman';
      else if (rLower.includes('bowl')) role = 'Bowler';
      else if (rLower.includes('keeper') || rLower.includes('wk') || rLower.includes('wick')) role = 'Wicket-Keeper';

      const village = villageCol >= 0 && parts[villageCol] ? parts[villageCol].trim() : '';

      newPlayersList.push({
        id: assignedId,
        code: `P${assignedId.toString().padStart(3, '0')}`,
        name: rawName.trim().toUpperCase(),
        role,
        auctionOrder: assignedId,
        status: 'AVAILABLE',
        soldToTeamId: null,
        soldPrice: 0,
        isIcon: false,
        srNo: assignedId,
        village,
      });
      parsedCount++;
    }

    // Sort by id
    newPlayersList.sort((a, b) => a.id - b.id);

    const { updatedTeams, summary } = recalculateAllTeams(stateRef.current.teams, newPlayersList, stateRef.current.settings);
    updateStateAndPersist({
      ...stateRef.current,
      players: newPlayersList,
      teams: updatedTeams,
      summary,
      bidding: {
        ...stateRef.current.bidding,
        currentPlayerId: newPlayersList[0]?.id || 0,
        isActive: Boolean(newPlayersList[0]),
      },
    });

    showNotification('success', `Imported ${parsedCount} players from CSV (ID, Name, Role, Village)!`);
    return { count: parsedCount, message: `Imported ${parsedCount} players` };
  };

  const importPlayerRows = async (
    rows: ImportPlayerRow[],
    replaceExisting: boolean = false
  ): Promise<{ count: number; message: string } | null> => {
    if (replaceExisting) suppressSalePopupRef.current = true;
    const payload = (rows || [])
      .filter((r) => r && r.name && r.name.trim().length > 0)
      .map((r) => ({
        id: r.id ?? undefined,
        srNo: r.srNo ?? undefined,
        name: r.name.trim().toUpperCase(),
        role: r.role,
        village: (r.village || '').trim(),
        basePrice:
          r.basePrice !== undefined && String(r.basePrice).trim() !== ''
            ? Number(String(r.basePrice).replace(/[^0-9]/g, '')) || undefined
            : undefined,
        photoUrl: (r.photoUrl || '').trim() || undefined,
        photo: (r.photoUrl || '').trim() || undefined,
      }));

    if (payload.length === 0) {
      showNotification('error', 'Add at least one player with a name before importing.');
      return null;
    }

    // Try the server first (persists to disk + regenerates exports)
    try {
      const res = await fetch('/api/import/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: payload, replaceExisting }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) updateStateAndPersist(data.state);
        showNotification('success', data.message);
        return { count: data.count, message: data.message };
      }
    } catch {
      // Fall through to client-side import
    }

    // Client-side fallback — same upsert-by-id semantics as the server:
    // an existing player's metadata is updated, auction history preserved.
    const baseList = replaceExisting ? [] : [...stateRef.current.players];
    let runningMaxId = baseList.reduce((max, p) => Math.max(max, p.id || 0), 0);
    let runningMaxSr = baseList.reduce((max, p) => Math.max(max, p.srNo || p.id || 0), 0);
    const byId = new Map<number, Player>(baseList.map((p) => [p.id, p]));

    payload.forEach((row) => {
      const id = row.id && row.id > 0 ? row.id : ++runningMaxId;
      const srNo = row.srNo && row.srNo > 0 ? row.srNo : ++runningMaxSr;
      const photo = (row.photoUrl || '').trim();

      const existing = byId.get(id);
      if (existing) {
        existing.name = row.name;
        existing.role = row.role as Player['role'];
        existing.village = row.village;
        existing.srNo = srNo;
        existing.auctionOrder = srNo;
        if (row.basePrice !== undefined) existing.basePrice = row.basePrice;
        if (photo) {
          existing.photoUrl = photo;
          existing.photo = photo;
        }
        return;
      }

      byId.set(id, {
        id,
        code: `P${id.toString().padStart(3, '0')}`,
        name: row.name,
        role: row.role as Player['role'],
        auctionOrder: srNo,
        status: 'AVAILABLE',
        soldToTeamId: null,
        soldPrice: 0,
        isIcon: false,
        srNo,
        village: row.village,
        basePrice: row.basePrice,
        photoUrl: photo || undefined,
        photo: photo || undefined,
      });
    });

    const mergedPlayers = [...byId.values()].sort(
      (a, b) => (a.srNo || a.id) - (b.srNo || b.id)
    );
    const { updatedTeams, summary } = recalculateAllTeams(
      stateRef.current.teams,
      mergedPlayers,
      stateRef.current.settings
    );
    const firstAvailable = mergedPlayers[0];

    updateStateAndPersist({
      ...stateRef.current,
      players: mergedPlayers,
      teams: updatedTeams,
      transactions: replaceExisting ? [] : stateRef.current.transactions,
      summary,
      bidding: {
        ...stateRef.current.bidding,
        currentPlayerId: firstAvailable ? firstAvailable.id : 0,
        currentBid: stateRef.current.settings.defaultReservePrice || 500,
        isActive: Boolean(firstAvailable),
      },
    });

    const message = `Imported ${payload.length} player${payload.length === 1 ? '' : 's'} with photos & edits.`;
    showNotification('success', message);
    return { count: payload.length, message };
  };

  const importPlayers = async (playersList: any[]): Promise<number> => {
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: playersList }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) updateStateAndPersist(data.state);
        showNotification('success', data.message);
        return 1;
      }
    } catch {}

    return 0;
  };

  const saveFileAs = async (fileName: string = 'myauctionkpl'): Promise<{ success: boolean; fileName: string }> => {
    const clean = fileName.replace(/[^a-zA-Z0-9_-]/g, '').trim() || 'myauctionkpl';

    // Persist to localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateRef.current));
    } catch {}

    // Attempt server save
    try {
      const res = await fetch('/api/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        showNotification('success', `Saved auction database as ${data.fileName}!`);
        return { success: true, fileName: data.fileName };
      }
    } catch {}

    // Fallback: trigger direct client download
    try {
      const jsonContent = JSON.stringify(stateRef.current, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${clean}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('success', `Exported and saved ${clean}.json!`);
      return { success: true, fileName: `${clean}.json` };
    } catch (err: any) {
      showNotification('error', 'Failed to save file: ' + err.message);
      return { success: false, fileName: `${clean}.json` };
    }
  };

  const seedDemoPlayersWithPhotos = async (): Promise<boolean> => {
    const sampleNames = [
      { name: 'VIRAT SHARMA', role: 'Batsman' as const, village: 'DELHI', avatarId: 'jersey-18' },
      { name: 'ROHIT VERMA', role: 'Batsman' as const, village: 'MUMBAI', avatarId: 'batsman-pro' },
      { name: 'JASPRIT YADAV', role: 'Bowler' as const, village: 'GUJARAT', avatarId: 'bowler-pace' },
      { name: 'HARDIK PATEL', role: 'All-Rounder' as const, village: 'BARODA', avatarId: 'allrounder-captain' },
      { name: 'MS RATHOD', role: 'Wicket-Keeper' as const, village: 'RANCHI', avatarId: 'jersey-7' },
      { name: 'RAVINDRA JADEJA', role: 'All-Rounder' as const, village: 'RAJKOT', avatarId: 'allrounder-captain' },
      { name: 'MOHAMMED SHAMI', role: 'Bowler' as const, village: 'AMROHA', avatarId: 'bowler-pace' },
      { name: 'RISHABH PANT', role: 'Wicket-Keeper' as const, village: 'ROORKEE', avatarId: 'keeper-glove' },
    ];

    const demoPlayers: Player[] = sampleNames.map((item, idx) => {
      const id = idx + 1;
      const avatar =
        PRESET_PLAYER_AVATARS.find((a) => a.id === item.avatarId) ||
        PRESET_PLAYER_AVATARS[idx % PRESET_PLAYER_AVATARS.length];
      return {
        id,
        code: `P${id.toString().padStart(3, '0')}`,
        name: item.name,
        role: item.role,
        auctionOrder: id,
        status: 'AVAILABLE',
        soldToTeamId: null,
        soldPrice: 0,
        isIcon: false,
        srNo: id,
        village: item.village,
        photoUrl: avatar.dataUri,
        photo: avatar.dataUri,
      };
    });

    const { updatedTeams, summary } = recalculateAllTeams(
      stateRef.current.teams,
      demoPlayers,
      stateRef.current.settings
    );

    const nextState: FullAuctionState = {
      ...stateRef.current,
      players: demoPlayers,
      teams: updatedTeams,
      transactions: [],
      summary,
      bidding: {
        currentPlayerId: demoPlayers[0]?.id || 1,
        currentBid: stateRef.current.settings.defaultReservePrice || 500,
        selectedTeamId: updatedTeams[0]?.id || null,
        isActive: true,
        bidHistory: [],
      },
    };

    updateStateAndPersist(nextState);
    showNotification('success', 'Loaded 8 players with photos into the auction pool!');

    try {
      await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: demoPlayers }),
      });
    } catch {}

    return true;
  };

  return (
    <AuctionContext.Provider
      value={{
        state,
        loading,
        error,
        role,
        setRole,
        notification,
        clearNotification,
        showNotification,
        recentSale,
        clearRecentSale,
        refreshState: fetchState,
        placeBid,
        validateSale,
        sellPlayer,
        markUnsold,
        reopenPlayer,
        navigatePlayer,
        selectAuctionPlayer,
        addPlayer,
        updatePlayer,
        deletePlayer,
        updateSettings,
        addTeam,
        updateTeam,
        deleteTeam,
        resetAuction,
        createNewAuction,
        clearAllPlayers,
        importPlayers,
        importCSV,
        importPlayerRows,
        getViewerShareUrl,
        requestAdminOtp,
        verifyAdminOtp,
        logoutAdmin,
        saveFileAs,
        seedDemoPlayersWithPhotos,
      }}
    >
      {children}
      {recentSale && <SoldPopup recentSale={recentSale} onClose={clearRecentSale} />}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};
