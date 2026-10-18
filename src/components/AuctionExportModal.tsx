import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
  Download,
  Trophy,
  Users,
  Coins,
  MapPin,
  ExternalLink,
  FileCode,
  Smartphone,
  Database,
  Archive,
  Save,
} from 'lucide-react';
import { useAuction } from '../context/AuctionContext';
import { formatPoints, formatINR } from '../utils/formatters';
import { generateClientStandaloneHTML } from '../utils/generateHTMLReport';

interface AuctionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuctionExportModal: React.FC<AuctionExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, getViewerShareUrl, showNotification, saveFileAs } = useAuction();
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'options' | 'print-preview'>('options');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [targetFileName, setTargetFileName] = useState('myauctionkpl');
  const [isSavingServer, setIsSavingServer] = useState(false);

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

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        showNotification('success', 'App installed successfully!');
      }
      setDeferredPrompt(null);
    } else {
      showNotification(
        'info',
        'To install on Android: In Chrome, tap ⋮ (menu) > "Install App" or "Add to Home Screen"'
      );
    }
  };

  if (!isOpen || !state) return null;

  const { settings, teams, players, transactions, summary } = state;
  const soldPlayers = players.filter((p) => p.status === 'SOLD');

  const cleanFileName = (targetFileName.trim() || 'myauctionkpl').replace(/[^a-zA-Z0-9_-]/g, '');

  const handleDownloadHTML = async () => {
    try {
      showNotification('info', `Preparing standalone offline HTML report (${cleanFileName}.html)...`);
      let htmlContent = '';
      try {
        const response = await fetch(`/api/export/html?filename=${encodeURIComponent(cleanFileName)}`);
        if (response.ok) {
          htmlContent = await response.text();
        }
      } catch (e) {
        console.warn('Server HTML fetch failed, fallback to client-side generator', e);
      }

      if (!htmlContent || htmlContent.length < 500) {
        htmlContent = generateClientStandaloneHTML(state);
      }

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${cleanFileName}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('success', `Downloaded standalone offline report: ${cleanFileName}.html!`);
    } catch (err: any) {
      // Direct client fallback
      const htmlContent = generateClientStandaloneHTML(state);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${cleanFileName}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification('success', `Downloaded offline HTML report: ${cleanFileName}.html`);
    }
  };

  const handleOpenHTML = () => {
    try {
      const htmlContent = generateClientStandaloneHTML(state);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      showNotification('info', 'Opened complete HTML report in new tab');
    } catch (err) {
      window.open(`/api/export/html?view=1&filename=${encodeURIComponent(cleanFileName)}`, '_blank');
    }
  };

  const handleDownloadJSON = async () => {
    try {
      const jsonContent = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${cleanFileName}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also persist on server
      await saveFileAs(cleanFileName);
      showNotification('success', `Exported and saved ${cleanFileName}.json!`);
    } catch (err: any) {
      showNotification('error', `Failed to export JSON: ${err.message}`);
    }
  };

  const handleSaveToServerOnly = async () => {
    setIsSavingServer(true);
    await saveFileAs(cleanFileName);
    setIsSavingServer(false);
  };

  // Generate plain-text summary for sharing (WhatsApp, Telegram, Notes)
  const generateShareableText = () => {
    let text = `🏏 *${settings.tournamentName.toUpperCase()} - AUCTION RESULTS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *Summary:*\n`;
    text += `• Total Players: ${players.length}\n`;
    text += `• Players Sold: ${soldPlayers.length}\n`;
    text += `• Total Points Spent: ${formatPoints(summary.totalAuctionPointsSpent)} pts\n`;
    text += `• Completed Teams: ${summary.completedTeamsCount} / ${teams.length}\n\n`;

    text += `🏆 *FRANCHISE SQUADS:*\n`;
    teams.forEach((team) => {
      const squad = players.filter((p) => p.soldToTeamId === team.id);
      text += `\n*${team.name}* (${team.shortCode})\n`;
      text += `Squad: ${squad.length}/${settings.maxSquadSize} | Spent: ${formatPoints(team.totalPointsSpent)} pts | Left: ${formatPoints(team.pointsRemaining)} pts\n`;
      if (squad.length === 0) {
        text += `  _(No players acquired yet)_\n`;
      } else {
        squad.forEach((p, idx) => {
          text += `  ${idx + 1}. ${p.name} - ${p.role} [${formatPoints(p.soldPrice)} pts]\n`;
        });
      }
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔗 View live results: ${getViewerShareUrl()}\n`;
    return text;
  };

  const handleCopyText = () => {
    const text = generateShareableText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showNotification('success', 'Auction summary copied to clipboard!');
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const text = generateShareableText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopyLink = () => {
    const link = getViewerShareUrl();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showNotification('success', 'Viewer link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleTriggerPrint = () => {
    if (activeTab !== 'print-preview') {
      setActiveTab('print-preview');
    }
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error(e);
      }
    }, 250);
  };

  // Client-side CSV generator helper with UTF-8 BOM for Microsoft Excel
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('success', `Downloaded ${filename}`);
  };

  const handleExportPlayersCSV = () => {
    const headers = 'Player ID,Code,Player Name,Role,Status,Purchased By Team,Sold Price (Points)\n';
    const rows = players
      .map((p) => {
        const team = p.soldToTeamId ? teams.find((t) => t.id === p.soldToTeamId)?.name : 'AVAILABLE/UNSOLD';
        return `${p.id},"${p.code}","${p.name.replace(/"/g, '""')}","${p.role}","${p.status}","${(team || '').replace(/"/g, '""')}",${p.soldPrice}`;
      })
      .join('\n');
    downloadCSV(headers + rows, `${cleanFileName}_players.csv`);
  };

  const handleExportPlayersRegistrationCSV = () => {
    const headers = 'SR no,name,role,village\n';
    const rows = players
      .map((p, idx) => {
        const sr = p.srNo || idx + 1;
        const v = (p.village || '').replace(/"/g, '""');
        const n = p.name.replace(/"/g, '""');
        return `${sr},"${n}","${p.role}","${v}"`;
      })
      .join('\n');
    downloadCSV(headers + rows, `${cleanFileName}_players_registration.csv`);
  };

  const handleExportSquadsCSV = () => {
    const headers = 'Team Name,Short Code,Squad Size,Points Spent,Points Remaining,Player Name,Role,Sold Price (Points)\n';
    const rows: string[] = [];
    teams.forEach((team) => {
      const squad = players.filter((p) => p.soldToTeamId === team.id);
      if (squad.length === 0) {
        rows.push(`"${team.name.replace(/"/g, '""')}","${team.shortCode}",0,0,${team.pointsRemaining},"NO PLAYERS YET","",""`);
      } else {
        squad.forEach((p) => {
          rows.push(
            `"${team.name.replace(/"/g, '""')}","${team.shortCode}",${squad.length},${team.totalPointsSpent},${team.pointsRemaining},"${p.name.replace(/"/g, '""')}","${p.role}",${p.soldPrice}`
          );
        });
      }
    });
    downloadCSV(headers + rows.join('\n'), `${cleanFileName}_squads.csv`);
  };

  const handleExportLedgerCSV = () => {
    const headers = 'Timestamp,Auction Order,Player ID,Player Name,Role,Purchased By Team,Sold Price (Points),Penalty Cash (INR)\n';
    const rows = (transactions || [])
      .map((t) => {
        const roleName = t.role || (t as any).playerRole || 'All-Rounder';
        const hammerPrice = t.soldPrice ?? (t as any).amount ?? (t as any).points ?? 0;
        const penalty = t.committeeCharge ?? (t as any).committeeCash ?? 0;
        return `"${t.timestamp || ''}",${t.auctionOrder || 1},"P${(t.playerId || 0).toString().padStart(3, '0')}","${(t.playerName || '').replace(/"/g, '""')}","${roleName}","${(t.teamName || '').replace(/"/g, '""')}",${hammerPrice},${penalty}`;
      })
      .join('\n');
    downloadCSV(headers + rows, `${cleanFileName}_auction_ledger.csv`);
  };

  return createPortal(
    <div className="export-print-modal fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 print:static print:bg-transparent print:p-0 print:block">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden print:max-h-none print:rounded-none print:border-0 print:shadow-none print:overflow-visible">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Outfit'] font-black text-lg sm:text-xl text-slate-900 leading-tight">
                PRINT & SHARE AUCTION DATA
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download simple Excel / CSV spreadsheets, print or save as PDF, and share results.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              id="btn-close-export-modal"
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle: Options vs Full Print View */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/40 text-xs font-['Outfit'] font-bold print:hidden">
          <button
            onClick={() => setActiveTab('options')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'options'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD & SHARE OPTIONS</span>
          </button>

          <button
            onClick={() => setActiveTab('print-preview')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'print-preview'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>PRINT / SAVE AS PDF PREVIEW</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:overflow-visible print:p-0">
          {activeTab === 'options' ? (
            <div className="space-y-6">
              {/* PRIMARY ACTION: Save File As myauctionkpl */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-800 space-y-3.5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Outfit'] font-black text-base text-white tracking-wide">
                          SAVE FILE AS
                        </h3>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {cleanFileName}.json
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Save and export your complete auction database, rosters, and ledger under a custom file name.
                      </p>
                    </div>
                  </div>

                  {/* File Name Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        id="input-save-filename"
                        value={targetFileName}
                        onChange={(e) => setTargetFileName(e.target.value)}
                        placeholder="myauctionkpl"
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-36 sm:w-44 pr-10"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-400 pointer-events-none">
                        .json
                      </span>
                    </div>

                    <button
                      onClick={handleDownloadJSON}
                      id="btn-save-and-download-myauctionkpl"
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-['Outfit'] font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>SAVE & DOWNLOAD ({cleanFileName}.json)</span>
                    </button>

                    <button
                      onClick={handleSaveToServerOnly}
                      disabled={isSavingServer}
                      id="btn-save-server-only"
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-['Outfit'] font-bold text-xs flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all shrink-0"
                      title="Save to server disk without triggering browser download"
                    >
                      <Save className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isSavingServer ? 'Saving...' : 'Save to Server'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Action Bar for Instant Print / PDF */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-['Outfit'] font-black text-base text-slate-900">
                      Instant Print or Save as PDF
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Formats all teams, bought players, and prices into a clean, ready-to-print document.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTriggerPrint}
                  id="btn-trigger-print"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 transition-all self-start sm:self-auto shrink-0"
                >
                  <Printer className="w-4 h-4" />
                  <span>PRINT / SAVE AS PDF</span>
                </button>
              </div>

              {/* Excel / CSV Downloads Section */}
              <div>
                <h3 className="font-['Outfit'] font-bold text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>EXCEL & CSV SPREADSHEET FILES (SIMPLE FORMAT)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 0: Registration Roster (SR No, Name, Role, Village) */}
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 hover:border-indigo-400 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mb-2 shadow-2xs">
                        📋
                      </div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                          Player Registration List
                        </h4>
                        <span className="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded uppercase">
                          CSV
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Clean 4-column format: <strong>SR no, name, role, village</strong> for all {players.length} registered players.
                      </p>
                    </div>

                    <button
                      onClick={handleExportPlayersRegistrationCSV}
                      id="btn-download-players-reg-csv"
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-200" />
                      <span>Download (SR, Name, Role, Village)</span>
                    </button>
                  </div>

                  {/* Card 1: All Players */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2">
                        📑
                      </div>
                      <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                        All Players Roster
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        All {players.length} players with role, sale status, franchise team, and final price.
                      </p>
                    </div>

                    <button
                      onClick={handleExportPlayersCSV}
                      id="btn-download-players-csv"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download Excel / CSV</span>
                    </button>
                  </div>

                  {/* Card 2: Team Squads Breakdown */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-2">
                        🏏
                      </div>
                      <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                        Team Squads Breakdown
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Organized squad list for each franchise with purse spent, purse remaining, and roster members.
                      </p>
                    </div>

                    <button
                      onClick={handleExportSquadsCSV}
                      id="btn-download-squads-csv"
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Squads CSV</span>
                    </button>
                  </div>

                  {/* Card 3: Auction Hammer Ledger */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs mb-2">
                        📜
                      </div>
                      <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                        Hammer History Ledger
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Chronological audit log of {transactions.length} sales with timestamp, winning team, and fees.
                      </p>
                    </div>

                    <button
                      onClick={handleExportLedgerCSV}
                      id="btn-download-ledger-csv"
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Download Ledger CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Standalone HTML & Full Data Backup Section */}
              <div>
                <h3 className="font-['Outfit'] font-bold text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <span>STANDALONE OFFLINE HTML & DATABASE BACKUP</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Standalone HTML File Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-purple-50/70 border border-indigo-200 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mb-2 shadow-xs">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                          Standalone Offline HTML ({cleanFileName}.html)
                        </h4>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase">
                          Single File
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Complete self-contained HTML report with embedded styles, all team squads, ledger, and live search. Runs completely offline in any web browser without internet or servers.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadHTML}
                        id="btn-download-standalone-html"
                        className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download {cleanFileName}.html</span>
                      </button>
                      <button
                        onClick={handleOpenHTML}
                        id="btn-open-standalone-html"
                        className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-['Outfit'] font-bold text-xs border border-slate-200 flex items-center gap-1 transition-all"
                        title="Open HTML in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>

                  {/* Full Database Backup Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs mb-2">
                        <Database className="w-4 h-4 text-slate-800" />
                      </div>
                      <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                        Complete JSON Backup ({cleanFileName}.json)
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Full machine-readable snapshot containing all tournament rules, team budgets, player rosters, and bid transactions.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadJSON}
                      id="btn-download-backup-json"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-['Outfit'] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-300" />
                      <span>Download {cleanFileName}.json</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile App & Android APK Section */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-['Outfit'] font-black text-slate-900 text-sm sm:text-base">
                          Install Android App / WebAPK
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PWA Ready
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Install directly onto your Android device or PC as a standalone app with home screen icon and offline support.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleInstallApp}
                      id="btn-install-android-pwa"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-['Outfit'] font-bold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Install App Now</span>
                    </button>
                    <a
                      href={`https://www.pwabuilder.com/?site=${encodeURIComponent(window.location.origin)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-['Outfit'] font-bold text-xs border border-emerald-300 flex items-center gap-1 transition-all"
                      title="Generate signed APK file via PWABuilder"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Get .APK File</span>
                    </a>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 bg-white/70 p-3 rounded-xl border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 block">📱 How to install directly on your Android phone:</span>
                  <p>1. Open this website in <strong>Google Chrome</strong> on your Android device.</p>
                  <p>2. Tap the <strong>three dots (⋮)</strong> in the top right corner.</p>
                  <p>3. Tap <strong>"Install App"</strong> (or <strong>"Add to Home Screen"</strong>). Android will compile a native WebAPK icon on your home screen!</p>
                </div>
              </div>

              {/* Share with Anyone Section */}
              <div>
                <h3 className="font-['Outfit'] font-bold text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-600" />
                  <span>SHARE WITH ANYONE DIRECTLY</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* WhatsApp Share */}
                  <button
                    onClick={handleShareWhatsApp}
                    id="btn-share-whatsapp"
                    className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left transition-all flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                      💬
                    </div>
                    <div>
                      <h4 className="font-['Outfit'] font-bold text-emerald-950 text-sm">
                        Share on WhatsApp
                      </h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Send formatted results to your group or players
                      </p>
                    </div>
                  </button>

                  {/* Copy Text Summary */}
                  <button
                    onClick={handleCopyText}
                    id="btn-copy-summary-text"
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      {copiedText ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-['Outfit'] font-bold text-slate-900 text-sm">
                        {copiedText ? 'Copied to Clipboard!' : 'Copy Text Summary'}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Clean text ready to paste anywhere
                      </p>
                    </div>
                  </button>

                  {/* Copy Public Link */}
                  <button
                    onClick={handleCopyLink}
                    id="btn-copy-viewer-link"
                    className="p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-left transition-all flex items-center gap-3.5 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      {copiedLink ? <Check className="w-5 h-5 text-indigo-200" /> : <ExternalLink className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-['Outfit'] font-bold text-indigo-950 text-sm">
                        {copiedLink ? 'Link Copied!' : 'Copy Spectator Link'}
                      </h4>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Anyone can open and view live
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Printable Report Preview */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 print:hidden">
                <span className="text-xs text-slate-500">
                  Tip: In the print window, choose <strong>"Save as PDF"</strong> as your destination to save as a file.
                </span>
                <button
                  onClick={handleTriggerPrint}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-['Outfit'] font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Open Print Dialog</span>
                </button>
              </div>

              {/* Printable Document Container */}
              <div id="printable-auction-sheet" className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6 text-slate-900 font-sans">
                {/* Header */}
                <div className="text-center pb-4 border-b border-slate-300">
                  <h1 className="text-2xl font-black font-['Outfit'] tracking-tight text-slate-950">
                    {settings.tournamentName.toUpperCase()}
                  </h1>
                  <p className="text-sm font-semibold text-slate-600 mt-1">
                    OFFICIAL AUCTION RESULTS & SQUAD ALLOCATION SHEET
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Printed on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-4 gap-3 text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Teams</span>
                    <span className="text-lg font-black font-['Outfit'] text-slate-900">{teams.length}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Players Sold</span>
                    <span className="text-lg font-black font-['Outfit'] text-emerald-700">
                      {soldPlayers.length} / {players.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Points Spent</span>
                    <span className="text-lg font-black font-['Outfit'] text-indigo-700">
                      {formatPoints(summary.totalAuctionPointsSpent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Squad Limit</span>
                    <span className="text-lg font-black font-['Outfit'] text-slate-900">
                      {settings.maxSquadSize} Players / Team
                    </span>
                  </div>
                </div>

                {/* Teams & Squads Breakdown */}
                <div className="space-y-6">
                  {teams.map((team) => {
                    const squad = players.filter((p) => p.soldToTeamId === team.id);
                    return (
                      <div key={team.id} className="border border-slate-200 rounded-xl overflow-hidden page-break-inside-avoid">
                        <div className="bg-slate-100/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded text-[10px] font-black flex items-center justify-center text-white"
                              style={{ backgroundColor: team.color }}
                            >
                              {team.shortCode}
                            </span>
                            <span className="font-['Outfit'] font-black text-sm text-slate-900">
                              {team.name}
                            </span>
                          </div>
                          <div className="text-xs font-mono font-bold text-slate-600 flex items-center gap-3">
                            <span>Players: {squad.length}/{settings.maxSquadSize}</span>
                            <span>Spent: {formatPoints(team.totalPointsSpent)} pts</span>
                            <span className={team.pointsRemaining < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                              Remaining: {formatPoints(team.pointsRemaining)} pts
                            </span>
                          </div>
                        </div>

                        {squad.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400 italic">
                            No players purchased yet.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-b border-slate-200">
                              <tr>
                                <th className="py-1.5 px-3">#</th>
                                <th className="py-1.5 px-3">Player Name</th>
                                <th className="py-1.5 px-3">Role</th>
                                <th className="py-1.5 px-3 text-right">Winning Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {squad.map((p, idx) => (
                                <tr key={p.id}>
                                  <td className="py-1.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                  <td className="py-1.5 px-3 font-bold text-slate-900">{p.name}</td>
                                  <td className="py-1.5 px-3 text-slate-600">{p.role}</td>
                                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                    {formatPoints(p.soldPrice)} pts
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs print:hidden">
          <span className="text-slate-500">
            {soldPlayers.length} sold out of {players.length} players across {teams.length} teams
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 font-bold text-slate-700 shadow-2xs print:hidden"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
