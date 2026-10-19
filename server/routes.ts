import express, { Request, Response } from 'express';
import { db } from './db';
import { generateStandaloneAuctionHTML } from './htmlGenerator';
import {
  getAuthStatus,
  startAdminLogin,
  verifyAdminOtp,
  endAdminSession,
  isValidAdminSession,
} from './auth';
import {
  getTotpStatus,
  startTotpEnrollment,
  confirmTotpEnrollment,
  disableTotp,
} from './totp';

export const apiRouter = express.Router();

/** Admin session token from the login flow (body token or Authorization header). */
function adminSessionToken(req: Request): string {
  const bodyToken = String((req.body && req.body.token) || '');
  if (bodyToken) return bodyToken;
  const header = String(req.headers.authorization || '');
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function requireAdminSession(req: Request, res: Response): string | null {
  const token = adminSessionToken(req);
  if (!isValidAdminSession(token)) {
    res.status(401).json({ ok: false, message: 'Admin session expired. Please sign in again.' });
    return null;
  }
  return token;
}

/* ------------------------------------------------------------------ *
 *  Payload slimming                                                    *
 *  Viewers re-fetch state every 2.5s, so inline base64 images          *
 *  (tournament logo, player photos) are rewritten to small API URLs    *
 *  and served from dedicated cacheable endpoints instead.              *
 * ------------------------------------------------------------------ */

const DATA_IMAGE_PREFIX = 'data:image/';

function slimImages(value: any): any {
  if (Array.isArray(value)) {
    return value.map(slimImages);
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string' && val.startsWith(DATA_IMAGE_PREFIX)) {
        if ((key === 'photo' || key === 'photoUrl') && typeof value.id === 'number') {
          out[key] = `/api/players/${value.id}/photo`;
        } else if (key === 'tournamentLogo') {
          out[key] = '/api/tournament/logo';
        } else {
          out[key] = val; // unknown carrier — keep as-is rather than break it
        }
      } else {
        out[key] = slimImages(val);
      }
    }
    return out;
  }
  return value;
}

// Apply to every JSON response from the API (state polls + mutation results)
apiRouter.use((req: Request, res: Response, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => originalJson(slimImages(body));
  next();
});

/**
 * Reverse of slimImages for incoming mutations: admin screens that edit a
 * player or the league send back the API URL we gave them — restore the
 * stored data-URI so a save never replaces an image with its own URL.
 */
function unslimImages(value: any): void {
  if (Array.isArray(value)) {
    value.forEach(unslimImages);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (typeof val === 'string') {
        if (val === '/api/tournament/logo') {
          const logo = db.getState()?.settings?.tournamentLogo;
          if (typeof logo === 'string') {
            value[key] = logo;
          } else {
            // No stored logo — clear the slimmed placeholder so the client
            // doesn't keep a broken /api/tournament/logo reference.
            delete value[key];
          }
        } else {
          const match = val.match(/^\/api\/players\/(\d+)\/photo$/);
          if (match) {
            const player = db.getState().players.find((p: any) => String(p.id) === match[1]);
            const stored = player
              ? [player.photo, player.photoUrl].find(
                  (v: any) => typeof v === 'string' && v.startsWith(DATA_IMAGE_PREFIX)
                )
              : undefined;
            if (stored) value[key] = stored;
          }
        }
      } else if (val && typeof val === 'object') {
        unslimImages(val);
      }
    }
  }
}

apiRouter.use((req: Request, res: Response, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && typeof req.body === 'object') {
    unslimImages(req.body);
  }
  next();
});

/** Decode a stored data-URI image back into bytes for an <img> endpoint. */
function sendDataUriImage(res: Response, dataUri: string): void {
  const match = dataUri.match(/^data:(image\/[a-z+]+);base64,([\s\S]+)$/i);
  if (!match) {
    res.status(404).json({ error: 'No image available' });
    return;
  }
  // Short cache so admin logo changes are visible quickly (viewers re-fetch
  // the image separately from /api/state which only carries the /api URL).
  res.set('Cache-Control', 'public, max-age=30, must-revalidate');
  res.type(match[1]);
  res.send(Buffer.from(match[2], 'base64'));
}

// GET a player's stored photo (kept out of /api/state to keep polling tiny)
apiRouter.get('/players/:id/photo', (req: Request, res: Response) => {
  const player = db.getState().players.find((p: any) => String(p.id) === String(req.params.id));
  const candidates = player
    ? [player.photo, player.photoUrl].filter((v: any) => typeof v === 'string')
    : [];
  for (const candidate of candidates) {
    if ((candidate as string).startsWith(DATA_IMAGE_PREFIX)) {
      return sendDataUriImage(res, candidate as string);
    }
  }
  res.status(404).json({ error: 'No stored image for this player' });
});

