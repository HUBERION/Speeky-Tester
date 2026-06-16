import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { localeFor, tGlobal } from '../i18n';
import type { ExportData } from '../types';

function cell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
  });
}

export async function downloadDocx(data: ExportData, filename: string): Promise<void> {
  const headerRow = new TableRow({
    children: [
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
    ].map((h) => cell(h)),
  });

  const dataRows = data.rows.map(
    (r) =>
      new TableRow({
        children: [
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
        ].map((t) => cell(t)),
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: tGlobal('doc.reportTitle'),
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [new TextRun(`${tGlobal('doc.project')}: ${data.sessionName}`)],
          }),
          ...(data.sessionSite
            ? [
                new Paragraph({
                  children: [
                    new TextRun(`${tGlobal('doc.site')}: ${data.sessionSite}`),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            children: [new TextRun(`${tGlobal('doc.exportDate')}: ${data.exportDate}`)],
          }),
          new Paragraph({
            children: [
              new TextRun(
                `${tGlobal('doc.resultLabel')}: ${data.passCount} ${tGlobal('doc.passedWord')}, ${data.failCount} ${tGlobal('doc.failedWord')}, ${data.inconclusiveCount} ${tGlobal('doc.inconclusiveWord')}`,
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                `${tGlobal('doc.calibration')}: ${data.calibrationActive ? tGlobal('doc.calActive') : tGlobal('doc.calNotCalibrated')}`,
              ),
            ],
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: `${tGlobal('doc.device')}: ${data.deviceInfo}`, size: 16 })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${tGlobal('doc.appVersion')}: ${data.appVersion}`, size: 16 }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
