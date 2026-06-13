import * as XLSX from 'xlsx';
import type { ExportData } from '../types';

const statusLabel: Record<string, string> = {
  pass: 'Bestanden',
  fail: 'Nicht bestanden',
  inconclusive: 'Unklar',
};

export function downloadXlsx(data: ExportData, filename: string): void {
  const wb = XLSX.utils.book_new();

  const header = [
    'Name',
    'Standort',
    'Frequenz Hz',
    'Streuung ±Hz',
    'Erkannt',
    'Pegel dBFS',
    'Rauschboden dBFS',
    'SNR dB',
    'Peak dBFS',
    'Mittel dBFS',
    'Pegel dB SPL',
    'Status',
    'Zeitstempel',
    'Notiz',
  ];

  const rows = data.rows.map((r) => [
    r.speakerName,
    r.location,
    r.frequencyHz,
    r.frequencyToleranceHz,
    r.detected ? 'Ja' : 'Nein',
    Number(r.levelDbfs.toFixed(2)),
    Number(r.noiseFloorDbfs.toFixed(2)),
    Number(r.snrDb.toFixed(2)),
    Number(r.peakDbfs.toFixed(2)),
    Number(r.avgDbfs.toFixed(2)),
    r.levelDbSpl !== undefined ? Number(r.levelDbSpl.toFixed(2)) : '',
    statusLabel[r.status] ?? r.status,
    r.timestamp,
    r.notes,
  ]);

  const meta = [
    ['Projekt', data.sessionName],
    ['Exportdatum', data.exportDate],
    ['Lautsprecher gesamt', data.totalSpeakers],
    ['Bestanden', data.passCount],
    ['Nicht bestanden', data.failCount],
    ['Unklar', data.inconclusiveCount],
    ['Kalibrierung aktiv', data.calibrationActive ? 'Ja' : 'Nein'],
    ['Gerät', data.deviceInfo],
    ['App-Version', data.appVersion],
    [],
    header,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, ws, 'Protokoll');
  XLSX.writeFile(wb, filename);
}
