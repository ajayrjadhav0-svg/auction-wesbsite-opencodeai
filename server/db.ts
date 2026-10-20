import fs from 'fs';
import path from 'path';
import {
  FullAuctionState,
  Player,
  PlayerRole,
  Team,
  AuctionTransaction,
  TournamentSettings,
  DashboardSummary,
  LiveBiddingState,
} from './types';
import {
  DEFAULT_SETTINGS,
  buildFreshPreAuctionState,
  buildOfficialAuctionState,
  INITIAL_TEAMS,
  RAW_PLAYERS_LIST,
} from './seedData';
import { generateStandaloneAuctionHTML } from './htmlGenerator';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cricket_auction_database.json');
const KPL_DB_FILE = path.join(DATA_DIR, 'myauctionkpl.json');
const ROOT_KPL_FILE = path.join(process.cwd(), 'myauctionkpl.json');

class AuctionDatabase {
  private state: FullAuctionState;

  constructor() {
    this.ensureDataDir();
    this.state = this.loadFromDisk();
    // Guarantee myauctionkpl.json is initially saved immediately
    this.saveToDisk();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromDisk(): FullAuctionState {
    const fileToLoad = fs.existsSync(DB_FILE)
      ? DB_FILE
      : fs.existsSync(KPL_DB_FILE)
      ? KPL_DB_FILE
      : fs.existsSync(ROOT_KPL_FILE)
      ? ROOT_KPL_FILE
      : null;

    if (fileToLoad) {
      try {
        const raw = fs.readFileSync(fileToLoad, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.teams && parsed.players) {
          let needsSave = false;

          // Erase old 80 sample players if present
          if (parsed.players.length === 80 || (parsed.players.length > 0 && parsed.players[0]?.name?.includes('ROHIT SHARMA'))) {
            parsed.players = [];
            parsed.transactions = [];
            if (parsed.bidding) {
              parsed.bidding.currentPlayerId = 0;
              parsed.bidding.bidHistory = [];
            }
            needsSave = true;
          }

          parsed.players.forEach((p: any) => {
            if (!p.srNo) {
              p.srNo = p.auctionOrder || p.id;
              needsSave = true;
            }
            if (p.village === undefined) {
              p.village = '';
              needsSave = true;
            }
            if (p.isIcon || p.status === 'ICON') {
              p.isIcon = false;
              if (p.status === 'ICON') {
                p.status = 'AVAILABLE';
                p.soldToTeamId = null;
                p.soldPrice = 0;
              }
              needsSave = true;
            }
          });

          // Remove pre-allocated icon transactions and strip legacy fields
          if (parsed.transactions) {
            const originalLength = parsed.transactions.length;
            parsed.transactions = parsed.transactions.filter((t: AuctionTransaction) => !t.isIcon && t.timestamp !== 'Pre-Auction Allocation');
            parsed.transactions.forEach((t: any) => {
              if (t.village) {
                delete t.village;
                needsSave = true;
              }
              // Normalize role, soldPrice, and teamName
              if (!t.role && t.playerRole) {
                t.role = t.playerRole;
                needsSave = true;
              }
              if (t.soldPrice === undefined && (t.amount !== undefined || t.points !== undefined)) {
                t.soldPrice = t.amount ?? t.points ?? 0;
                needsSave = true;
              }
              if (!t.teamName && t.teamId) {
                const team = parsed.teams.find((tm: any) => tm.id === t.teamId);
                if (team) {
                  t.teamName = team.name;
                  needsSave = true;
                }
              }
            });
            if (parsed.transactions.length !== originalLength) needsSave = true;
          } else {
            parsed.transactions = [];
            needsSave = true;
          }

          // Ensure any SOLD player has a corresponding transaction
          const existingTxPlayerIds = new Set(parsed.transactions.map((t: any) => t.playerId));
          const soldPlayers = parsed.players.filter((p: any) => p.status === 'SOLD');
          soldPlayers.forEach((p: any) => {
            if (!existingTxPlayerIds.has(p.id)) {
              const team = parsed.teams.find((t: any) => t.id === p.soldToTeamId);
              parsed.transactions.push({
                id: `tx-backfill-${p.id}`,
                timestamp: p.soldAt || new Date().toISOString(),
                auctionOrder: p.auctionOrder || parsed.transactions.length + 1,
                playerId: p.id,
                playerName: p.name,
                role: p.role,
                teamId: p.soldToTeamId || '',
                teamName: team?.name || 'Franchise Team',
                soldPrice: p.soldPrice || 0,
                committeeCharge: 0,
                isIcon: false,
              });
              needsSave = true;
            }
          });

          if (parsed.settings) {
            if (parsed.settings.maxVillageLimit !== undefined) {
              delete parsed.settings.maxVillageLimit;
              needsSave = true;
            }
            if (parsed.settings.allowVillageOverride !== undefined) {
              delete parsed.settings.allowVillageOverride;
              needsSave = true;
            }
            // Only fill in missing values — never overwrite admin-chosen settings.
            if (typeof parsed.settings.iconPlayersCount !== 'number') {
              parsed.settings.iconPlayersCount = 0;
              needsSave = true;
            }
            if (typeof parsed.settings.iconCostPerPlayer !== 'number') {
              parsed.settings.iconCostPerPlayer = 0;
              needsSave = true;
            }
            if (typeof parsed.settings.maxAuctionPlayers !== 'number' || parsed.settings.maxAuctionPlayers <= 0) {
              parsed.settings.maxAuctionPlayers = parsed.settings.maxSquadSize || 15;
              needsSave = true;
            }
            if (typeof parsed.settings.auctionBudget !== 'number' || parsed.settings.auctionBudget <= 0) {
              parsed.settings.auctionBudget = parsed.settings.startingPoints || 100000;
              needsSave = true;
            }
            if (typeof parsed.settings.minBidIncrement !== 'number' || parsed.settings.minBidIncrement <= 0) {
              parsed.settings.minBidIncrement = 500;
              needsSave = true;
            }
            if (typeof parsed.settings.defaultReservePrice !== 'number' || parsed.settings.defaultReservePrice <= 0) {
              parsed.settings.defaultReservePrice = 500;
              needsSave = true;
            }
            if (typeof parsed.settings.freePoints !== 'number') {
              parsed.settings.freePoints = 0;
              needsSave = true;
            }
            if (typeof parsed.settings.extraPointsAllowed !== 'boolean') {
              parsed.settings.extraPointsAllowed = true;
              needsSave = true;
            }
            if (typeof parsed.settings.extraPointsPenaltyRate !== 'number') {
              parsed.settings.extraPointsPenaltyRate = 1;
              needsSave = true;
            }
            if (parsed.bidding && parsed.bidding.currentBid === 1000 && (!parsed.bidding.bidHistory || parsed.bidding.bidHistory.length === 0)) {
              parsed.bidding.currentBid = parsed.settings.defaultReservePrice || 500;
              needsSave = true;
            }
          }

          if (needsSave) {
            this.state = parsed;
            this.recalculateAllTeams();
            this.saveToDisk();
          }

          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, re-seeding:', err);
      }
    }

    return this.createPreAuctionState();
  }

  private saveToDisk() {
    try {
      this.ensureDataDir();
      const content = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(DB_FILE, content, 'utf-8');
      fs.writeFileSync(KPL_DB_FILE, content, 'utf-8');
      try {
        fs.writeFileSync(ROOT_KPL_FILE, content, 'utf-8');
      } catch {
        // ignore root permission issues if any
      }

      // Automatically generate and write standalone offline HTML file
      try {
        const html = generateStandaloneAuctionHTML(this.state);
        fs.writeFileSync(path.join(DATA_DIR, 'myauctionkpl.html'), html, 'utf-8');
        fs.writeFileSync(path.join(process.cwd(), 'myauctionkpl.html'), html, 'utf-8');
        const pubDir = path.join(process.cwd(), 'public');
        if (fs.existsSync(pubDir)) {
          fs.writeFileSync(path.join(pubDir, 'myauctionkpl.html'), html, 'utf-8');
          fs.writeFileSync(path.join(pubDir, 'cricket_auction_report.html'), html, 'utf-8');
        }
        const distDir = path.join(process.cwd(), 'dist');
        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'myauctionkpl.html'), html, 'utf-8');
          fs.writeFileSync(path.join(distDir, 'cricket_auction_report.html'), html, 'utf-8');
        }
      } catch (htmlErr) {
        console.error('Failed to write standalone HTML report:', htmlErr);
      }
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  public saveCustomFile(fileName: string): string {
    this.ensureDataDir();
    const cleanName = fileName.replace(/[^a-zA-Z0-9_-]/g, '').trim() || 'myauctionkpl';
    const filePath = path.join(DATA_DIR, `${cleanName}.json`);
    const content = JSON.stringify(this.state, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
    if (cleanName.toLowerCase() === 'myauctionkpl') {
      try {
        fs.writeFileSync(ROOT_KPL_FILE, content, 'utf-8');
      } catch {}
    }

    try {
      const html = generateStandaloneAuctionHTML(this.state);
      fs.writeFileSync(path.join(DATA_DIR, `${cleanName}.html`), html, 'utf-8');
      fs.writeFileSync(path.join(process.cwd(), `${cleanName}.html`), html, 'utf-8');
      const pubDir = path.join(process.cwd(), 'public');
      if (fs.existsSync(pubDir)) {
        fs.writeFileSync(path.join(pubDir, `${cleanName}.html`), html, 'utf-8');
      }
    } catch (htmlErr) {
      console.error('Failed to write custom HTML report:', htmlErr);
    }

    return `${cleanName}.json`;
  }

  public createOfficialState(): FullAuctionState {
    const { teams, players, transactions } = buildOfficialAuctionState();
    const livePlayer = players.find(p => p.status === 'AVAILABLE') || players[0];

    const bidding: LiveBiddingState = {
      currentPlayerId: livePlayer ? livePlayer.id : 0,
      currentBid: DEFAULT_SETTINGS.defaultReservePrice || 500,
      selectedTeamId: teams[0] ? teams[0].id : null,
      isActive: false,
      bidHistory: [],
    };

    const newState: FullAuctionState = {
      settings: { ...DEFAULT_SETTINGS },
      teams,
      players,
      transactions,
      bidding,
      summary: this.calculateSummary(players, teams),
    };

    this.state = newState;
    this.saveToDisk();
    return this.state;
  }

  public createPreAuctionState(): FullAuctionState {
    const { teams, players, transactions } = buildFreshPreAuctionState();
    const firstAvailable = players.find(p => p.status === 'AVAILABLE') || players[0];

    const bidding: LiveBiddingState = {
      currentPlayerId: firstAvailable ? firstAvailable.id : 0,
      currentBid: DEFAULT_SETTINGS.defaultReservePrice || 500,
      selectedTeamId: teams[0] ? teams[0].id : null,
      isActive: Boolean(firstAvailable),
      bidHistory: [],
    };

    const newState: FullAuctionState = {
      settings: { ...DEFAULT_SETTINGS },
      teams,
      players,
      transactions,
      bidding,
      summary: this.calculateSummary(players, teams),
    };

    this.state = newState;
    this.saveToDisk();
    return this.state;
  }

  private calculateSummary(players: Player[], teams: Team[]): DashboardSummary {
    const totalPlayers = players.length;
    const playersSold = players.filter(p => p.status === 'SOLD').length;
    const playersAvailable = players.filter(p => p.status === 'AVAILABLE').length;
    const playersUnsold = players.filter(p => p.status === 'UNSOLD').length;

    const auctionPointsSpent = players
      .filter(p => p.status === 'SOLD')
      .reduce((sum, p) => sum + (p.soldPrice || 0), 0);

    const totalCommitteeCash = teams.reduce((sum, t) => sum + (t.committeeCash || 0), 0);
    const auctionProgressPct = totalPlayers > 0 ? Math.round((playersSold / totalPlayers) * 100) : 0;
    const completedTeamsCount = teams.filter(t => t.totalPlayers >= (this.state?.settings?.maxSquadSize || 15)).length;

    return {
      totalPlayers,
      playersSold,
      playersAvailable,
      playersUnsold,
      totalAuctionPointsSpent: auctionPointsSpent,
      totalCommitteeCash,
      auctionProgressPct,
      completedTeamsCount,
    };
  }

  public getState(): FullAuctionState {
    return this.state;
  }

  public getPlayer(playerId: number): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }

  public getTeam(teamId: string): Team | undefined {
    return this.state.teams.find(t => t.id === teamId);
  }

  public getTeamSquad(teamId: string): {
    icons: Player[];
    auctionPlayers: Player[];
    total: Player[];
  } {
    const squad = this.state.players.filter(p => p.soldToTeamId === teamId);

    return {
      icons: [],
      auctionPlayers: squad,
      total: squad,
    };
  }

  public recalculateAllTeams() {
    const settings = this.state.settings;

    this.state.teams = this.state.teams.map(team => {
      const squad = this.state.players.filter(p => p.soldToTeamId === team.id);
      const totalPointsSpent = squad.reduce((sum, p) => sum + p.soldPrice, 0);

      const effectiveBudget = (team.startingPoints || settings.startingPoints) + (settings.freePoints || 0);
      const pointsRemaining = effectiveBudget - totalPointsSpent;

      // Extra points penalty cash / charge
      const extraSpent = Math.max(0, totalPointsSpent - effectiveBudget);
      const committeeCash = extraSpent * (settings.extraPointsPenaltyRate || 1);

      const totalCount = squad.length;
      const remainingSlots = Math.max(0, settings.maxSquadSize - totalCount);

      // Safe max bid calculation
      const reserveNeed = remainingSlots > 1 ? (remainingSlots - 1) * settings.minBidIncrement : 0;
      const maxSafeBid = remainingSlots > 0 ? Math.max(0, pointsRemaining - reserveNeed) : 0;

      let status: Team['status'] = 'OK';
      if (totalCount > settings.maxSquadSize) {
        status = 'OVER 13 PLAYERS';
      } else if (pointsRemaining < 0) {
        status = 'OVER POINTS';
      } else if (totalCount === settings.maxSquadSize) {
        status = 'FULL';
      }

      return {
        ...team,
        totalPlayers: totalCount,
        iconPlayersCount: 0,
        auctionPlayersCount: totalCount,
        iconCost: 0,
        auctionBudget: effectiveBudget,
        totalPointsSpent,
        pointsRemaining,
        maxSafeBid,
        committeeCash,
        status,
      };
    });

    this.state.summary = this.calculateSummary(this.state.players, this.state.teams);
    this.saveToDisk();
  }

  public updateSettings(newSettings: Partial<TournamentSettings>): FullAuctionState {
    this.state.settings = {
      ...this.state.settings,
      ...newSettings,
    };
    this.recalculateAllTeams();
    this.saveToDisk();
    return this.state;
  }

  public addTeam(teamData: Partial<Team>): { success: boolean; message: string; team?: Team } {
    const name = (teamData.name || 'NEW TEAM').trim().toUpperCase();
    const id = teamData.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (this.state.teams.some(t => t.id === id)) {
      return { success: false, message: `A team with ID "${id}" already exists.` };
    }

    const shortCode = teamData.shortCode || name.slice(0, 3).toUpperCase();
    const color = teamData.color || '#3b82f6';
    const startingPoints = teamData.startingPoints || this.state.settings.startingPoints;
    const auctionBudget = teamData.auctionBudget || this.state.settings.auctionBudget;

    const newTeam: Team = {
      id,
      name,
      shortCode,
      color,
      badgeBg: '#e2e8f0',
      badgeText: '#1e293b',
      startingPoints,
      iconCost: 0,
      auctionBudget,
      totalPlayers: 0,
      iconPlayersCount: 0,
      auctionPlayersCount: 0,
      totalPointsSpent: 0,
      pointsRemaining: auctionBudget,
      maxSafeBid: auctionBudget,
      committeeCash: 0,
      status: 'OK',
    };

    this.state.teams.push(newTeam);
    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Team ${name} added successfully.`, team: newTeam };
  }

  public updateTeam(teamId: string, updates: Partial<Team>): { success: boolean; message: string } {
    const team = this.getTeam(teamId);
    if (!team) return { success: false, message: 'Team not found' };

    if (updates.name) team.name = updates.name.trim().toUpperCase();
    if (updates.shortCode) team.shortCode = updates.shortCode.trim().toUpperCase();
    if (updates.color) team.color = updates.color;
    if (typeof updates.startingPoints === 'number') team.startingPoints = updates.startingPoints;
    if (typeof updates.auctionBudget === 'number') team.auctionBudget = updates.auctionBudget;

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Team ${team.name} updated successfully.` };
  }

