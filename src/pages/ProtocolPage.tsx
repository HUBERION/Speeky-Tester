import { useCallback, useEffect, useState } from 'react';
import {
  deleteMeasurement,
  getAllSpeakers,
  getMeasurementsForSession,
  updateMeasurement,
} from '../db';
import { useSession } from '../hooks/useSession';
import type { Measurement, Speaker } from '../types';

const statusLabel = {
  pass: 'Bestanden',
  fail: 'Nicht bestanden',
  inconclusive: 'Unklar',
};

const badgeClass = {
  pass: 'badge-pass',
  fail: 'badge-fail',
  inconclusive: 'badge-inconclusive',
};

export function ProtocolPage() {
  const { session } = useSession();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const load = useCallback(async () => {
    if (!session?.id) return;
    const [m, s] = await Promise.all([
      getMeasurementsForSession(session.id),
      getAllSpeakers(),
    ]);
    setMeasurements(m.reverse());
    setSpeakers(s);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  function getSpeaker(id: number) {
    return speakers.find((s) => s.id === id);
  }

  async function saveNotes(m: Measurement) {
    await updateMeasurement({ ...m, notes: editNotes.trim() || undefined });
    setEditingId(null);
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Messung löschen?')) return;
    await deleteMeasurement(id);
    await load();
  }

  if (!session) return <p>Lade…</p>;

  return (
    <div className="card">
      <h2>Protokoll – {session.name}</h2>
      {measurements.length === 0 ? (
        <div className="empty-state">Noch keine Messungen in dieser Sitzung.</div>
      ) : (
        measurements.map((m) => {
          const speaker = getSpeaker(m.speakerId);
          return (
            <div key={m.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="list-item-info">
                  <strong>{speaker?.name ?? `ID ${m.speakerId}`}</strong>
                  <small>{speaker?.location}</small>
                </div>
                <span className={`badge ${badgeClass[m.status]}`}>
                  {statusLabel[m.status]}
                </span>
              </div>
              <small>
                {m.frequencyHz} Hz · Erkannt: {m.detected ? 'Ja' : 'Nein'} ·{' '}
                {m.levelDbfs.toFixed(1)} dBFS · SNR {m.snrDb.toFixed(1)} dB
                {m.levelDbSpl !== undefined && ` · ${m.levelDbSpl.toFixed(1)} dB SPL`}
              </small>
              <small>{new Date(m.timestamp).toLocaleString('de-DE')}</small>
              {editingId === m.id ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                  <div className="btn-row">
                    <button type="button" className="btn btn-primary" onClick={() => void saveNotes(m)}>
                      Speichern
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {m.notes && <small>Notiz: {m.notes}</small>}
                  <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(m.id!);
                        setEditNotes(m.notes ?? '');
                      }}
                    >
                      Notiz bearbeiten
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void handleDelete(m.id!)}
                    >
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
