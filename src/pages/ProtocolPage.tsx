import { useCallback, useEffect, useState } from 'react';
import {
  deleteMeasurement,
  getMeasurementsForSession,
  getSpeakersForSession,
  updateMeasurement,
} from '../db';
import { useSession } from '../hooks/useSession';
import { fmtDateTime, useT } from '../i18n';
import { getMeasurementDisplay } from '../lib/measurementDisplay';
import type { Measurement, MeasurementStatus, Speaker } from '../types';

const badgeClass: Record<MeasurementStatus, string> = {
  pass: 'badge-pass',
  fail: 'badge-fail',
  inconclusive: 'badge-inconclusive',
};

export function ProtocolPage() {
  const { t } = useT();
  const { session } = useSession();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');

  const load = useCallback(async () => {
    if (!session?.id) return;
    const [m, s] = await Promise.all([
      getMeasurementsForSession(session.id),
      getSpeakersForSession(session.id),
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
    if (!confirm(t('protocol.deleteConfirm'))) return;
    await deleteMeasurement(id);
    await load();
  }

  if (!session) return <p>{t('common.loading')}</p>;

  return (
    <div className="card">
      <h2>{t('protocol.title', { name: session.name })}</h2>
      {measurements.length === 0 ? (
        <div className="empty-state">{t('protocol.empty')}</div>
      ) : (
        measurements.map((m) => {
          const speaker =
            m.speakerId != null ? getSpeaker(m.speakerId) : undefined;
          const display = getMeasurementDisplay(m, speaker);
          return (
            <div key={m.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="list-item-info">
                  <strong>{display.name}</strong>
                  <small>{display.location}</small>
                  {display.isAdhoc && (
                    <span className="badge badge-pending" style={{ marginTop: '0.25rem' }}>
                      {t('protocol.adhoc')}
                    </span>
                  )}
                </div>
                <span className={`badge ${badgeClass[m.status]}`}>
                  {t(`status.${m.status}`)}
                </span>
              </div>
              <small>
                {m.frequencyHz} Hz ±{m.frequencyToleranceHz ?? 50} Hz ·{' '}
                {t('protocol.detected')}: {m.detected ? t('common.yes') : t('common.no')} ·{' '}
                {m.levelDbfs.toFixed(1)} dBFS · SNR {m.snrDb.toFixed(1)} dB
                {m.levelDbSpl !== undefined && ` · ${m.levelDbSpl.toFixed(1)} dB SPL`}
              </small>
              <small>{fmtDateTime(m.timestamp)}</small>
              {editingId === m.id ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                  <div className="btn-row">
                    <button type="button" className="btn btn-primary" onClick={() => void saveNotes(m)}>
                      {t('common.save')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {m.notes && <small>{t('protocol.noteLabel', { note: m.notes })}</small>}
                  <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingId(m.id!);
                        setEditNotes(m.notes ?? '');
                      }}
                    >
                      {t('protocol.editNote')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => void handleDelete(m.id!)}
                    >
                      {t('common.delete')}
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
