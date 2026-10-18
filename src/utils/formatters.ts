export function formatPoints(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('en-IN');
}

export function formatINR(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹' + val.toLocaleString('en-IN');
}

export function getRoleBadgeStyle(role: string): { bg: string; text: string; border: string } {
  switch (role) {
    case 'All-Rounder':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'Batsman':
      return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
    case 'Bowler':
      return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    case 'Wicket-Keeper':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  }
}

export function getStatusBadgeStyle(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'SOLD':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' };
    case 'AVAILABLE':
      return { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/40' };
    case 'UNSOLD':
      return { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' };
    default:
      return { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/40' };
  }
}

export function getTeamStatusBadge(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'OK':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' };
    case 'FULL':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' };
    case 'OVER POINTS':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' };
    case 'OVER 13 PLAYERS':
      return { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' };
    default:
      return { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/40' };
  }
}

/**
 * Safely formats transaction timestamp without throwing Invalid Date errors
 */
export function formatTransactionTime(timestamp?: string): string {
  if (!timestamp) return 'Sold';

  const trimmed = String(timestamp).trim();
  if (!trimmed) return 'Sold';

  // If it's already a time string e.g. "10:15:01 am" or "10:15 am" or "14:20:00"
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  } catch {
    // fallback
  }

  return trimmed;
}
