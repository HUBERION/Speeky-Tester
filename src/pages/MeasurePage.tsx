import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addMeasurement,
  getAllSpeakers,
  getCalibration,
  getMeasurementsForSession,
} from '../db';
import {
  applySplCalibration,
  AudioAnalyzer,
  formatFrequencyBand,
  getDeviceInfo,
} from '../audio/analyzer';
import { useSession } from '../hooks/useSession';
import type { LiveFrame, MeasurementResult, Speaker } from '../types';

type Phase = 'select' | 'countdown' | 'measuring' | 'result';

const statusLabel = {
  pass: 'Bestanden',
  fail: 'Nicht bestanden',
  inconclusive: 'Unklar',
};

export function MeasurePage() {
  const { session } = useSession();
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [testedIds, setTestedIds] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState(19000);
  const [frequencyTolerance, setFrequencyTolerance] = useState(50);
  const [duration, setDuration] = useState(5000);
  const [phase, setPhase] = useState<Phase>('select');
  const [countdown, setCountdown] = useState(3);
  const [live, setLive] = useState<LiveFrame | null>(null);
  const [result, setResult] = useState<MeasurementResult | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.id) return;
    const [allSpeakers, measurements] = await Promise.all([
      getAllSpeakers(),
      getMeasurementsForSession(session.id),
    ]);
    setSpeakers(allSpeakers);
    setTestedIds(new Set(measurements.map((m) => m.speakerId)));
    setFrequency(session.settings.defaultFrequency);
    setFrequencyTolerance(session.settings.frequencyToleranceHz);
    setDuration(session.settings.defaultDurationMs);
    if (allSpeakers.length > 0 && !selectedId) {
      const next = allSpeakers.find((s) => !measurements.some((m) => m.speakerId === s.id));
      setSelectedId(next?.id ?? allSpeakers[0].id ?? null);
    }
  }, [session, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      analyzerRef.current?.stop();
    };
  }, []);

  const selected = speakers.find((s) => s.id === selectedId);

  async function startCountdown() {
    setError('');
    if (!selectedId || !session?.id) return;
    setPhase('countdown');
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    await runMeasurement();
  }

  async function runMeasurement() {
    if (!selectedId || !session?.id) return;
    setPhase('measuring');
    setLive(null);
    setResult(null);
    try {
      if (!analyzerRef.current) {
        analyzerRef.current = new AudioAnalyzer();
      }
      const calibration = await getCalibration();
      const measurement = await analyzerRef.current.measure(
        frequency,
        duration,
        session.settings.passSnrThreshold,
        frequencyTolerance,
        setLive,
      );
      const levelDbSpl = applySplCalibration(measurement.levelDbfs, calibration);
      setResult({ ...measurement, levelDbSpl });
      setPhase('result');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Mikrofon-Zugriff fehlgeschlagen. Bitte Berechtigung erteilen.',
      );
      setPhase('select');
    }
  }

  async function saveResult() {
    if (!result || !selectedId || !session?.id) return;
    await addMeasurement({
      sessionId: session.id,
      speakerId: selectedId,
      frequencyHz: frequency,
      frequencyToleranceHz: frequencyTolerance,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      detected: result.detected,
      levelDbfs: result.levelDbfs,
      noiseFloorDbfs: result.noiseFloorDbfs,
      snrDb: result.snrDb,
      peakDbfs: result.peakDbfs,
      avgDbfs: result.avgDbfs,
      levelDbSpl: result.levelDbSpl,
      status: result.status,
      notes: notes.trim() || undefined,
      deviceInfo: getDeviceInfo(),
    });
    setNotes('');
    setResult(null);
    setPhase('select');
    const idx = speakers.findIndex((s) => s.id === selectedId);
    const next = speakers.slice(idx + 1).find((s) => !testedIds.has(s.id!));
    if (next?.id) setSelectedId(next.id);
    await load();
  }

  if (!session) {
    return <p>Lade Sitzung…</p>;
  }

  if (speakers.length === 0) {
    return (
      <div className="empty-state">
        <p>Keine Lautsprecher vorhanden.</p>
        <Link to="/speakers" className="btn btn-primary">
          Lautsprecher hinzufügen
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          {error}
        </div>
      )}

      <div className="card">
        <h2>Lautsprecher wählen</h2>
        <div className="form-group">
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            disabled={phase !== 'select' && phase !== 'result'}
          >
            {speakers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} – {s.location}
                {testedIds.has(s.id!) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
        {selected && (
          <p className="hint">
            {selected.note || 'Keine Notiz'} · Fortschritt:{' '}
            {testedIds.size}/{speakers.length}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Messparameter</h2>
        <div className="form-group">
          <label>Zielfrequenz (Hz)</label>
          <input
            type="number"
            min={10000}
            max={24000}
            step={100}
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
            disabled={phase === 'measuring' || phase === 'countdown'}
          />
          <p className="hint">Empfohlen: 17.000–20.000 Hz</p>
        </div>
        <div className="form-group">
          <label>Frequenz-Streuung (± Hz)</label>
          <input
            type="number"
            min={0}
            max={500}
            step={10}
            value={frequencyTolerance}
            onChange={(e) => setFrequencyTolerance(Number(e.target.value))}
            disabled={phase === 'measuring' || phase === 'countdown'}
          />
          <p className="hint">
            Messbereich: {formatFrequencyBand(frequency, frequencyTolerance)}
          </p>
        </div>
        <div className="form-group">
          <label>Messdauer (Sekunden)</label>
          <input
            type="number"
            min={2}
            max={30}
            value={duration / 1000}
            onChange={(e) => setDuration(Number(e.target.value) * 1000)}
            disabled={phase === 'measuring' || phase === 'countdown'}
          />
        </div>
      </div>

      {phase === 'select' && (
        <div className="card">
          <p className="hint">
            Starten Sie den <strong>externen Testton</strong> an der PA-Anlage.
            Tippen Sie dann auf „Messung vorbereiten“ – nach dem Countdown beginnt
            die Aufnahme.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void startCountdown()}
          >
            Messung vorbereiten
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="card">
          <p style={{ textAlign: 'center' }}>Externen Ton jetzt starten!</p>
          <div className="countdown">{countdown}</div>
        </div>
      )}

      {phase === 'measuring' && live && (
        <div className="card">
          <h2>Messung läuft…</h2>
          <div className="spectrum-bar">
            {live.spectrum.map((v, i) => (
              <span key={i} style={{ height: `${Math.max(2, v * 100)}%` }} />
            ))}
          </div>
          <div className="live-values">
            <div>
              <span>Pegel (dBFS)</span>
              <strong>{live.levelDbfs.toFixed(1)}</strong>
            </div>
            <div>
              <span>SNR (dB)</span>
              <strong>{live.snrDb.toFixed(1)}</strong>
            </div>
            <div>
              <span>Rauschboden</span>
              <strong>{live.noiseFloorDbfs.toFixed(1)}</strong>
            </div>
            <div>
              <span>Erkannt</span>
              <strong>{live.detected ? 'Ja' : 'Nein'}</strong>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="card">
          <div className={`result-box ${result.status}`}>
            <h2>{statusLabel[result.status]}</h2>
            <p>Ton erkannt: {result.detected ? 'Ja' : 'Nein'}</p>
          </div>
          <div className="live-values">
            <div>
              <span>Pegel (dBFS)</span>
              <strong>{result.levelDbfs.toFixed(1)}</strong>
            </div>
            <div>
              <span>SNR (dB)</span>
              <strong>{result.snrDb.toFixed(1)}</strong>
            </div>
            <div>
              <span>Peak (dBFS)</span>
              <strong>{result.peakDbfs.toFixed(1)}</strong>
            </div>
            <div>
              <span>Mittel (dBFS)</span>
              <strong>{result.avgDbfs.toFixed(1)}</strong>
            </div>
            {result.levelDbSpl !== undefined && (
              <div>
                <span>Pegel (dB SPL, geschätzt)</span>
                <strong>{result.levelDbSpl.toFixed(1)}</strong>
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Notiz</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => void saveResult()}>
              Speichern
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPhase('select');
                setResult(null);
              }}
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
