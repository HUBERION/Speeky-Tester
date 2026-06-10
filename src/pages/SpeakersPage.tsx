import { useCallback, useEffect, useState } from 'react';
import {
  addSpeaker,
  deleteSpeaker,
  getAllSpeakers,
  updateSpeaker,
} from '../db';
import type { Speaker } from '../types';
import { ImportModal } from '../components/ImportModal';

export function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setSpeakers(await getAllSpeakers());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setName('');
    setLocation('');
    setNote('');
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(speaker: Speaker) {
    setEditing(speaker);
    setName(speaker.name);
    setLocation(speaker.location);
    setNote(speaker.note ?? '');
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (editing?.id) {
      await updateSpeaker({
        ...editing,
        name: name.trim(),
        location: location.trim(),
        note: note.trim() || undefined,
      });
    } else {
      await addSpeaker({
        name: name.trim(),
        location: location.trim(),
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }
    resetForm();
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Lautsprecher wirklich löschen?')) return;
    await deleteSpeaker(id);
    await load();
  }

  return (
    <>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Hinzufügen
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowImport(true)}
        >
          Import CSV/XLS
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>{editing ? 'Bearbeiten' : 'Neuer Lautsprecher'}</h2>
          <div className="form-group">
            <label>Name / ID</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Standort</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Notiz (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => void handleSave()}>
              Speichern
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>Lautsprecherliste ({speakers.length})</h2>
        {speakers.length === 0 ? (
          <div className="empty-state">
            Noch keine Lautsprecher. Fügen Sie welche hinzu oder importieren Sie
            eine CSV/XLS-Datei.
          </div>
        ) : (
          speakers.map((s) => (
            <div key={s.id} className="list-item">
              <div className="list-item-info">
                <strong>{s.name}</strong>
                <small>{s.location}</small>
                {s.note && <small>{s.note}</small>}
              </div>
              <div className="btn-row" style={{ width: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem' }}
                  onClick={() => startEdit(s)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem' }}
                  onClick={() => void handleDelete(s.id!)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            void load();
          }}
        />
      )}
    </>
  );
}