  public deleteTeam(teamId: string): { success: boolean; message: string } {
    const team = this.getTeam(teamId);
    if (!team) return { success: false, message: 'Team not found' };

    // Unassign all players sold to this team
    this.state.players.forEach(p => {
      if (p.soldToTeamId === teamId) {
        p.status = 'AVAILABLE';
        p.soldToTeamId = null;
        p.soldPrice = 0;
        p.isIcon = false;
      }
    });

    this.state.transactions = this.state.transactions.filter(t => t.teamId !== teamId);
    this.state.teams = this.state.teams.filter(t => t.id !== teamId);

    if (this.state.bidding.selectedTeamId === teamId) {
      this.state.bidding.selectedTeamId = this.state.teams[0] ? this.state.teams[0].id : null;
    }

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Team ${team.name} deleted.` };
  }

  public validateSale(
    playerId: number,
    teamId: string,
    soldPrice: number
  ): {
    valid: boolean;
    error?: string;
    warning?: string;
    teamRemaining?: number;
    maxSafeBid?: number;
  } {
    const player = this.getPlayer(playerId);
    const team = this.getTeam(teamId);

    if (!player) return { valid: false, error: 'Player not found.' };
    if (!team) return { valid: false, error: 'Team not found.' };

    if (player.status === 'SOLD') {
      return { valid: false, error: `Player is already SOLD to ${player.soldToTeamId}.` };
    }

    const maxSquad = this.state.settings.maxSquadSize || 15;
    if (team.totalPlayers >= maxSquad) {
      return {
        valid: false,
        error: `Team ${team.name} already has ${team.totalPlayers} players (Max squad limit of ${maxSquad} reached).`,
      };
    }

    if (soldPrice <= 0) {
      return { valid: false, error: 'Winning bid must be greater than 0.' };
    }

    let warning: string | undefined;
    if (soldPrice > team.maxSafeBid && team.maxSafeBid > 0) {
      warning = `Bid (${soldPrice.toLocaleString()}) exceeds Safe Max Bid (${team.maxSafeBid.toLocaleString()}). Will trigger extra points cash penalty.`;
    }

    return {
      valid: true,
      warning,
      teamRemaining: team.pointsRemaining,
      maxSafeBid: team.maxSafeBid,
    };
  }

  public sellPlayer(
    playerId: number,
    teamId: string,
    soldPrice: number,
    _adminOverride: boolean = false
  ): { success: boolean; message: string; state?: FullAuctionState } {
    const validation = this.validateSale(playerId, teamId, soldPrice);

    if (!validation.valid) {
      return { success: false, message: validation.error || 'Invalid sale' };
    }

    const player = this.getPlayer(playerId)!;
    const team = this.getTeam(teamId)!;

    player.status = 'SOLD';
    player.soldToTeamId = teamId;
    player.soldPrice = soldPrice;
    player.soldAt = new Date().toISOString();

    this.recalculateAllTeams();

    const updatedTeam = this.getTeam(teamId)!;
    const committeeCharge = updatedTeam.committeeCash;

    const tx: AuctionTransaction = {
      id: `tx-${Date.now()}-${playerId}`,
      timestamp: new Date().toISOString(),
      auctionOrder: this.state.transactions.length + 1,
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      teamId: team.id,
      teamName: team.name,
      soldPrice,
      committeeCharge,
      isIcon: false,
    };
    this.state.transactions.unshift(tx);

    // Keep the just-sold player on the stage with their final result until the
    // admin explicitly loads the next player onto the hammer. This prevents the
    // live auction screen from jumping to an unrelated next player right after
    // a sale, so viewers clearly see the sold player, team and winning points.
    this.state.bidding.currentPlayerId = playerId;
    this.state.bidding.currentBid = soldPrice;
    this.state.bidding.selectedTeamId = teamId;
    this.state.bidding.isActive = false;
    this.state.bidding.bidHistory = [];

    this.saveToDisk();
    return {
      success: true,
      message: `Hammer down! Sold ${player.name} to ${team.name} for ${soldPrice.toLocaleString()} pts.`,
      state: this.state,
    };
  }

  public markUnsold(playerId: number): { success: boolean; state: FullAuctionState } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, state: this.state };

    player.status = 'UNSOLD';
    player.soldToTeamId = null;
    player.soldPrice = 0;

    const nextPlayer = this.state.players.find(p => p.status === 'AVAILABLE');
    if (nextPlayer) {
      this.state.bidding.currentPlayerId = nextPlayer.id;
      this.state.bidding.currentBid = this.state.settings.defaultReservePrice || 500;
    }

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, state: this.state };
  }

  public reopenPlayer(playerId: number): { success: boolean; message: string; state: FullAuctionState } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, message: 'Player not found', state: this.state };

    player.status = 'AVAILABLE';
    player.soldToTeamId = null;
    player.soldPrice = 0;
    player.soldAt = undefined;

    this.state.transactions = this.state.transactions.filter(t => t.playerId !== playerId);

    this.state.bidding.currentPlayerId = playerId;
    this.state.bidding.currentBid = this.state.settings.defaultReservePrice || 500;

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Player ${player.name} returned to the auction block!`, state: this.state };
  }

  public updateBidding(
    playerId: number,
    teamId: string | null,
    amount: number
  ): FullAuctionState {
    this.state.bidding.currentPlayerId = playerId;
    this.state.bidding.selectedTeamId = teamId;
    this.state.bidding.currentBid = amount;

    if (teamId) {
      this.state.bidding.bidHistory.push({
        teamId,
        amount,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }

    this.saveToDisk();
    return this.state;
  }

  public setCurrentPlayer(playerId: number): FullAuctionState {
    const player = this.getPlayer(playerId);
    if (player) {
      this.state.bidding.currentPlayerId = playerId;
      this.state.bidding.currentBid = player.soldPrice > 0 ? player.soldPrice : (this.state.settings.defaultReservePrice || 500);
      // Loading a player onto the hammer (re)opens bidding for them.
      this.state.bidding.isActive = true;
      this.state.bidding.bidHistory = [];
      this.saveToDisk();
    }
    return this.state;
  }

  public nextPlayer(): FullAuctionState {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.bidding.currentPlayerId);
    if (currentIndex >= 0 && currentIndex < this.state.players.length - 1) {
      return this.setCurrentPlayer(this.state.players[currentIndex + 1].id);
    }
    return this.state;
  }

  public prevPlayer(): FullAuctionState {
    const currentIndex = this.state.players.findIndex(p => p.id === this.state.bidding.currentPlayerId);
    if (currentIndex > 0) {
      return this.setCurrentPlayer(this.state.players[currentIndex - 1].id);
    }
    return this.state;
  }

  public addPlayer(newPlayerData: Partial<Player>): { success: boolean; message: string; player?: Player } {
    const nextId = Math.max(...this.state.players.map(p => p.id), 0) + 1;
    const nextSrNo = typeof newPlayerData.srNo === 'number' && newPlayerData.srNo > 0
      ? newPlayerData.srNo
      : (Math.max(...this.state.players.map(p => p.srNo || p.id), 0) + 1);

    const photo = (newPlayerData.photoUrl || newPlayerData.photo || '').trim();

    const player: Player = {
      id: nextId,
      code: `P${nextId.toString().padStart(3, '0')}`,
      name: (newPlayerData.name || 'NEW PLAYER').trim().toUpperCase(),
      role: newPlayerData.role || 'All-Rounder',
      auctionOrder: this.state.players.length + 1,
      status: 'AVAILABLE',
      soldToTeamId: null,
      soldPrice: 0,
      isIcon: false,
      srNo: nextSrNo,
      village: (newPlayerData.village || '').trim(),
      photoUrl: photo || undefined,
      photo: photo || undefined,
    };

    this.state.players.push(player);
    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Added ${player.name} (${player.code})`, player };
  }

  public updatePlayer(playerId: number, updates: Partial<Player>): { success: boolean; message: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, message: 'Player not found' };

    if (updates.name) player.name = updates.name.trim().toUpperCase();
    if (updates.role) player.role = updates.role;
    if (typeof updates.auctionOrder === 'number') player.auctionOrder = updates.auctionOrder;
    if (typeof updates.srNo === 'number') player.srNo = updates.srNo;
    if (updates.village !== undefined) player.village = updates.village.trim();
    if (updates.status) player.status = updates.status;
    if (updates.photoUrl !== undefined || updates.photo !== undefined) {
      const p = (updates.photoUrl ?? updates.photo ?? '').trim();
      player.photoUrl = p || undefined;
      player.photo = p || undefined;
    }

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Player ${player.name} updated.` };
  }

  public deletePlayer(playerId: number): { success: boolean; message: string } {
    const player = this.getPlayer(playerId);
    if (!player) return { success: false, message: 'Player not found' };

    this.state.players = this.state.players.filter(p => p.id !== playerId);
    this.state.transactions = this.state.transactions.filter(t => t.playerId !== playerId);

    if (this.state.bidding.currentPlayerId === playerId) {
      const fallback = this.state.players[0];
      if (fallback) {
        this.state.bidding.currentPlayerId = fallback.id;
      }
    }

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: `Player ${player.name} deleted.` };
  }

  public reset(mode: 'official' | 'pre-auction' | 'clear'): FullAuctionState {
    if (mode === 'clear' || mode === 'pre-auction') {
      // Clear all player transactions and set all players to available with 0 bids
      this.state.players.forEach(p => {
        p.status = 'AVAILABLE';
        p.soldToTeamId = null;
        p.soldPrice = 0;
        p.soldAt = undefined;
        p.isIcon = false;
      });
      this.state.transactions = [];
      const first = this.state.players.find(p => p.status === 'AVAILABLE') || this.state.players[0];
      this.state.bidding = {
        currentPlayerId: first ? first.id : 0,
        currentBid: this.state.settings.defaultReservePrice || 500,
        selectedTeamId: this.state.teams[0]?.id || null,
        isActive: Boolean(first),
        bidHistory: [],
      };
      this.recalculateAllTeams();
      this.saveToDisk();
      return this.state;
    }

    return this.createOfficialState();
  }

  public createNewAuction(config: any): FullAuctionState {
    const updatedSettings: TournamentSettings = {
      ...this.state.settings,
      tournamentName: (config.tournamentName || this.state.settings.tournamentName || 'Cricket League Auction').trim(),
      tournamentLogo: config.tournamentLogo !== undefined ? config.tournamentLogo : this.state.settings.tournamentLogo,
      startingPoints: config.startingPoints > 0 ? Number(config.startingPoints) : 100000,
      auctionBudget: config.startingPoints > 0 ? Number(config.startingPoints) : 100000,
      maxSquadSize: config.maxSquadSize > 0 ? Number(config.maxSquadSize) : 15,
      maxAuctionPlayers: config.maxSquadSize > 0 ? Number(config.maxSquadSize) : 15,
      iconPlayersCount: 0,
      iconCostPerPlayer: 0,
      defaultReservePrice: config.defaultReservePrice > 0 ? Number(config.defaultReservePrice) : 500,
      minBidIncrement: config.minBidIncrement ? Number(config.minBidIncrement) : (this.state.settings.minBidIncrement || 500),
      freePoints: 0,
      extraPointsAllowed: true,
      extraPointsPenaltyRate: 1,
    };

    const incomingTeams = config.teams && config.teams.length > 0 ? config.teams : this.state.teams;
    const newTeams: Team[] = incomingTeams.map((t: any, idx: number) => {
      const rawName = (t.name || `FRANCHISE ${idx + 1}`).trim().toUpperCase();
      const rawShort = (t.shortCode || (t.short) || rawName.slice(0, 3)).trim().toUpperCase();
      const cleanId = t.id && t.id.trim()
        ? t.id
        : rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `team-${idx + 1}`;
      const color = t.color || '#4f46e5';
      const startingPoints = updatedSettings.startingPoints;
      const auctionBudget = startingPoints;
      const maxSafeBid = Math.max(0, startingPoints - ((updatedSettings.maxSquadSize - 1) * updatedSettings.minBidIncrement));

      return {
        id: cleanId,
        name: rawName,
        shortCode: rawShort,
        color,
        badgeBg: t.badgeBg || '#e0e7ff',
        badgeText: t.badgeText || '#3730a3',
        startingPoints,
        iconCost: 0,
        auctionBudget,
        totalPlayers: 0,
        iconPlayersCount: 0,
        auctionPlayersCount: 0,
        totalPointsSpent: 0,
        pointsRemaining: startingPoints,
        maxSafeBid,
        committeeCash: 0,
        status: 'OK' as const,
      };
    });

    let newPlayers: Player[] = [];
    let newTransactions: AuctionTransaction[] = [];

    if (config.playerPoolMode === 'empty') {
      newPlayers = [];
      newTransactions = [];
    } else if (config.playerPoolMode === 'demo') {
      const official = buildOfficialAuctionState();
      newPlayers = official.players;
      newTransactions = official.transactions;
    } else if (config.playerPoolMode === 'keep-current') {
      newPlayers = this.state.players.map(p => ({ ...p }));
      newTransactions = this.state.transactions.map(t => ({ ...t }));
    } else {
      // Default: 'reset-available'
      newPlayers = this.state.players.map(p => ({
        ...p,
        status: 'AVAILABLE' as const,
        soldToTeamId: null,
        soldPrice: 0,
        soldAt: undefined,
        isIcon: false,
      }));
      newTransactions = [];
    }

    const firstAvailable = newPlayers.find(p => p.status === 'AVAILABLE') || newPlayers[0];

    this.state = {
      settings: updatedSettings,
      teams: newTeams,
      players: newPlayers,
      transactions: newTransactions,
      bidding: {
        currentPlayerId: firstAvailable ? firstAvailable.id : 0,
        currentBid: updatedSettings.defaultReservePrice,
        selectedTeamId: newTeams[0]?.id || null,
        isActive: Boolean(firstAvailable),
        bidHistory: [],
      },
      summary: this.calculateSummary(newPlayers, newTeams),
    };

    this.recalculateAllTeams();
    this.saveToDisk();
    return this.state;
  }

  public clearAllPlayers(): { success: boolean; message: string; state: FullAuctionState } {
    this.state.players = [];
    this.state.transactions = [];
    this.state.bidding.currentPlayerId = 0;
    this.state.bidding.currentBid = this.state.settings.defaultReservePrice || 500;
    this.state.bidding.selectedTeamId = this.state.teams[0]?.id || null;
    this.state.bidding.isActive = false;
    this.state.bidding.bidHistory = [];

    this.recalculateAllTeams();
    this.saveToDisk();
    return { success: true, message: 'All players and auction records erased successfully.', state: this.state };
  }

  /**
   * Restore the entire auction database from a backed-up JSON state.
   * Replaces players, teams, settings, transactions, and bidding.
   */
  public restoreFromJson(backup: any): { success: boolean; message: string; state: FullAuctionState } {
    try {
      if (!backup || !Array.isArray(backup.players) || !Array.isArray(backup.teams)) {
        return {
          success: false,
          message: 'Invalid backup file: missing players or teams array.',
          state: this.state,
        };
      }

      const restoredState: FullAuctionState = {
        settings: backup.settings || { ...DEFAULT_SETTINGS },
        teams: backup.teams,
        players: backup.players,
        transactions: Array.isArray(backup.transactions) ? backup.transactions : [],
        bidding: backup.bidding || {
          currentPlayerId: 0,
          currentBid: backup.settings?.defaultReservePrice || 500,
          selectedTeamId: backup.teams[0]?.id || null,
          isActive: false,
          bidHistory: [],
        },
        summary: backup.summary || this.calculateSummary(backup.players, backup.teams),
      };

      this.state = restoredState;
      this.recalculateAllTeams();
      this.saveToDisk();

      return {
        success: true,
        message: 'Database restored from backup successfully.',
        state: this.state,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Failed to restore backup: ' + err.message,
        state: this.state,
      };
    }
  }

  /**
   * Bulk CSV import for players containing ID, NAME, ROLE, VILLAGE
   */
  public importPlayersFromCSV(csvText: string, replaceExisting: boolean = false): { count: number; message: string; state: FullAuctionState } {
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return { count: 0, message: 'CSV is empty', state: this.state };

    // Function to parse a CSV line with quotes support
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

    let idCol = -1;
    let nameCol = -1;
    let roleCol = -1;
    let villageCol = -1;

    let startIndex = 0;
    const firstLineParts = parseLine(lines[0]);
    const lowerHeaders = firstLineParts.map(p => p.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Check if the first line is a header
    const hasHeader = lowerHeaders.some(h =>
      ['id', 'srno', 'sr', 'name', 'playername', 'player', 'role', 'village', 'city', 'town'].includes(h)
    );

    if (hasHeader) {
      startIndex = 1;
      lowerHeaders.forEach((h, idx) => {
        if (h === 'id' || h === 'srno' || h === 'sr' || h === 'no' || h === 'slno' || h === 'playerid') {
          idCol = idx;
        } else if (h.includes('name') || h.includes('player')) {
          nameCol = idx;
        } else if (h.includes('role')) {
          roleCol = idx;
        } else if (h.includes('village') || h.includes('city') || h.includes('town') || h.includes('location')) {
          villageCol = idx;
        }
      });
    }

    // Default column fallback if not detected
    if (nameCol === -1) {
      if (firstLineParts.length >= 4) {
        idCol = 0;
        nameCol = 1;
        roleCol = 2;
        villageCol = 3;
      } else if (firstLineParts.length === 3) {
        const firstIsNum = /^\d+$/.test(firstLineParts[0].replace(/\D/g, ''));
        if (firstIsNum) {
          idCol = 0;
          nameCol = 1;
          roleCol = 2;
        } else {
          nameCol = 0;
          roleCol = 1;
          villageCol = 2;
        }
      } else if (firstLineParts.length === 2) {
        nameCol = 0;
        roleCol = 1;
      } else {
        nameCol = 0;
      }
    }

    const parsedPlayers: Array<{
      id: number;
      name: string;
      role: PlayerRole;
      village: string;
    }> = [];

    const existingMaxId = replaceExisting ? 0 : Math.max(...this.state.players.map(p => p.id), 0);
    let autoIdCounter = existingMaxId + 1;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = parseLine(lines[i]);
      if (parts.length === 0 || !parts.some(p => p.length > 0)) continue;

      const rawName = nameCol >= 0 && parts[nameCol] ? parts[nameCol] : '';
      if (!rawName.trim()) continue;

      // Extract ID
      let customId: number | null = null;
      if (idCol >= 0 && parts[idCol]) {
        const numOnly = parts[idCol].replace(/[^0-9]/g, '');
        if (numOnly) {
          const parsed = parseInt(numOnly, 10);
          if (!isNaN(parsed) && parsed > 0) {
            customId = parsed;
          }
        }
      }

      const assignedId = customId !== null ? customId : autoIdCounter++;

      // Extract Role
      let rawRole = roleCol >= 0 && parts[roleCol] ? parts[roleCol] : 'All-Rounder';
      let standardRole: PlayerRole = 'All-Rounder';
      const rLower = rawRole.toLowerCase();
      if (rLower.includes('bat')) standardRole = 'Batsman';
      else if (rLower.includes('bowl')) standardRole = 'Bowler';
      else if (rLower.includes('wick') || rLower.includes('wk') || rLower.includes('keep')) standardRole = 'Wicket-Keeper';
      else standardRole = 'All-Rounder';

      // Extract Village
      const village = villageCol >= 0 && parts[villageCol] ? parts[villageCol].trim() : '';

      parsedPlayers.push({
        id: assignedId,
        name: rawName.trim().toUpperCase(),
        role: standardRole,
        village,
      });
    }

    if (parsedPlayers.length === 0) {
      return { count: 0, message: 'No valid player rows found in CSV', state: this.state };
    }

    if (replaceExisting) {
      this.state.players = [];
      this.state.transactions = [];
    }

    let count = 0;
    // Upsert by id — never append a duplicate row for a player that already
    // exists (re-importing the same CSV must not double the roster).
    const byId = new Map<number, Player>(this.state.players.map(p => [p.id, p]));
    parsedPlayers.forEach((p, idx) => {
      const existing = byId.get(p.id);
      if (existing) {
        // Update descriptive fields only; preserve status/sale history.
        existing.name = p.name;
        existing.role = p.role;
        existing.village = p.village;
        existing.srNo = p.id || (idx + 1);
        existing.auctionOrder = p.id || (idx + 1);
        count++;
        return;
      }
      const playerObj: Player = {
        id: p.id,
        code: `P${p.id.toString().padStart(3, '0')}`,
        name: p.name,
        role: p.role,
        auctionOrder: p.id || (idx + 1),
        status: 'AVAILABLE',
        soldToTeamId: null,
        soldPrice: 0,
        isIcon: false,
        srNo: p.id || (idx + 1),
        village: p.village,
      };
      this.state.players.push(playerObj);
      byId.set(p.id, playerObj);
      count++;
    });

    // Sort players by id
    this.state.players.sort((a, b) => a.id - b.id);

    if (this.state.players[0]) {
      this.state.bidding.currentPlayerId = this.state.players[0].id;
      this.state.bidding.currentBid = this.state.settings.defaultReservePrice || 500;
      this.state.bidding.isActive = true;
    } else {
      this.state.bidding.currentPlayerId = 0;
      this.state.bidding.isActive = false;
    }

    this.recalculateAllTeams();
    this.saveToDisk();
    return {
      count,
      message: `Successfully imported ${count} players from CSV (ID, Name, Role, Village).`,
      state: this.state,
    };
  }

  public importPlayers(list: Array<{ id?: number; name: string; role?: string; village?: string }>): { count: number } {
    let count = 0;
    list.forEach(item => {
      if (item.name) {
        this.addPlayer({
          name: item.name,
          role: (item.role as any) || 'All-Rounder',
          village: item.village || '',
        });
        count++;
      }
    });
    return { count };
  }

  /**
   * Bulk import of already-reviewed/edited player rows from the admin import table.
   * Supports optional photo (data URI or URL), village, base price and roster order.
   */
  public importPlayerObjects(
    list: Array<{
      id?: number;
      srNo?: number;
      name: string;
      role?: string;
      village?: string;
      basePrice?: number | string;
      photoUrl?: string;
      photo?: string;
    }>,
    replaceExisting: boolean = false
  ): { count: number; message: string; state: FullAuctionState } {
    const validRows = (list || []).filter(r => r && typeof r.name === 'string' && r.name.trim().length > 0);

    if (validRows.length === 0) {
      return { count: 0, message: 'No valid player rows to import', state: this.state };
    }

    if (replaceExisting) {
      this.state.players = [];
      this.state.transactions = [];
    }

    const normalizeRole = (raw?: string): PlayerRole => {
      const lower = (raw || '').toLowerCase();
      if (lower.includes('bat')) return 'Batsman';
      if (lower.includes('bowl')) return 'Bowler';
      if (lower.includes('wick') || lower.includes('wk') || lower.includes('keep')) return 'Wicket-Keeper';
      return 'All-Rounder';
    };

    let runningMaxId = Math.max(...this.state.players.map(p => p.id), 0);
    let runningMaxSr = Math.max(...this.state.players.map(p => p.srNo || p.id), 0);

    // Upsert by id: re-importing a player that already exists must UPDATE its
    // metadata (name, role, village, photo) WITHOUT wiping auction history
    // (status, sold price, team, soldAt). Blindly appending here is what once
    // duplicated the whole roster (150 players became 300).
    const byId = new Map<number, Player>(this.state.players.map(p => [p.id, p]));

    let count = 0;
    validRows.forEach(row => {
      const customId = typeof row.id === 'number' && row.id > 0 ? row.id : null;
      const id = customId !== null ? customId : ++runningMaxId;
      const srNo = typeof row.srNo === 'number' && row.srNo > 0 ? row.srNo : ++runningMaxSr;
      const photo = (row.photoUrl || row.photo || '').trim();
      const basePrice =
        typeof row.basePrice === 'number'
          ? row.basePrice
          : row.basePrice !== undefined && String(row.basePrice).trim() !== ''
          ? Number(String(row.basePrice).replace(/[^0-9.]/g, '')) || undefined
          : undefined;

      const existing = byId.get(id);
      if (existing) {
        // Update descriptive fields only; keep all auction/transaction state.
        existing.name = row.name.trim().toUpperCase();
        existing.role = normalizeRole(row.role);
        existing.village = (row.village || '').trim();
        existing.srNo = srNo;
        existing.auctionOrder = srNo;
        if (basePrice !== undefined) existing.basePrice = basePrice;
        if (photo) {
          existing.photoUrl = photo;
          existing.photo = photo;
        }
        count++;
        return;
      }

      const player: Player = {
        id,
        code: `P${id.toString().padStart(3, '0')}`,
        name: row.name.trim().toUpperCase(),
        role: normalizeRole(row.role),
        auctionOrder: srNo,
        status: 'AVAILABLE',
        soldToTeamId: null,
        soldPrice: 0,
        isIcon: false,
        srNo,
        village: (row.village || '').trim(),
        basePrice,
        photoUrl: photo || undefined,
        photo: photo || undefined,
      };
      this.state.players.push(player);
      byId.set(id, player);
      count++;
    });

    this.state.players.sort((a, b) => (a.srNo || a.id) - (b.srNo || b.id));

    const firstAvailable = this.state.players.find(p => p.status === 'AVAILABLE') || this.state.players[0];
    this.state.bidding.currentPlayerId = firstAvailable ? firstAvailable.id : 0;
    this.state.bidding.currentBid = this.state.settings.defaultReservePrice || 500;
    this.state.bidding.isActive = Boolean(firstAvailable);

    this.recalculateAllTeams();
    this.saveToDisk();
    return {
      count,
      message: `Successfully imported ${count} player${count === 1 ? '' : 's'} with photos & edits.`,
      state: this.state,
    };
  }
}

export const db = new AuctionDatabase();
