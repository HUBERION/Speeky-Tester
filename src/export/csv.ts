import type { ExportData } from '../types';

function escapeCsv(value: string | number | boolean | undefined): string {
  const str = value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(data: ExportData): string {
  const lines: string[] = [
    `Projekt;${escapeCsv(data.sessionName)}`,
    `Exportdatum;${escapeCsv(data.exportDate)}`,
    `Lautsprecher gesamt;${data.totalSpeakers}`,
    `Bestanden;${data.passCount}`,
    `Nicht bestanden;${data.failCount}`,
    `Unklar;${data.inconclusiveCount}`,
    `Kalibrierung aktiv;${data.calibrationActive ? 'Ja' : 'Nein'}`,
    `Gerät;${escapeCsv(data.deviceInfo)}`,
    `App-Version;${escapeCsv(data.appVersion)}`,
    '',
    [
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
    ].join(';'),
  ];
  for (const row of data.rows) {
    lines.push(
      [
        escapeCsv(row.speakerName),
        escapeCsv(row.location),
        row.frequencyHz,
        row.frequencyToleranceHz,
        row.detected ? 'Ja' : 'Nein',
        row.levelDbfs.toFixed(2),
        row.noiseFloorDbfs.toFixed(2),
        row.snrDb.toFixed(2),
        row.peakDbfs.toFixed(2),
        row.avgDbfs.toFixed(2),
        row.levelDbSpl !== undefined ? row.levelDbSpl.toFixed(2) : '',
        row.status,
        escapeCsv(row.timestamp),
        escapeCsv(row.notes),
      ].join(';'),
    );
  }
  return lines.join('\n');
}

export function downloadCsv(data: ExportData, filename: string): void {
  const content = '\uFEFF' + buildCsv(data);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
