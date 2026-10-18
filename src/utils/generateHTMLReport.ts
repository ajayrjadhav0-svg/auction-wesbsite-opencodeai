import { FullAuctionState } from '../types';

function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateClientStandaloneHTML(state: FullAuctionState): string {
  const { settings, teams, players, transactions, summary } = state;
  const tournamentName = escapeHtml(settings?.tournamentName || 'Cricket League Auction');
  const totalPlayers = summary?.totalPlayers ?? players.length;
  const playersSold = summary?.playersSold ?? players.filter((p) => p.status === 'SOLD').length;
  const playersUnsold = summary?.playersUnsold ?? players.filter((p) => p.status === 'UNSOLD').length;
  const playersAvailable = summary?.playersAvailable ?? players.filter((p) => p.status === 'AVAILABLE').length;
  const totalPointsSpent = summary?.totalAuctionPointsSpent ?? teams.reduce((acc, t) => acc + (t.totalPointsSpent || 0), 0);
  const totalCommitteeCash = summary?.totalCommitteeCash ?? teams.reduce((acc, t) => acc + (t.committeeCash || 0), 0);
  const generationDate = new Date().toLocaleString();

  const safeJsonState = JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${tournamentName} - Complete Auction Report</title>
  <style>
    :root {
      --primary: #4338ca;
      --primary-light: #e0e7ff;
      --emerald: #059669;
      --emerald-light: #d1fae5;
      --rose: #e11d48;
      --rose-light: #ffe4e6;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-500: #64748b;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --border: #cbd5e1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: var(--slate-900);
      padding: 16px;
      line-height: 1.5;
    }
    .wrapper {
      max-width: 1280px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      border-bottom: 2px solid var(--slate-200);
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .title-group h1 { font-size: 24px; font-weight: 800; color: var(--slate-900); letter-spacing: -0.5px; }
    .title-group p { font-size: 13px; color: var(--slate-500); margin-top: 4px; }
    .badge-offline {
      display: inline-block; font-size: 11px; font-weight: 700;
      background: var(--emerald-light); color: var(--emerald);
      padding: 2px 8px; border-radius: 9999px; margin-left: 8px;
    }
    .btn-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700;
      cursor: pointer; border: none; transition: all 0.15s ease-in-out; text-decoration: none;
    }
    .btn-primary { background: var(--primary); color: #ffffff; }
    .btn-primary:hover { background: #3730a3; }
    .btn-secondary { background: var(--slate-100); color: var(--slate-800); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--slate-200); }
    .btn-emerald { background: var(--emerald); color: #ffffff; }
    .btn-emerald:hover { background: #047857; }
    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px; margin-bottom: 28px;
    }
    .metric-card {
      background: var(--slate-50); border: 1px solid var(--border);
      border-radius: 14px; padding: 16px;
    }
    .metric-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; color: var(--slate-500);
    }
    .metric-value {
      font-size: 24px; font-weight: 800; margin-top: 6px;
      font-family: ui-monospace, monospace; color: var(--slate-900);
    }
    .tabs {
      display: flex; gap: 8px; border-bottom: 1px solid var(--border);
      margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px;
    }
    .tab-btn {
      padding: 10px 18px; background: transparent; border: none;
      border-bottom: 3px solid transparent; font-size: 14px; font-weight: 700;
      color: var(--slate-500); cursor: pointer; white-space: nowrap;
    }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }
    .teams-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;
    }
    .team-card {
      border: 1px solid var(--border); border-radius: 14px; background: #ffffff;
      overflow: hidden; display: flex; flex-direction: column;
    }
    .team-card-header {
      padding: 14px 16px; background: var(--slate-50); border-bottom: 1px solid var(--slate-200);
      display: flex; justify-content: space-between; align-items: center;
    }
    .team-name { font-size: 15px; font-weight: 800; color: var(--slate-900); }
    .team-badge {
      font-size: 11px; font-weight: 800; padding: 3px 8px;
      border-radius: 6px; background: var(--primary-light); color: var(--primary);
    }
    .team-card-body { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
    .team-stats-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;
      background: var(--slate-50); padding: 10px; border-radius: 10px; border: 1px solid var(--slate-200);
    }
    .team-stats-row span { color: var(--slate-500); }
    .team-stats-row strong { display: block; font-size: 13px; font-family: ui-monospace, monospace; color: var(--slate-900); }
    .squad-section-title { font-size: 12px; font-weight: 700; color: var(--slate-600); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .squad-player-list { list-style: none; border: 1px solid var(--slate-200); border-radius: 10px; overflow: hidden; font-size: 12px; }
    .squad-player-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--slate-100); }
    .squad-player-item:last-child { border-bottom: none; }
    .squad-player-item:nth-child(even) { background: #fafafa; }
    .controls-bar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
    .search-input { padding: 9px 14px; border: 1px solid var(--border); border-radius: 10px; font-size: 13px; width: 100%; max-width: 320px; }
    .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .pill-btn { padding: 6px 12px; border-radius: 9999px; border: 1px solid var(--border); background: #ffffff; font-size: 12px; font-weight: 700; color: var(--slate-600); cursor: pointer; }
    .pill-btn.active { background: var(--slate-900); color: #ffffff; border-color: var(--slate-900); }
    .table-container { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th { background: var(--slate-50); padding: 12px 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-600); border-bottom: 1px solid var(--border); }
    td { padding: 12px 14px; border-bottom: 1px solid var(--slate-200); color: var(--slate-800); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f8fafc; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .status-sold { background: var(--emerald-light); color: var(--emerald); }
    .status-unsold { background: var(--rose-light); color: var(--rose); }
    .status-available { background: var(--primary-light); color: var(--primary); }
    .role-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--slate-100); color: var(--slate-700); }
    @media print {
      body { background: #ffffff; padding: 0; }
      .wrapper { border: none; box-shadow: none; padding: 0; }
      .btn-group, .tabs, .controls-bar { display: none !important; }
      .tab-panel { display: block !important; margin-bottom: 32px; page-break-after: auto; }
      .teams-grid { display: block; }
      .team-card { page-break-inside: avoid; margin-bottom: 16px; border: 1px solid #ccc; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="header">
      <div class="title-group">
        <h1>🏏 ${tournamentName}</h1>
        <p>
          Official Complete Auction Record &bull; Generated on ${escapeHtml(generationDate)}
          <span class="badge-offline">Standalone Offline HTML</span>
        </p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save PDF</button>
        <button class="btn btn-emerald" onclick="downloadJSON()">💾 Export JSON</button>
        <button class="btn btn-secondary" onclick="downloadSquadsCSV()">📊 Squads CSV</button>
      </div>
    </header>

    <section class="metrics-grid">
      <div class="metric-card"><div class="metric-label">Total Registered</div><div class="metric-value">${totalPlayers}</div></div>
      <div class="metric-card"><div class="metric-label">Players Sold</div><div class="metric-value" style="color: var(--emerald);">${playersSold}</div></div>
      <div class="metric-card"><div class="metric-label">Players Unsold</div><div class="metric-value" style="color: var(--rose);">${playersUnsold}</div></div>
      <div class="metric-card"><div class="metric-label">Available</div><div class="metric-value" style="color: var(--primary);">${playersAvailable}</div></div>
      <div class="metric-card"><div class="metric-label">Total Points Spent</div><div class="metric-value">${Number(totalPointsSpent).toLocaleString()}</div></div>
      <div class="metric-card"><div class="metric-label">Committee Cash</div><div class="metric-value" style="color: var(--emerald);">₹${Number(totalCommitteeCash).toLocaleString()}</div></div>
    </section>

    <nav class="tabs">
      <button class="tab-btn active" onclick="switchTab('squads', this)">🏆 Franchise Squads (${teams.length})</button>
      <button class="tab-btn" onclick="switchTab('players', this)">📋 Player Master Registry (${players.length})</button>
      <button class="tab-btn" onclick="switchTab('ledger', this)">🔨 Auction Ledger (${transactions.length})</button>
      <button class="tab-btn" onclick="switchTab('rules', this)">⚙️ Rules & Budgets</button>
    </nav>

    <div id="tab-squads" class="tab-panel active">
      ${
        playersSold === 0
          ? `
      <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div>
          <strong style="color: #3730a3; font-size: 14px; display: block;">🏏 Ready for Auction: All 8 Franchise Squads are Initialized</strong>
          <p style="color: #4f46e5; font-size: 12px; margin-top: 2px;">Each team is loaded with their full 100,000 points purse. All 80 registered players are available in the <strong>Player Master Registry</strong> tab.</p>
        </div>
        <button class="btn btn-primary" onclick="switchTab('players', document.querySelectorAll('.tab-btn')[1])" style="font-size: 12px; padding: 7px 14px; cursor: pointer;">View All 80 Players →</button>
      </div>`
          : ''
      }
      <div class="teams-grid">
        ${teams
          .map((team) => {
            const squad = players.filter((p) => p.soldToTeamId === team.id);
            return `
          <div class="team-card">
            <div class="team-card-header">
              <span class="team-name">${escapeHtml(team.name)}</span>
              <span class="team-badge">${escapeHtml(team.shortCode)}</span>
            </div>
            <div class="team-card-body">
              <div class="team-stats-row">
                <div><span>Squad Size</span><strong>${squad.length} / ${settings.maxSquadSize}</strong></div>
                <div><span>Points Spent</span><strong>${Number(team.totalPointsSpent || 0).toLocaleString()} pts</strong></div>
                <div><span>Points Left</span><strong style="color: var(--emerald);">${Number(team.pointsRemaining || 0).toLocaleString()} pts</strong></div>
                <div><span>Max Safe Bid</span><strong>${Number(team.maxSafeBid || 0).toLocaleString()} pts</strong></div>
              </div>
              <div class="squad-section-title">Squad Members (${squad.length})</div>
              <ul class="squad-player-list">
                ${
                  squad.length === 0
                    ? '<li class="squad-player-item" style="color: var(--slate-500); justify-content: center;">No players acquired yet</li>'
                    : squad
                        .map(
                          (p, idx) => `
                  <li class="squad-player-item">
                    <span>
                      <strong style="color: var(--slate-500); margin-right: 6px;">${idx + 1}.</strong>
                      <strong>${escapeHtml(p.name)}</strong>
                      <span class="role-badge" style="margin-left: 6px;">${escapeHtml(p.role)}</span>
                    </span>
                    <strong style="font-family: ui-monospace, monospace; color: var(--primary);">${Number(p.soldPrice || 0).toLocaleString()} pts</strong>
                  </li>`
                        )
                        .join('')
                }
              </ul>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </div>

    <div id="tab-players" class="tab-panel">
      <div class="controls-bar">
        <input type="text" id="playerSearchInput" class="search-input" placeholder="🔍 Search name, code, role, or team..." oninput="applyPlayerFilters()" />
        <div class="filter-pills">
          <button class="pill-btn active" onclick="setFilterStatus('ALL', this)">All (${players.length})</button>
          <button class="pill-btn" onclick="setFilterStatus('SOLD', this)">Sold (${playersSold})</button>
          <button class="pill-btn" onclick="setFilterStatus('UNSOLD', this)">Unsold (${playersUnsold})</button>
          <button class="pill-btn" onclick="setFilterStatus('AVAILABLE', this)">Available (${playersAvailable})</button>
        </div>
      </div>
      <div class="table-container">
        <table id="playersTable">
          <thead>
            <tr><th>SR</th><th>Code</th><th>Player Name</th><th>Role</th><th>Status</th><th>Winning Team</th><th>Sold Price</th><th>Village</th></tr>
          </thead>
          <tbody>
            ${players
              .map((p, idx) => {
                const team = p.soldToTeamId ? teams.find((t) => t.id === p.soldToTeamId)?.name : '—';
                const statusClass = p.status === 'SOLD' ? 'status-sold' : p.status === 'UNSOLD' ? 'status-unsold' : 'status-available';
                return `
              <tr class="player-data-row" data-status="${escapeHtml(p.status)}" data-search="${escapeHtml(`${p.code} ${p.name} ${p.role} ${team} ${p.village || ''}`.toLowerCase())}">
                <td>${p.srNo || idx + 1}</td>
                <td><code>${escapeHtml(p.code)}</code></td>
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td><span class="role-badge">${escapeHtml(p.role)}</span></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(p.status)}</span></td>
                <td><strong>${escapeHtml(team)}</strong></td>
                <td style="font-family: ui-monospace, monospace; font-weight: 700;">${p.soldPrice > 0 ? `${Number(p.soldPrice).toLocaleString()} pts` : '—'}</td>
                <td style="color: var(--slate-500);">${escapeHtml(p.village || '—')}</td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="tab-ledger" class="tab-panel">
      <div class="table-container">
        <table>
          <thead>
            <tr><th># Order</th><th>Time</th><th>Player Name</th><th>Role</th><th>Winning Team</th><th>Hammer Price</th><th>Fee (INR)</th></tr>
          </thead>
          <tbody>
            ${
              transactions.length === 0
                ? '<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--slate-500);">No auction transactions recorded yet.</td></tr>'
                : transactions
                    .map(
                      (tx) => `
              <tr>
                <td><strong>#${tx.auctionOrder || 1}</strong></td>
                <td style="color: var(--slate-500);">${escapeHtml(tx.timestamp || '—')}</td>
                <td><strong>${escapeHtml(tx.playerName || '—')}</strong></td>
                <td><span class="role-badge">${escapeHtml(tx.role || 'Player')}</span></td>
                <td><strong>${escapeHtml(tx.teamName || '—')}</strong></td>
                <td style="font-family: ui-monospace, monospace; font-weight: 800; color: var(--primary);">${Number(tx.soldPrice || 0).toLocaleString()} pts</td>
                <td style="color: var(--emerald); font-weight: 700;">${tx.committeeCharge > 0 ? `₹${Number(tx.committeeCharge).toLocaleString()}` : '—'}</td>
              </tr>`
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <div id="tab-rules" class="tab-panel">
      <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
        <div class="metric-card"><div class="metric-label">Tournament Name</div><div class="metric-value" style="font-size: 18px; font-family: inherit;">${tournamentName}</div></div>
        <div class="metric-card"><div class="metric-label">Max Squad Size</div><div class="metric-value">${settings.maxSquadSize} Players</div></div>
        <div class="metric-card"><div class="metric-label">Starting Purse</div><div class="metric-value">${Number(settings.startingPoints).toLocaleString()} pts</div></div>
        <div class="metric-card"><div class="metric-label">Minimum Bid Increment</div><div class="metric-value">${Number(settings.minBidIncrement).toLocaleString()} pts</div></div>
        <div class="metric-card"><div class="metric-label">Default Reserve Price</div><div class="metric-value">${Number(settings.defaultReservePrice).toLocaleString()} pts</div></div>
        <div class="metric-card"><div class="metric-label">Extra Points Penalty Rate</div><div class="metric-value">₹${settings.extraPointsPenaltyRate} per pt</div></div>
      </div>
    </div>
  </div>

  <script id="auctionData" type="application/json">
    ${safeJsonState}
  </script>

  <script>
    let currentFilterStatus = 'ALL';
    function switchTab(tabId, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const targetPanel = document.getElementById('tab-' + tabId);
      if (targetPanel) targetPanel.classList.add('active');
      if (btn) btn.classList.add('active');
    }
    function setFilterStatus(status, btn) {
      currentFilterStatus = status;
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      applyPlayerFilters();
    }
    function applyPlayerFilters() {
      const q = (document.getElementById('playerSearchInput')?.value || '').toLowerCase().trim();
      const rows = document.querySelectorAll('.player-data-row');
      rows.forEach(r => {
        const text = r.getAttribute('data-search') || '';
        const status = r.getAttribute('data-status') || '';
        const matchesQuery = !q || text.includes(q);
        const matchesStatus = currentFilterStatus === 'ALL' || status === currentFilterStatus;
        r.style.display = (matchesQuery && matchesStatus) ? '' : 'none';
      });
    }
    function getEmbeddedState() {
      try {
        const raw = document.getElementById('auctionData').textContent;
        return JSON.parse(raw);
      } catch (err) {
        return null;
      }
    }
    function downloadJSON() {
      const state = getEmbeddedState();
      if (!state) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', 'myauctionkpl.json');
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    function downloadSquadsCSV() {
      const state = getEmbeddedState();
      if (!state) return;
      let csv = 'Team Name,Short Code,Squad Size,Points Spent,Points Remaining,Player Name,Role,Sold Price\\n';
      state.teams.forEach(team => {
        const squad = state.players.filter(p => p.soldToTeamId === team.id);
        if (squad.length === 0) {
          csv += '"' + team.name.replace(/"/g, '""') + '","' + team.shortCode + '",0,0,' + team.pointsRemaining + ',"No Players","",""\\n';
        } else {
          squad.forEach(p => {
            csv += '"' + team.name.replace(/"/g, '""') + '","' + team.shortCode + '",' + squad.length + ',' + team.totalPointsSpent + ',' + team.pointsRemaining + ',"' + p.name.replace(/"/g, '""') + '","' + p.role + '",' + p.soldPrice + '\\n';
          });
        }
      });
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', 'myauctionkpl_squads.csv');
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  </script>
</body>
</html>`;
}