// GET the tournament logo (2-3 MB as a data-URI — served once, then cached)
apiRouter.get('/tournament/logo', (req: Request, res: Response) => {
  const logo = db.getState()?.settings?.tournamentLogo;
  if (typeof logo === 'string' && logo.startsWith(DATA_IMAGE_PREFIX)) {
    return sendDataUriImage(res, logo);
  }
  res.status(404).json({ error: 'No stored logo' });
});

// GET full synchronized auction state
apiRouter.get('/state', (req: Request, res: Response) => {
  try {
    const state = db.getState();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------ *
 *  Admin two-step verification (password + emailed one-time code)
 * ------------------------------------------------------------------ */

// GET whether admin email / mail transport is configured
apiRouter.get('/auth/status', (req: Request, res: Response) => {
  res.json(getAuthStatus());
});

// POST step 1: verify admin password and email a 6-digit code
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { password } = req.body || {};
    const tournamentName = db.getState()?.settings?.tournamentName;
    const result = await startAdminLogin(String(password || ''), tournamentName);
    if (!result.ok) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message || 'Failed to start admin login' });
  }
});

// POST step 2: verify the emailed code and issue an admin session token
apiRouter.post('/auth/verify', (req: Request, res: Response) => {
  try {
    const { challengeId, code } = req.body || {};
    if (!challengeId || !code) {
      return res.status(400).json({ ok: false, message: 'challengeId and code are required' });
    }
    const result = verifyAdminOtp(String(challengeId), String(code));
    if (!result.ok) {
      return res.status(401).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message || 'Failed to verify code' });
  }
});

// GET validate an existing admin session token
apiRouter.get('/auth/session', (req: Request, res: Response) => {
  const token = String((req.query.token as string) || '');
  res.json({ valid: isValidAdminSession(token) });
});

// POST end an admin session
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  endAdminSession(String((req.body && req.body.token) || ''));
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ *
 *  Authenticator-app (TOTP) two-step verification
 * ------------------------------------------------------------------ */

// GET whether an authenticator app is enrolled (no secrets exposed)
apiRouter.get('/auth/totp/status', (req: Request, res: Response) => {
  res.json(getTotpStatus());
});

// POST step 1 of enrollment: mint a secret + QR for the signed-in admin
apiRouter.post('/auth/totp/setup', async (req: Request, res: Response) => {
  try {
    const token = requireAdminSession(req, res);
    if (!token) return;
    const issuer = db.getState()?.settings?.tournamentName || 'Cricket Auction';
    const result = await startTotpEnrollment(token, issuer, 'admin');
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message || 'Failed to start authenticator setup' });
  }
});

// POST step 2 of enrollment: confirm a live code, receive backup codes once
apiRouter.post('/auth/totp/confirm', (req: Request, res: Response) => {
  try {
    const token = requireAdminSession(req, res);
    if (!token) return;
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ ok: false, message: 'A 6-digit code from your app is required.' });
    }
    const result = confirmTotpEnrollment(token, String(code));
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message || 'Failed to confirm authenticator setup' });
  }
});

// POST disable authenticator verification (requires a valid current/backup code)
apiRouter.post('/auth/totp/disable', (req: Request, res: Response) => {
  try {
    const token = requireAdminSession(req, res);
    if (!token) return;
    const result = disableTotp(String((req.body && req.body.code) || ''));
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message || 'Failed to disable authenticator app' });
  }
});

// GET teams
apiRouter.get('/teams', (req: Request, res: Response) => {
  res.json(db.getState().teams);
});

// GET team squad
apiRouter.get('/teams/:id/squad', (req: Request, res: Response) => {
  const squad = db.getTeamSquad(req.params.id);
  res.json(squad);
});

// POST add a new team (Admin)
apiRouter.post('/teams', (req: Request, res: Response) => {
  const result = db.addTeam(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ ...result, state: db.getState() });
});

// PUT update team (Admin)
apiRouter.put('/teams/:id', (req: Request, res: Response) => {
  const result = db.updateTeam(req.params.id, req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ ...result, state: db.getState() });
});

// DELETE team (Admin)
apiRouter.delete('/teams/:id', (req: Request, res: Response) => {
  const result = db.deleteTeam(req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ ...result, state: db.getState() });
});

