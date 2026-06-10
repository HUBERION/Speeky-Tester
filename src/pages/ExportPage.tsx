import { useState } from 'react';
import { buildExportData } from '../export/buildExportData';
import { downloadCsv } from '../export/csv';
import { downloadDocx } from '../export/docx';
import { downloadPdf } from '../export/pdf';
import { useSession } from '../hooks/useSession';

export function ExportPage() {
  const { session } = useSession();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function handleExport(type: 'pdf' | 'docx' | 'csv') {
    if (!session?.id) return;
    setError('');
    setLoading(type);
    try {
      const data = await buildExportData(session.id);
      const base = session.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
      if (type === 'pdf') downloadPdf(data, `${base}_protokoll.pdf`);
      if (type === 'csv') downloadCsv(data, `${base}_protokoll.csv`);
      if (type === 'docx') await downloadDocx(data, `${base}_protokoll.docx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export fehlgeschlagen');
    } finally {
      setLoading('');
    }
  }

  if (!session) return <p>Lade…</p>;

  return (
    <>
      <div className="card">
        <h2>Export – {session.name}</h2>
        <p className="hint">
          Exportiert alle Messungen der aktiven Sitzung mit Lautsprecherdaten,
          Pegelwerten und Status.
        </p>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!!loading}
          onClick={() => void handleExport('pdf')}
        >
          {loading === 'pdf' ? 'Erstelle PDF…' : 'Als PDF exportieren'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() => void handleExport('docx')}
        >
          {loading === 'docx' ? 'Erstelle Word…' : 'Als Word (.docx) exportieren'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() => void handleExport('csv')}
        >
          {loading === 'csv' ? 'Erstelle CSV…' : 'Als CSV exportieren'}
        </button>
      </div>
    </>
  );
}
