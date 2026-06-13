import { useState } from 'react';
import { buildExportData } from '../export/buildExportData';
import { downloadCsv } from '../export/csv';
import { downloadDocx } from '../export/docx';
import { downloadPdf } from '../export/pdf';
import { downloadXlsx } from '../export/xlsx';
import { useSession } from '../hooks/useSession';
import { useT } from '../i18n';

export function ExportPage() {
  const { t } = useT();
  const { session } = useSession();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  async function handleExport(type: 'pdf' | 'docx' | 'csv' | 'xlsx') {
    if (!session?.id) return;
    setError('');
    setLoading(type);
    try {
      const data = await buildExportData(session.id);
      const suffix = t('export.filenameSuffix');
      const base = session.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
      if (type === 'pdf') downloadPdf(data, `${base}_${suffix}.pdf`);
      if (type === 'csv') downloadCsv(data, `${base}_${suffix}.csv`);
      if (type === 'xlsx') downloadXlsx(data, `${base}_${suffix}.xlsx`);
      if (type === 'docx') await downloadDocx(data, `${base}_${suffix}.docx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('export.failed'));
    } finally {
      setLoading('');
    }
  }

  if (!session) return <p>{t('common.loading')}</p>;

  return (
    <>
      <div className="card">
        <h2>{t('export.title', { name: session.name })}</h2>
        <p className="hint">{t('export.hint')}</p>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={!!loading}
          onClick={() => void handleExport('pdf')}
        >
          {loading === 'pdf' ? t('export.creatingPdf') : t('export.asPdf')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() => void handleExport('docx')}
        >
          {loading === 'docx' ? t('export.creatingWord') : t('export.asWord')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() => void handleExport('xlsx')}
        >
          {loading === 'xlsx' ? t('export.creatingExcel') : t('export.asExcel')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!!loading}
          onClick={() => void handleExport('csv')}
        >
          {loading === 'csv' ? t('export.creatingCsv') : t('export.asCsv')}
        </button>
      </div>
    </>
  );
}
