import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { localeFor, tGlobal } from '../i18n';
import type { ExportData } from '../types';

export function downloadPdf(data: ExportData, filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text(tGlobal('doc.reportTitle'), 14, 16);
  doc.setFontSize(10);
  doc.text(`${tGlobal('doc.project')}: ${data.sessionName}`, 14, 24);
  let metaY = 30;
  if (data.sessionSite) {
    doc.text(`${tGlobal('doc.site')}: ${data.sessionSite}`, 14, metaY);
    metaY += 6;
  }
  doc.text(`${tGlobal('doc.exportDate')}: ${data.exportDate}`, 14, metaY);
  metaY += 6;
  doc.text(
    `${tGlobal('doc.resultLabel')}: ${data.passCount} ${tGlobal('doc.passedWord')}, ${data.failCount} ${tGlobal('doc.failedWord')}, ${data.inconclusiveCount} ${tGlobal('doc.inconclusiveWord')} ${tGlobal('doc.ofTotal', { total: data.totalSpeakers })}`,
    14,
    metaY,
  );
  metaY += 6;
  doc.text(
    `${tGlobal('doc.calibration')}: ${data.calibrationActive ? tGlobal('doc.calActive') : tGlobal('doc.calNotCalibrated')}`,
    14,
    metaY,
  );

  autoTable(doc, {
    startY: metaY + 6,
    head: [
      [
        tGlobal('doc.col.name'),
        tGlobal('doc.col.location'),
        tGlobal('doc.col.hz'),
        tGlobal('doc.col.tolHz'),
        tGlobal('doc.col.detected'),
        tGlobal('doc.col.dbfs'),
        tGlobal('doc.col.snr'),
        tGlobal('doc.col.peak'),
        tGlobal('doc.col.spl'),
        tGlobal('doc.col.status'),
        tGlobal('doc.col.time'),
        tGlobal('doc.col.note'),
      ],
    ],
    body: data.rows.map((r) => [
      r.speakerName,
      r.location,
      String(r.frequencyHz),
      String(r.frequencyToleranceHz),
      r.detected ? tGlobal('common.yes') : tGlobal('common.no'),
      r.levelDbfs.toFixed(1),
      r.snrDb.toFixed(1),
      r.peakDbfs.toFixed(1),
      r.levelDbSpl !== undefined ? r.levelDbSpl.toFixed(1) : '–',
      tGlobal(`status.${r.status}`),
      new Date(r.timestamp).toLocaleString(localeFor()),
      r.notes,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 120] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 200;
  doc.setFontSize(8);
  doc.text(`${tGlobal('doc.device')}: ${data.deviceInfo}`, 14, finalY + 8);
  doc.text(`${tGlobal('doc.appVersion')}: ${data.appVersion}`, 14, finalY + 14);
  doc.save(filename);
}