// POST update tournament settings (Admin)
apiRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const updatedState = db.updateSettings(req.body);
    res.json({ message: 'Settings updated successfully', state: updatedState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET players with search/filtering
apiRouter.get('/players', (req: Request, res: Response) => {
  const { search, role, status } = req.query;
  let players = db.getState().players;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    players = players.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }

  if (role && typeof role === 'string' && role !== 'ALL') {
    players = players.filter(p => p.role.toLowerCase() === role.toLowerCase());
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    players = players.filter(p => p.status.toLowerCase() === status.toLowerCase());
  }

  res.json(players);
});

// POST update live bid
apiRouter.post('/auction/bid', (req: Request, res: Response) => {
  const { playerId, teamId, amount } = req.body;
  if (!playerId || typeof amount !== 'number') {
    return res.status(400).json({ error: 'playerId and amount are required' });
  }

  const updatedState = db.updateBidding(Number(playerId), teamId || null, amount);
  res.json(updatedState);
});

// POST validate sale before confirming
apiRouter.post('/auction/validate', (req: Request, res: Response) => {
  const { playerId, teamId, price } = req.body;
  if (!playerId || !teamId || typeof price !== 'number') {
    return res.status(400).json({ error: 'playerId, teamId, and price are required' });
  }

  const validation = db.validateSale(Number(playerId), teamId, price);
  res.json(validation);
});

// POST sell player
apiRouter.post('/auction/sell', (req: Request, res: Response) => {
  const { playerId, teamId, price, adminOverride } = req.body;
  if (!playerId || !teamId || typeof price !== 'number') {
    return res.status(400).json({ error: 'playerId, teamId, and price are required' });
  }

  const result = db.sellPlayer(Number(playerId), teamId, price, Boolean(adminOverride));
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message, state: result.state });
});

// POST mark unsold
apiRouter.post('/auction/unsold', (req: Request, res: Response) => {
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  const result = db.markUnsold(Number(playerId));
  res.json(result);
});

// POST reopen sold or unsold player
apiRouter.post('/auction/reopen', (req: Request, res: Response) => {
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }

  const result = db.reopenPlayer(Number(playerId));
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json(result);
});

// POST navigate auction player (next / prev / jump)
apiRouter.post('/auction/navigate', (req: Request, res: Response) => {
  const { direction, playerId } = req.body;

  if (direction === 'next') {
    return res.json(db.nextPlayer());
  }
  if (direction === 'prev') {
    return res.json(db.prevPlayer());
  }
  if (playerId) {
    return res.json(db.setCurrentPlayer(Number(playerId)));
  }

  res.status(400).json({ error: 'Invalid navigation parameters' });
});

// POST select specific player for auction (Admin feature)
apiRouter.post('/auction/select-player', (req: Request, res: Response) => {
  const { playerId } = req.body;
  if (!playerId) {
    return res.status(400).json({ error: 'playerId is required' });
  }
  const state = db.setCurrentPlayer(Number(playerId));
  res.json({ message: `Player #${playerId} selected for auction`, state });
});

// CRUD for Players
apiRouter.post('/players', (req: Request, res: Response) => {
  const result = db.addPlayer(req.body);
  res.json({ ...result, state: db.getState() });
});

apiRouter.put('/players/:id', (req: Request, res: Response) => {
  const result = db.updatePlayer(Number(req.params.id), req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ ...result, state: db.getState() });
});

apiRouter.delete('/players/:id', (req: Request, res: Response) => {
  const result = db.deletePlayer(Number(req.params.id));
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Erase / Clear all players (Admin)
apiRouter.post('/players/clear', (req: Request, res: Response) => {
  const result = db.clearAllPlayers();
  res.json(result);
});

apiRouter.delete('/players', (req: Request, res: Response) => {
  const result = db.clearAllPlayers();
  res.json(result);
});

// Reset auction state (official, pre-auction, clear, or clear-players)
apiRouter.post('/reset', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'clear-players') {
    const result = db.clearAllPlayers();
    return res.json({ message: 'All players cleared', state: result.state });
  }
  const targetMode = mode === 'clear' ? 'clear' : mode === 'official' ? 'official' : 'pre-auction';
  const newState = db.reset(targetMode as any);
  res.json({ message: `Auction reset to ${targetMode} mode`, state: newState });
});

// Initialize / Create a brand-new auction event (Admin)
apiRouter.post('/auction/create-new', (req: Request, res: Response) => {
  try {
    const newState = db.createNewAuction(req.body);
    res.json({ message: 'New auction created successfully', state: newState });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk CSV Import (Players)
apiRouter.post('/import/csv', (req: Request, res: Response) => {
  const { csvText, replaceExisting } = req.body;
  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ error: 'csvText is required' });
  }
  const result = db.importPlayersFromCSV(csvText, Boolean(replaceExisting));
  res.json({ ...result, state: db.getState() });
});

// Bulk import of fully edited player rows (from the review/edit import table)
apiRouter.post('/import/players', (req: Request, res: Response) => {
  const { players, replaceExisting } = req.body || {};
  if (!Array.isArray(players)) {
    return res.status(400).json({ error: 'players array is required' });
  }
  const result = db.importPlayerObjects(players, Boolean(replaceExisting));
  res.json({ ...result, state: db.getState() });
});

