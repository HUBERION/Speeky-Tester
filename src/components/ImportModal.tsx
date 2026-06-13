import { useState } from 'react';
import { addSpeaker, getSpeakersForSession } from '../db';
import { useT } from '../i18n';
import {
  downloadDemoCsv,
  downloadDemoXlsx,
  findDuplicateWarnings,
  guessColumnMapping,
  mapRowsToSpeakers,
  parseImportFile,
  type ColumnMapping,
  type ImportPreview,
} from '../import/csvXls';

interface Props {
  sessionId: number;
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ sessionId, onClose, onImported }: Props) {
  const { t } = useT();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setError('');
    try {
      const data = await parseImportFile(file);
      setPreview(data);
      setMapping(guessColumnMapping(data.headers));
      const existing = await getSpeakersForSession(sessionId);
      const speakers = mapRowsToSpeakers(data.rows, guessColumnMapping(data.headers));
      setWarnings(findDuplicateWarnings(existing, speakers));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('importModal.failed'));
    }
  }

  async function handleImport() {
    if (!preview || !mapping) return;
    setLoading(true);
    try {
      const speakers = mapRowsToSpeakers(preview.rows, mapping);
      for (const s of speakers) {
        await addSpeaker({ ...s, sessionId });
      }
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('importModal.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('importModal.title')}</h2>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

        {!preview && (
          <div className="form-group">
            <label>{t('importModal.chooseFile')}</label>
            <input
              type="file"
              accept=".csv,.txt,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <p className="hint">{t('importModal.expectedColumns')}</p>
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadDemoCsv()}
              >
                {t('importModal.templateCsv')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadDemoXlsx()}
              >
                {t('importModal.templateExcel')}
              </button>
            </div>
          </div>
        )}

        {preview && mapping && (
          <>
            <p>{t('importModal.rowsDetected', { count: preview.rows.length })}</p>
            <div className="form-group">
              <label>{t('importModal.nameColumn')}</label>
              <select
                value={mapping.name}
                onChange={(e) =>
                  setMapping({ ...mapping, name: e.target.value })
                }
              >
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('importModal.locationColumn')}</label>
              <select
                value={mapping.location}
                onChange={(e) =>
                  setMapping({ ...mapping, location: e.target.value })
                }
              >
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{t('importModal.noteColumn')}</label>
              <select
                value={mapping.note ?? ''}
                onChange={(e) =>
                  setMapping({
                    ...mapping,
                    note: e.target.value || undefined,
                  })
                }
              >
                <option value="">{t('importModal.noneOption')}</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            {warnings.length > 0 && (
              <p className="hint" style={{ color: 'var(--warning)' }}>
                {t('importModal.duplicateWarning', {
                  count: warnings.length,
                  names: warnings.slice(0, 3).join(', '),
                  more: warnings.length > 3 ? '…' : '',
                })}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => void handleImport()}
            >
              {loading
                ? t('importModal.importing')
                : t('importModal.importN', { count: preview.rows.length })}
            </button>
          </>
        )}

        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('importModal.close')}
        </button>
      </div>
    </div>
  );
}
