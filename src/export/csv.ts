import { tGlobal } from '../i18n';
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
    `${tGlobal('doc.project')};${escapeCsv(data.sessionName)}`,
    ...(data.sessionSite
      ? [`${tGlobal('doc.site')};${escapeCsv(data.sessionSite)}`]
      : []),
    `${tGlobal('doc.exportDate')};${escapeCsv(data.exportDate)}`,
    `${tGlobal('doc.totalSpeakers')};${data.totalSpeakers}`,
    `${tGlobal('status.pass')};${data.passCount}`,
    `${tGlobal('status.fail')};${data.failCount}`,
    `${tGlobal('status.inconclusive')};${data.inconclusiveCount}`,
    `${tGlobal('doc.calActiveLabel')};${data.calibrationActive ? tGlobal('common.yes') : tGlobal('common.no')}`,
    `${tGlobal('doc.device')};${escapeCsv(data.deviceInfo)}`,
    `${tGlobal('doc.appVersion')};${escapeCsv(data.appVersion)}`,
    '',
    [
      tGlobal('doc.col.name'),
      tGlobal('doc.col.location'),
      tGlobal('doc.col.freqHz'),
      tGlobal('doc.col.spreadHz'),
      tGlobal('doc.col.detected'),
      tGlobal('doc.col.levelDbfs'),
      tGlobal('doc.col.noiseDbfs'),
      tGlobal('doc.col.snrDb'),
      tGlobal('doc.col.peakDbfs'),
      tGlobal('doc.col.meanDbfs'),
      tGlobal('doc.col.splDb'),
      tGlobal('doc.col.status'),
      tGlobal('doc.col.timestamp'),
      tGlobal('doc.col.note'),
    ].join(';'),
  ];
  for (const row of data.rows) {
    lines.push(
      [
        escapeCsv(row.speakerName),
        escapeCsv(row.location),
        row.frequencyHz,
        row.frequencyToleranceHz,
        row.detected ? tGlobal('common.yes') : tGlobal('common.no'),
        row.levelDbfs.toFixed(2),
        row.noiseFloorDbfs.toFixed(2),
        row.snrDb.toFixed(2),
        row.peakDbfs.toFixed(2),
        row.avgDbfs.toFixed(2),
        row.levelDbSpl !== undefined ? row.levelDbSpl.toFixed(2) : '',
        tGlobal(`status.${row.status}`),
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
