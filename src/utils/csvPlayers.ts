import { ImportPlayerRow, PlayerRole } from '../types';
import { normalizePhotoValue } from './photoUtils';

/**
 * Parses raw CSV/text roster data into editable import rows used by the
 * admin bulk-import table. Photos are supported through an optional PHOTO
 * column (image URL); admins can also attach photos manually in the table.
 *
 * Recognised headers: ID / SR / SR NO, NAME, ROLE, VILLAGE / CITY / TOWN,
 * BASE PRICE / PRICE, PHOTO / PHOTO URL / IMAGE.
 *
 * The admin can also choose which fields to actually import (see
 * ImportFieldSelection). Any field that is switched off is ignored and left
 * empty on the resulting rows.
 */

export type ImportFieldKey = 'id' | 'name' | 'role' | 'village' | 'basePrice' | 'photo';

export interface ImportFieldSelection {
  id: boolean;
  name: boolean;
  role: boolean;
  village: boolean;
  basePrice: boolean;
  photo: boolean;
}

export interface ImportFieldDef {
  key: ImportFieldKey;
  label: string;
  hint: string;
  /** A player cannot be imported without a name. */
  required?: boolean;
}

/** Fields an admin can toggle on/off while importing, in display order. */
export const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: 'name', label: 'Name', hint: 'Player full name', required: true },
  { key: 'id', label: 'ID / Sr No', hint: 'Roster / jersey order number' },
  { key: 'role', label: 'Role', hint: 'Batsman, Bowler, All-Rounder or Wicket-Keeper' },
  { key: 'village', label: 'Village', hint: 'Home town / village' },
  { key: 'basePrice', label: 'Base Price', hint: 'Starting reserve price' },
  { key: 'photo', label: 'Photo', hint: 'Image URL from the CSV' },
];

export const DEFAULT_IMPORT_FIELDS: ImportFieldSelection = {
  id: true,
  name: true,
  role: true,
  village: true,
  basePrice: true,
  photo: true,
};

let rowKeyCounter = 0;
export function newRowKey(): string {
  rowKeyCounter += 1;
  return `row_${Date.now().toString(36)}_${rowKeyCounter}`;
}

/** Splits one CSV line, honouring double quotes and escaped quotes. */
export function parseCsvLine(line: string): string[] {
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
}

export function normalizeRole(raw?: string): PlayerRole {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('wk') || lower.includes('keep') || lower.includes('यष्टिरक्षक') || lower.includes('यष्टीरक्षक')) {
    return 'Wicket-Keeper';
  }
  if (lower.includes('bat') || lower.includes('फलंदाज')) return 'Batsman';
  if (lower.includes('bowl') || lower.includes('गोलंदाज')) return 'Bowler';
  if (lower.includes('all') && lower.includes('round')) return 'All-Rounder';
  if (lower.includes('allround') || lower.includes('ar') || lower.includes('alr') || lower.includes('अष्टपैलू')) return 'All-Rounder';
  return 'All-Rounder';
}

const HEADER_TOKENS = [
  'id', 'srno', 'sr', 'no', 'slno', 'playerid', 'name', 'playername', 'player',
  'role', 'village', 'city', 'town', 'location', 'price', 'baseprice', 'photo',
  'photourl', 'image',
];

export function parsePlayerCsv(
  csvText: string,
  fields: ImportFieldSelection = DEFAULT_IMPORT_FIELDS
): ImportPlayerRow[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  let idCol = -1;
  let srCol = -1;
  let nameCol = -1;
  let roleCol = -1;
  let villageCol = -1;
  let priceCol = -1;
  let photoCol = -1;

  let startIndex = 0;
  const firstParts = parseCsvLine(lines[0]);
  const lowerFirst = firstParts.map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const isHeader = lowerFirst.some((h) => HEADER_TOKENS.includes(h));

  if (isHeader) {
    startIndex = 1;
    lowerFirst.forEach((h, idx) => {
      if (h === 'id' || h === 'playerid' || h === 'no' || h === 'slno') idCol = idx;
      else if (h === 'sr' || h === 'srno') srCol = idx;
      else if (h.includes('name') || h === 'player') nameCol = idx;
      else if (h.includes('role')) roleCol = idx;
      else if (h.includes('village') || h.includes('city') || h.includes('town') || h.includes('location')) villageCol = idx;
      else if (h.includes('price')) priceCol = idx;
      else if (h.includes('photo') || h.includes('image')) photoCol = idx;
    });
  }

  if (nameCol === -1) {
    // No header detected: fall back to positional columns.
    if (firstParts.length >= 4) {
      idCol = 0;
      nameCol = 1;
      roleCol = 2;
      villageCol = 3;
    } else if (firstParts.length === 3) {
      const firstIsNum = /^\d+$/.test(firstParts[0].replace(/\D/g, ''));
      if (firstIsNum) {
        idCol = 0;
        nameCol = 1;
        roleCol = 2;
      } else {
        nameCol = 0;
        roleCol = 1;
        villageCol = 2;
      }
    } else if (firstParts.length === 2) {
      nameCol = 0;
      roleCol = 1;
    } else {
      nameCol = 0;
    }
  }

  const rows: ImportPlayerRow[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    if (parts.length === 0 || !parts.some((p) => p.length > 0)) continue;

    const rawName = nameCol >= 0 && parts[nameCol] ? parts[nameCol] : '';
    if (!rawName.trim()) continue;

    let id: number | null = null;
    if (fields.id) {
      const idSource = (srCol >= 0 ? parts[srCol] : '') || (idCol >= 0 ? parts[idCol] : '');
      const numOnly = (idSource || '').replace(/[^0-9]/g, '');
      if (numOnly) {
        const parsed = parseInt(numOnly, 10);
        if (!isNaN(parsed) && parsed > 0) id = parsed;
      }
    }

    const role = fields.role ? normalizeRole(roleCol >= 0 ? parts[roleCol] : '') : 'All-Rounder';
    const village =
      fields.village && villageCol >= 0 && parts[villageCol] ? parts[villageCol].trim() : '';
    const basePrice =
      fields.basePrice && priceCol >= 0 && parts[priceCol]
        ? parts[priceCol].replace(/[^0-9]/g, '')
        : '';
    const photoUrlRaw =
      fields.photo && photoCol >= 0 && parts[photoCol] ? parts[photoCol].trim() : '';
    const { photoUrl, photoHint } = normalizePhotoValue(photoUrlRaw);

    rows.push({
      key: newRowKey(),
      id,
      srNo: id !== null ? id : null,
      name: rawName.trim().toUpperCase(),
      role,
      village: village.toUpperCase(),
      basePrice,
      photoUrl,
      photoHint: photoHint || undefined,
      fromCsv: true,
    });
  }

  return rows;
}

export function makeBlankRow(): ImportPlayerRow {
  return {
    key: newRowKey(),
    id: null,
    srNo: null,
    name: '',
    role: 'All-Rounder',
    village: '',
    basePrice: '',
    photoUrl: '',
  };
}

export function buildSampleCsv(): string {
  return [
    'ID,NAME,ROLE,VILLAGE,BASE PRICE,PHOTO',
    '1,ROHIT SHARMA,Batsman,Mumbai,500,',
    '2,JASPRIT BUMRAH,Bowler,Ahmedabad,500,',
    '3,RISHABH PANT,Wicket-Keeper,Roorkee,500,',
    '4,RAVINDRA JADEJA,All-Rounder,Jamnagar,500,',
  ].join('\n');
}