// Import players legacy
apiRouter.post('/import', (req: Request, res: Response) => {
  const { players } = req.body;
  if (!Array.isArray(players)) {
    return res.status(400).json({ error: 'players array is required' });
  }
  const result = db.importPlayers(players);
  res.json({ message: `Imported ${result.count} players`, state: db.getState() });
});

// Export CSV & Data
apiRouter.get('/export/csv', (req: Request, res: Response) => {
  const { type } = req.query;
  const state = db.getState();

  if (type === 'players_registration' || type === 'players_simple' || type === 'players_basic') {
    const headers = 'SR no,name,role,village\n';
    const rows = state.players
      .map((p, idx) => {
        const sr = p.srNo || idx + 1;
        const village = (p.village || '').replace(/"/g, '""');
        const name = p.name.replace(/"/g, '""');
        return `${sr},"${name}","${p.role}","${village}"`;
      })
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="players_registration_list.csv"');
    return res.send('\uFEFF' + headers + rows);
  }

  if (type === 'history') {
    const headers = 'Time,Auction Order,Player ID,Player Name,Role,Purchased By Team,Sold Price (Points),Penalty Charge (INR)\n';
    const rows = state.transactions
      .map(
        t =>
          `"${t.timestamp}",${t.auctionOrder},"P${t.playerId.toString().padStart(3, '0')}","${t.playerName}","${t.role}","${t.teamName}",${t.soldPrice},${t.committeeCharge}`
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cricket_auction_history.csv"');
    return res.send(headers + rows);
  }

  if (type === 'squads') {
    const headers = 'Team Name,Short Code,Squad Count,Points Spent,Points Remaining,Player Name,Role,Sold Price (Points)\n';
    const lines: string[] = [];
    state.teams.forEach(team => {
      const squad = state.players.filter(p => p.soldToTeamId === team.id);
      if (squad.length === 0) {
        lines.push(`"${team.name}","${team.shortCode}",0,0,${team.pointsRemaining},"NO PLAYERS YET","",""`);
      } else {
        squad.forEach(p => {
          lines.push(`"${team.name}","${team.shortCode}",${squad.length},${team.totalPointsSpent},${team.pointsRemaining},"${p.name}","${p.role}",${p.soldPrice}`);
        });
      }
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cricket_team_squads.csv"');
    return res.send(headers + lines.join('\n'));
  }

  // Default export: All players with allocation
  const headers = 'Player ID,Code,Player Name,Role,Status,Team,Sold Price (Points)\n';
  const rows = state.players
    .map(p => {
      const team = p.soldToTeamId ? state.teams.find(t => t.id === p.soldToTeamId)?.name : 'UNSOLD/AVAILABLE';
      return `${p.id},"${p.code}","${p.name}","${p.role}","${p.status}","${team}",${p.soldPrice}`;
    })
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cricket_auction_players.csv"');
  res.send(headers + rows);
});

// Standalone Single-File HTML Export (can be opened offline anywhere)
apiRouter.get('/export/html', (req: Request, res: Response) => {
  const state = db.getState();
  const isView = req.query.view === '1';
  const html = generateStandaloneAuctionHTML(state);

  const rawHtmlFilename = (req.query.filename as string) || 'myauctionkpl';
  const htmlFilename = rawHtmlFilename.endsWith('.html') ? rawHtmlFilename : `${rawHtmlFilename}.html`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!isView) {
    res.setHeader('Content-Disposition', `attachment; filename="${htmlFilename}"`);
  }
  return res.send(html);
});

// Direct export for myauctionkpl.html
apiRouter.get('/export/myauctionkpl.html', (req: Request, res: Response) => {
  const state = db.getState();
  const html = generateStandaloneAuctionHTML(state);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="myauctionkpl.html"');
  return res.send(html);
});

// Save current auction database on server with requested file name (e.g. myauctionkpl.json)
apiRouter.post('/save-file', (req: Request, res: Response) => {
  try {
    const rawFileName = req.body?.fileName || req.body?.filename || 'myauctionkpl';
    const savedName = db.saveCustomFile(rawFileName);
    return res.json({
      success: true,
      fileName: savedName,
      message: `Auction database saved as ${savedName} on server!`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to save file' });
  }
});

// JSON Backup Export with filename query or default to myauctionkpl.json
apiRouter.get('/export/json', (req: Request, res: Response) => {
  const state = db.getState();
  const rawFilename = (req.query.filename as string) || 'myauctionkpl';
  const filename = rawFilename.endsWith('.json') ? rawFilename : `${rawFilename}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(JSON.stringify(state, null, 2));
});

// Direct export for myauctionkpl.json
apiRouter.get('/export/myauctionkpl', (req: Request, res: Response) => {
  const state = db.getState();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="myauctionkpl.json"');
  return res.send(JSON.stringify(state, null, 2));
});
