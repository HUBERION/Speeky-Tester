import { useState } from 'react';
import { addSpeaker, getAllSpeakers } from '../db';
import {
  findDuplicateWarnings,
  guessColumnMapping,
  mapRowsToSpeakers,
  parseImportFile,
  type ColumnMapping,
  type ImportPreview,
} from '../import/csvXls';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ onClose, onImported }: Props) {
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
      const existing = await getAllSpeakers();
      const speakers = mapRowsToSpeakers(data.rows, guessColumnMapping(data.headers));
      setWarnings(findDuplicateWarnings(existing, speakers));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    }
  }

  async function handleImport() {
    if (!preview || !mapping) return;
    setLoading(true);
    try {
      const speakers = mapRowsToSpeakers(preview.rows, mapping);
      for (const s of speakers) {
        await addSpeaker(s);
      }
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>CSV / XLS Import</h2>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

        {!preview && (
          <div className="form-group">
            <label>Datei auswählen</label>
            <input
              type="file"
              accept=".csv,.txt,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <p className="hint">
              Erwartete Spalten: name, location, note (optional)
            </p>
          </div>
        )}

        {preview && mapping && (
          <>
            <p>{preview.rows.length} Zeilen erkannt</p>
            <div className="form-group">
              <label>Name-Spalte</label>
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
              <label>Standort-Spalte</label>
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
              <label>Notiz-Spalte (optional)</label>
              <select
                value={mapping.note ?? ''}
                onChange={(e) =>
                  setMapping({
                    ...mapping,
                    note: e.target.value || undefined,
                  })
                }
              >
                <option value="">– keine –</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            {warnings.length > 0 && (
              <p className="hint" style={{ color: 'var(--warning)' }}>
                Duplikat-Warnung ({warnings.length}): {warnings.slice(0, 3).join(', ')}
                {warnings.length > 3 ? '…' : ''} – werden trotzdem importiert.
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={() => void handleImport()}
            >
              {loading ? 'Importiere…' : `${preview.rows.length} importieren`}
            </button>
          </>
        )}

        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  );
}
