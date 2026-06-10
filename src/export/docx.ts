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
import type { ExportData } from '../types';

const statusLabel: Record<string, string> = {
  pass: 'Bestanden',
  fail: 'Nicht bestanden',
  inconclusive: 'Unklar',
};

function cell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
  });
}

export async function downloadDocx(data: ExportData, filename: string): Promise<void> {
  const headerRow = new TableRow({
    children: [
      'Name',
      'Standort',
      'Hz',
      '±Hz',
      'Erkannt',
      'dBFS',
      'SNR',
      'Peak',
      'SPL',
      'Status',
      'Zeit',
      'Notiz',
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
          r.detected ? 'Ja' : 'Nein',
          r.levelDbfs.toFixed(1),
          r.snrDb.toFixed(1),
          r.peakDbfs.toFixed(1),
          r.levelDbSpl !== undefined ? r.levelDbSpl.toFixed(1) : '–',
          statusLabel[r.status] ?? r.status,
          new Date(r.timestamp).toLocaleString('de-DE'),
          r.notes,
        ].map((t) => cell(t)),
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Speeky-Tester – Messprotokoll',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [new TextRun(`Projekt: ${data.sessionName}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Exportdatum: ${data.exportDate}`)],
          }),
          new Paragraph({
            children: [
              new TextRun(
                `Ergebnis: ${data.passCount} bestanden, ${data.failCount} nicht bestanden, ${data.inconclusiveCount} unklar`,
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                `Kalibrierung: ${data.calibrationActive ? 'Aktiv' : 'Nicht kalibriert'}`,
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
            children: [new TextRun({ text: `Gerät: ${data.deviceInfo}`, size: 16 })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `App-Version: ${data.appVersion}`, size: 16 }),
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
