export function normalizePhotoValue(raw?: string): { photoUrl?: string; photoHint?: string } {
  const s = (raw || '').trim();
  if (!s) return {};
  if (s.startsWith('data:')) return { photoUrl: s };
  if (/^https?:\/\//i.test(s)) {
    // Google Drive share links
    if (/drive\.google\.com/i.test(s)) {
      const m = s.match(/\/open\?id=([^&?#]+)/i) || s.match(/[?&]id=([^&?#]+)/i) || s.match(/\/d\/([^/]+)/i);
      if (m && m[1]) {
        // Prefer direct view via lh3.googleusercontent.com
        const id = m[1];
        return { photoUrl: `https://lh3.googleusercontent.com/d/${id}=w400` };
      }
    }
    return { photoUrl: s };
  }
  // Bare filename -> hint only (don't render as broken URL)
  return { photoHint: s };
}

export function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2000-\u206F\uFEFF\u3000]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNameFromFilename(fn: string): string {
  const base = fn.replace(/\.[^.]+$/, '');
  const afterDash = base.match(/\s*-\s*(.+)$/);
  if (afterDash && afterDash[1]) return normalizeNameKey(afterDash[1]);
  return normalizeNameKey(base);
}
