export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';

export type PlayerStatus = 'AVAILABLE' | 'SOLD' | 'UNSOLD' | 'ICON';

export interface Player {
  id: number;
  code: string; // e.g. "P001"
  name: string;
  role: PlayerRole;
  auctionOrder: number;
  status: PlayerStatus;
  soldToTeamId: string | null;
  soldPrice: number;
  isIcon: boolean;
  soldAt?: string;
  srNo?: number;
  village?: string;
  basePrice?: number;
  photoUrl?: string;
  photo?: string;
}

export interface Team {
  id: string; // e.g. "poonam-star"
  name: string; // Exact: "POONAM STAR"
  shortCode: string; // "PS"
  color: string;
  badgeBg: string;
  badgeText: string;
  startingPoints: number; // 100,000
  iconCost: number; // 30,000
  auctionBudget: number; // 70,000
  totalPlayers: number; // max 15
  iconPlayersCount: number; // 2
  auctionPlayersCount: number; // max 13
  totalPointsSpent: number;
  pointsRemaining: number;
  maxSafeBid: number;
  committeeCash: number; // ₹ charged for spending above 70,000
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
  isIcon: boolean;
}

export interface LiveBiddingState {
  currentPlayerId: number;
  currentBid: number;
  selectedTeamId: string | null;
  isActive: boolean;
  bidHistory: { teamId: string; amount: number; timestamp: string }[];
}

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
