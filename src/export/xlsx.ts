import * as XLSX from 'xlsx';
import { tGlobal } from '../i18n';
import type { ExportData } from '../types';

export function downloadXlsx(data: ExportData, filename: string): void {
  const wb = XLSX.utils.book_new();

  const header = [
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
  ];

  const rows = data.rows.map((r) => [
    r.speakerName,
    r.location,
    r.frequencyHz,
    r.frequencyToleranceHz,
    r.detected ? tGlobal('common.yes') : tGlobal('common.no'),
    Number(r.levelDbfs.toFixed(2)),
    Number(r.noiseFloorDbfs.toFixed(2)),
    Number(r.snrDb.toFixed(2)),
    Number(r.peakDbfs.toFixed(2)),
    Number(r.avgDbfs.toFixed(2)),
    r.levelDbSpl !== undefined ? Number(r.levelDbSpl.toFixed(2)) : '',
    tGlobal(`status.${r.status}`),
    r.timestamp,
    r.notes,
  ]);

  const meta = [
    [tGlobal('doc.project'), data.sessionName],
    ...(data.sessionSite ? [[tGlobal('doc.site'), data.sessionSite]] : []),
    [tGlobal('doc.exportDate'), data.exportDate],
    [tGlobal('doc.totalSpeakers'), data.totalSpeakers],
    [tGlobal('status.pass'), data.passCount],
    [tGlobal('status.fail'), data.failCount],
    [tGlobal('status.inconclusive'), data.inconclusiveCount],
    [tGlobal('doc.calActiveLabel'), data.calibrationActive ? tGlobal('common.yes') : tGlobal('common.no')],
    [tGlobal('doc.device'), data.deviceInfo],
    [tGlobal('doc.appVersion'), data.appVersion],
    [],
    header,
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, ws, tGlobal('export.filenameSuffix'));
  XLSX.writeFile(wb, filename);
}
