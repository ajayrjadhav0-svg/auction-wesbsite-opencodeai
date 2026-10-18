/**
 * Preset cricket player photo avatars (SVG Data URIs)
 * Allows users to choose an instant photo avatar even if they don't have an image file on their device.
 */

export interface PresetAvatar {
  id: string;
  label: string;
  role: string;
  icon: string;
  dataUri: string;
}

export const PRESET_PLAYER_AVATARS: PresetAvatar[] = [
  {
    id: 'batsman-pro',
    label: 'Power Batsman',
    role: 'Batsman',
    icon: '🏏',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%231e1b4b"/><stop offset="100%" stop-color="%234338ca"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg1)"/><circle cx="80" cy="58" r="28" fill="%23fde047"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%236366f1"/><text x="80" y="68" font-size="34" text-anchor="middle">🏏</text><rect x="62" y="112" width="36" height="18" rx="6" fill="%23fbbf24"/><text x="80" y="125" font-size="10" font-family="sans-serif" font-weight="900" fill="%231e1b4b" text-anchor="middle">BATSMAN</text></svg>',
  },
  {
    id: 'bowler-pace',
    label: 'Express Bowler',
    role: 'Bowler',
    icon: '🎯',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%230284c7"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg2)"/><circle cx="80" cy="58" r="28" fill="%23ef4444"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%230284c7"/><text x="80" y="68" font-size="34" text-anchor="middle">🎯</text><rect x="62" y="112" width="36" height="18" rx="6" fill="%23ef4444"/><text x="80" y="125" font-size="10" font-family="sans-serif" font-weight="900" fill="%23ffffff" text-anchor="middle">BOWLER</text></svg>',
  },
  {
    id: 'allrounder-captain',
    label: 'Captain All-Rounder',
    role: 'All-Rounder',
    icon: '⚡',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23064e3b"/><stop offset="100%" stop-color="%23059669"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg3)"/><circle cx="80" cy="58" r="28" fill="%2334d399"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%2310b981"/><text x="80" y="68" font-size="34" text-anchor="middle">⚡</text><rect x="52" y="112" width="56" height="18" rx="6" fill="%23fbbf24"/><text x="80" y="125" font-size="10" font-family="sans-serif" font-weight="900" fill="%23064e3b" text-anchor="middle">ALL-ROUNDER</text></svg>',
  },
  {
    id: 'keeper-glove',
    label: 'Wicket-Keeper',
    role: 'Wicket-Keeper',
    icon: '🧤',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23581c87"/><stop offset="100%" stop-color="%239333ea"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg4)"/><circle cx="80" cy="58" r="28" fill="%23c084fc"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%23a855f7"/><text x="80" y="68" font-size="34" text-anchor="middle">🧤</text><rect x="60" y="112" width="40" height="18" rx="6" fill="%23e9d5ff"/><text x="80" y="125" font-size="10" font-family="sans-serif" font-weight="900" fill="%23581c87" text-anchor="middle">KEEPER</text></svg>',
  },
  {
    id: 'jersey-18',
    label: 'King Jersey #18',
    role: 'Batsman',
    icon: '👑',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23881337"/><stop offset="100%" stop-color="%23e11d48"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg5)"/><circle cx="80" cy="58" r="28" fill="%23fecdd3"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%23be123c"/><text x="80" y="68" font-size="34" text-anchor="middle">👑</text><rect x="64" y="112" width="32" height="18" rx="6" fill="%23fde047"/><text x="80" y="125" font-size="11" font-family="sans-serif" font-weight="900" fill="%23881337" text-anchor="middle">#18</text></svg>',
  },
  {
    id: 'jersey-7',
    label: 'Legend Jersey #7',
    role: 'Wicket-Keeper',
    icon: '🦁',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2378350f"/><stop offset="100%" stop-color="%23d97706"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg6)"/><circle cx="80" cy="58" r="28" fill="%23fef3c7"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%23b45309"/><text x="80" y="68" font-size="34" text-anchor="middle">🦁</text><rect x="66" y="112" width="28" height="18" rx="6" fill="%23fef08a"/><text x="80" y="125" font-size="11" font-family="sans-serif" font-weight="900" fill="%2378350f" text-anchor="middle">#7</text></svg>',
  },
  {
    id: 'spin-wizard',
    label: 'Mystery Spinner',
    role: 'Bowler',
    icon: '🌀',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg7" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%2314532d"/><stop offset="100%" stop-color="%2316a34a"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg7)"/><circle cx="80" cy="58" r="28" fill="%23bbf7d0"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%2322c55e"/><text x="80" y="68" font-size="34" text-anchor="middle">🌀</text><rect x="60" y="112" width="40" height="18" rx="6" fill="%23fef08a"/><text x="80" y="125" font-size="10" font-family="sans-serif" font-weight="900" fill="%2314532d" text-anchor="middle">SPINNER</text></svg>',
  },
  {
    id: 'jersey-45',
    label: 'Hitman Jersey #45',
    role: 'Batsman',
    icon: '⚡',
    dataUri: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg8" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%231e3a8a"/><stop offset="100%" stop-color="%232563eb"/></linearGradient></defs><rect width="160" height="160" rx="32" fill="url(%23bg8)"/><circle cx="80" cy="58" r="28" fill="%23bfdbfe"/><path d="M40 134c0-24 18-38 40-38s40 14 40 38" fill="%233b82f6"/><text x="80" y="68" font-size="34" text-anchor="middle">⚡</text><rect x="64" y="112" width="32" height="18" rx="6" fill="%23facc15"/><text x="80" y="125" font-size="11" font-family="sans-serif" font-weight="900" fill="%231e3a8a" text-anchor="middle">#45</text></svg>',
  },
];

export function getDefaultAvatarForRole(role?: string): string {
  switch (role) {
    case 'Bowler':
      return PRESET_PLAYER_AVATARS[1].dataUri;
    case 'All-Rounder':
      return PRESET_PLAYER_AVATARS[2].dataUri;
    case 'Wicket-Keeper':
    case 'Wicketkeeper':
      return PRESET_PLAYER_AVATARS[3].dataUri;
    case 'Batsman':
    default:
      return PRESET_PLAYER_AVATARS[0].dataUri;
  }
}
