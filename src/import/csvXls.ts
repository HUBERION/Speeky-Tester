import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { tGlobal } from '../i18n';
import type { Speaker } from '../types';

export interface ParsedRow {
  [key: string]: string;
}

export interface ImportPreview {
  headers: string[];
  rows: ParsedRow[];
}

export async function parseImportFile(file: File): Promise<ImportPreview> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'txt') {
    return parseCsv(file);
  }
  if (ext === 'xls' || ext === 'xlsx') {
    return parseXls(file);
  }
  throw new Error(tGlobal('importModal.unsupported'));
}

async function parseCsv(file: File): Promise<ImportPreview> {
  const text = await file.text();
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

async function parseXls(file: File): Promise<ImportPreview> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: '' });
  const headers =
    json.length > 0
      ? Object.keys(json[0])
      : XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? [];
  return {
    headers: headers.map(String),
    rows: json.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, String(v ?? '').trim()]),
      ),
    ),
  };
}

export interface ColumnMapping {
  name: string;
  location: string;
  note?: string;
}

export type ParsedSpeaker = Omit<Speaker, 'id' | 'sessionId'>;

export function mapRowsToSpeakers(
  rows: ParsedRow[],
  mapping: ColumnMapping,
): ParsedSpeaker[] {
  const now = new Date().toISOString();
  return rows
    .map((row) => ({
      name: (row[mapping.name] ?? '').trim(),
      location: (row[mapping.location] ?? '').trim(),
      note: mapping.note ? (row[mapping.note] ?? '').trim() : undefined,
      createdAt: now,
    }))
    .filter((s) => s.name.length > 0);
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (...candidates: string[]) => {
    const idx = lower.findIndex((h) =>
      candidates.some((c) => h.includes(c)),
    );
    return idx >= 0 ? headers[idx] : '';
  };
  return {
    name: find('name', 'bezeichnung', 'id', 'lautsprecher', 'speaker') || headers[0] || '',
    location: find('standort', 'location', 'ort', 'raum', 'platz') || headers[1] || '',
    note: find('notiz', 'note', 'bemerkung', 'kommentar') || undefined,
  };
}

const DEMO_VALUES: [string, string, string][] = [
  ['LS-001', 'Hall A – entrance', 'ceiling mount'],
  ['LS-002', 'Hall A – center', ''],
  ['LS-003', 'Hall B – stage', 'wall mount left'],
  ['LS-004', 'Foyer', 'above reception'],
  ['LS-005', 'Stairwell', ''],
];

function demoHeaders(): [string, string, string] {
  return [
    tGlobal('doc.col.name'),
    tGlobal('doc.col.location'),
    tGlobal('doc.col.note'),
  ];
}

export function downloadDemoCsv(): void {
  const header = demoHeaders().join(';');
  const lines = DEMO_VALUES.map((r) => r.join(';'));
  const content = '\uFEFF' + [header, ...lines].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${tGlobal('doc.demoFilename')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDemoXlsx(): void {
  const ws = XLSX.utils.aoa_to_sheet([demoHeaders(), ...DEMO_VALUES]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, tGlobal('speakers.heading'));
  XLSX.writeFile(wb, `${tGlobal('doc.demoFilename')}.xlsx`);
}

export function findDuplicateWarnings(
  existing: Speaker[],
  incoming: ParsedSpeaker[],
): string[] {
  const warnings: string[] = [];
  for (const item of incoming) {
    const dup = existing.find(
      (e) =>
        e.name.toLowerCase() === item.name.toLowerCase() &&
        e.location.toLowerCase() === item.location.toLowerCase(),
    );
    if (dup) {
      warnings.push(`${item.name} @ ${item.location}`);
    }
  }
  return warnings;
}
