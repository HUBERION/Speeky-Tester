import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportData } from '../types';

const statusLabel: Record<string, string> = {
  pass: 'Bestanden',
  fail: 'Nicht bestanden',
  inconclusive: 'Unklar',
};

export function downloadPdf(data: ExportData, filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Speeky-Tester – Messprotokoll', 14, 16);
  doc.setFontSize(10);
  doc.text(`Projekt: ${data.sessionName}`, 14, 24);
  doc.text(`Exportdatum: ${data.exportDate}`, 14, 30);
  doc.text(
    `Ergebnis: ${data.passCount} bestanden, ${data.failCount} nicht bestanden, ${data.inconclusiveCount} unklar (von ${data.totalSpeakers})`,
    14,
    36,
  );
  doc.text(
    `Kalibrierung: ${data.calibrationActive ? 'Aktiv' : 'Nicht kalibriert'}`,
    14,
    42,
  );

  autoTable(doc, {
    startY: 48,
    head: [
      [
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
      ],
    ],
    body: data.rows.map((r) => [
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
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 120] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? 200;
  doc.setFontSize(8);
  doc.text(`Gerät: ${data.deviceInfo}`, 14, finalY + 8);
  doc.text(`App-Version: ${data.appVersion}`, 14, finalY + 14);
  doc.save(filename);
}
