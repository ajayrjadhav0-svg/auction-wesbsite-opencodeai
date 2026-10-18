import { Player, Team, TournamentSettings, PlayerRole, AuctionTransaction } from './types';

export const DEFAULT_SETTINGS: TournamentSettings = {
  tournamentName: 'My Cricket League Auction',
  maxSquadSize: 15,
  maxAuctionPlayers: 15,
  iconPlayersCount: 0,
  iconCostPerPlayer: 0,
  startingPoints: 100000,
  auctionBudget: 100000,
  freePoints: 0,
  extraPointsAllowed: true,
  extraPointsPenaltyRate: 1, // 1 cash or penalty unit per point over budget
  minBidIncrement: 500,
  defaultReservePrice: 500,
};

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'mumbai-titans',
    name: 'MUMBAI TITANS',
    shortCode: 'MT',
    color: '#0284c7', // Sky Blue
    badgeBg: '#e0f2fe',
    badgeText: '#0369a1',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'delhi-strikers',
    name: 'DELHI STRIKERS',
    shortCode: 'DS',
    color: '#dc2626', // Red
    badgeBg: '#fee2e2',
    badgeText: '#b91c1c',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'chennai-royals',
    name: 'CHENNAI ROYALS',
    shortCode: 'CR',
    color: '#ca8a04', // Yellow / Gold
    badgeBg: '#fef9c3',
    badgeText: '#854d0e',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'bangalore-blasters',
    name: 'BANGALORE BLASTERS',
    shortCode: 'BB',
    color: '#059669', // Emerald
    badgeBg: '#d1fae5',
    badgeText: '#047857',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'kolkata-knights',
    name: 'KOLKATA KNIGHTS',
    shortCode: 'KK',
    color: '#7c3aed', // Purple
    badgeBg: '#ede9fe',
    badgeText: '#6d28d9',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'rajasthan-riders',
    name: 'RAJASTHAN RIDERS',
    shortCode: 'RR',
    color: '#db2777', // Pink
    badgeBg: '#fce7f3',
    badgeText: '#be185d',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'punjab-warriors',
    name: 'PUNJAB WARRIORS',
    shortCode: 'PW',
    color: '#ea580c', // Orange
    badgeBg: '#ffedd5',
    badgeText: '#c2410c',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
  {
    id: 'gujarat-gliders',
    name: 'GUJARAT GLIDERS',
    shortCode: 'GG',
    color: '#0d9488', // Teal
    badgeBg: '#ccfbf1',
    badgeText: '#0f766e',
    startingPoints: 100000,
    iconCost: 0,
    auctionBudget: 100000,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    totalPointsSpent: 0,
    pointsRemaining: 100000,
    maxSafeBid: 86000,
    committeeCash: 0,
    status: 'OK',
  },
];

// Players pool ready for any league auction - erased to 0 players ready for CSV upload
export const RAW_PLAYERS_LIST: {
  id: number;
  name: string;
  role: PlayerRole;
  village?: string;
}[] = [];

/**
 * Builds a Fresh Pre-Auction state ready for the live bidding day.
 * Zero players registered by default, ready for CSV upload or registration.
 */
export function buildFreshPreAuctionState(teamsList: Team[] = INITIAL_TEAMS): {
  teams: Team[];
  players: Player[];
  transactions: AuctionTransaction[];
} {
  const teams = teamsList.map(t => ({
    ...t,
    totalPlayers: 0,
    iconPlayersCount: 0,
    auctionPlayersCount: 0,
    iconCost: 0,
    auctionBudget: t.startingPoints || 100000,
    totalPointsSpent: 0,
    pointsRemaining: t.startingPoints || 100000,
    maxSafeBid: Math.max(0, (t.startingPoints || 100000) - (14 * 500)),
    committeeCash: 0,
    status: 'OK' as const,
  }));

  const players: Player[] = [];
  const transactions: AuctionTransaction[] = [];

  return { teams, players, transactions };
}

/**
 * Builds an official starter state
 */
export function buildOfficialAuctionState(): {
  teams: Team[];
  players: Player[];
  transactions: AuctionTransaction[];
} {
  return buildFreshPreAuctionState();
}

