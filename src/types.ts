export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export type PlayerStatus = 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'ICON';

export interface Player {
  id: number;
  code: string;
  name: string;
  role: PlayerRole;
  auctionOrder: number;
  status: PlayerStatus;
  soldToTeamId: string | null;
  soldPrice: number;
  isIcon?: boolean;
  soldAt?: string;
  srNo?: number;
  village?: string;
  basePrice?: number;
  photoUrl?: string;
  photo?: string;
}

export interface Team {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  startingPoints: number;
  iconCost: number;
  auctionBudget: number;
  totalPlayers: number;
  iconPlayersCount: number;
  auctionPlayersCount: number;
  totalPointsSpent: number;
  pointsRemaining: number;
  maxSafeBid: number;
  committeeCash: number;
  status: 'OK' | 'FULL' | 'OVER POINTS' | 'OVER 13 PLAYERS';
}

export interface AuctionTransaction {
  id: string;
  timestamp: string;
  auctionOrder: number;
  playerId: number;
  playerName: string;
  role: PlayerRole;
  teamId: string;
  teamName: string;
  soldPrice: number;
  committeeCharge: number;
}

export interface LiveBiddingState {
  currentPlayerId: number;
  currentBid: number;
  selectedTeamId: string | null;
  isActive: boolean;
  bidHistory: { teamId: string; amount: number; timestamp: string }[];
}

export type UserRole = 'admin' | 'viewer';

export interface TournamentSettings {
  tournamentName: string;
  tournamentLogo?: string;
  maxSquadSize: number;
  maxAuctionPlayers: number;
  iconPlayersCount: number;
  iconCostPerPlayer: number;
  startingPoints: number;
  auctionBudget: number;
  freePoints: number;
  extraPointsAllowed: boolean;
  extraPointsPenaltyRate: number;
  minBidIncrement: number;
  defaultReservePrice: number;
}

export interface DashboardSummary {
  totalPlayers: number;
  playersSold: number;
  playersAvailable: number;
  playersUnsold: number;
  totalAuctionPointsSpent: number;
  totalCommitteeCash: number;
  auctionProgressPct: number;
  completedTeamsCount: number;
}

export interface FullAuctionState {
  settings: TournamentSettings;
  teams: Team[];
  players: Player[];
  transactions: AuctionTransaction[];
  bidding: LiveBiddingState;
  summary: DashboardSummary;
}

export type ActiveNav =
  | 'dashboard'
  | 'live-auction'
  | 'players'
  | 'teams'
  | 'team-squads'
  | 'auction-history'
  | 'analytics'
  | 'admin'
  | 'settings'
  | 'register';

export type PlayerPoolResetMode = 'reset-available' | 'empty' | 'demo' | 'keep-current';

/** A single editable row in the admin bulk player import table. */
export interface ImportPlayerRow {
  /** Local-only key used by React (never persisted). */
  key: string;
  id: number | null;
  srNo: number | null;
  name: string;
  role: PlayerRole;
  village: string;
  basePrice: string;
  /** Data URI (uploaded/compressed) or remote image URL. */
  photoUrl: string;
  /** Marks rows parsed from a CSV so we can highlight them. */
  fromCsv?: boolean;
  /** Filename hint extracted when photo column is not a usable URL. */
  photoHint?: string;
}

export interface CreateNewAuctionConfig {
  tournamentName: string;
  tournamentLogo?: string;
  startingPoints: number;
  maxSquadSize: number;
  defaultReservePrice: number;
  minBidIncrement?: number;
  teams: Array<{
    id?: string;
    name: string;
    shortCode: string;
    color: string;
    badgeBg?: string;
    badgeText?: string;
  }>;
  playerPoolMode: PlayerPoolResetMode;
}
