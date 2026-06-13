import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearCalibration,
  getAppSettings,
  getCalibration,
  saveAppSettings,
  saveCalibration,
} from '../db';
import { AudioAnalyzer } from '../audio/analyzer';
import type { AppSettings, Calibration } from '../types';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [refDbSpl, setRefDbSpl] = useState('94');
  const [measuring, setMeasuring] = useState(false);
  const [measuredDbfs, setMeasuredDbfs] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([getAppSettings(), getCalibration()]);
    setSettings(s);
    setCalibration(c ?? null);
    if (c) {
      setRefDbSpl(String(c.referenceDbSpl));
      setMeasuredDbfs(c.referenceDbfs);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      analyzerRef.current?.stop();
    };
  }, [load]);

  async function saveSettings() {
    if (!settings) return;
    await saveAppSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function runCalibrationMeasure() {
    setMeasuring(true);
    try {
      if (!analyzerRef.current) analyzerRef.current = new AudioAnalyzer();
      const freq = settings?.defaultFrequency ?? 19000;
      const tolerance = settings?.frequencyToleranceHz ?? 50;
      const result = await analyzerRef.current.measure(freq, 3000, 0, tolerance);
      setMeasuredDbfs(result.levelDbfs);
    } finally {
      setMeasuring(false);
    }
  }

  async function saveCalibrationData() {
    if (measuredDbfs === null) return;
    const referenceDbSpl = Number(refDbSpl);
    const data: Calibration = {
      referenceDbfs: measuredDbfs,
      referenceDbSpl,
      offsetDbSpl: referenceDbSpl - measuredDbfs,
      updatedAt: new Date().toISOString(),
    };
    await saveCalibration(data);
    setCalibration(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function removeCalibration() {
    await clearCalibration();
    setCalibration(null);
    setMeasuredDbfs(null);
  }

  if (!settings) return <p>Lade…</p>;

  return (
    <>
      <div className="card">
        <h2>Standardeinstellungen</h2>
        <div className="form-group">
          <label>Standard-Frequenz (Hz)</label>
          <input
            type="number"
            min={10000}
            max={24000}
            step={100}
            value={settings.defaultFrequency}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultFrequency: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="form-group">
          <label>Standard Frequenz-Streuung (± Hz)</label>
          <input
            type="number"
            min={0}
            max={500}
            step={10}
            value={settings.frequencyToleranceHz}
            onChange={(e) =>
              setSettings({
                ...settings,
                frequencyToleranceHz: Number(e.target.value),
              })
            }
          />
          <p className="hint">
            Signal wird im Bereich Zielfrequenz ± Streuung gemessen (z. B. ±50 Hz).
          </p>
        </div>
        <div className="form-group">
          <label>SNR-Schwelle für „Bestanden“ (dB)</label>
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            value={settings.passSnrThreshold}
            onChange={(e) =>
              setSettings({
                ...settings,
                passSnrThreshold: Number(e.target.value),
              })
            }
          />
        </div>
        <div className="form-group">
          <label>Standard-Messdauer (Sekunden)</label>
          <input
            type="number"
            min={2}
            max={30}
            value={settings.defaultDurationMs / 1000}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultDurationMs: Number(e.target.value) * 1000,
              })
            }
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void saveSettings()}>
          Einstellungen speichern
        </button>
        {saved && <p className="hint" style={{ color: 'var(--success)' }}>Gespeichert!</p>}
      </div>

      <div className="card">
        <h2>SPL-Kalibrierung (optional)</h2>
        <p className="hint">
          Für geschätzte dB-SPL-Werte: Spielen Sie einen Ton mit bekannter
          Lautstärke ab (z.B. 94 dB SPL Kalibrator) und messen Sie den
          Referenzpegel.
        </p>
        <div className="form-group">
          <label>Bekannter Referenzpegel (dB SPL)</label>
          <input
            type="number"
            value={refDbSpl}
            onChange={(e) => setRefDbSpl(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={measuring}
          onClick={() => void runCalibrationMeasure()}
        >
          {measuring ? 'Messe…' : 'Referenzmessung starten (3 s)'}
        </button>
        {measuredDbfs !== null && (
          <p>Gemessener Referenzpegel: {measuredDbfs.toFixed(1)} dBFS</p>
        )}
        {calibration && (
          <p className="hint">
            Kalibrierung aktiv seit{' '}
            {new Date(calibration.updatedAt).toLocaleString('de-DE')} (Offset:{' '}
            {calibration.offsetDbSpl.toFixed(1)} dB)
          </p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={measuredDbfs === null}
            onClick={() => void saveCalibrationData()}
          >
            Kalibrierung speichern
          </button>
          {calibration && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void removeCalibration()}
            >
              Kalibrierung löschen
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Geräte-Hinweise</h2>
        <ul className="hint" style={{ paddingLeft: '1.2rem' }}>
          <li>Viele Smartphone-Mikrofone filtern oberhalb von 18–20 kHz.</li>
          <li>dB SPL ohne Kalibriermikrofon ist nur näherungsweise.</li>
          <li>iOS: Mikrofon nur bei aktiver App verfügbar.</li>
          <li>Die App funktioniert offline nach dem ersten Laden.</li>
        </ul>
      </div>
    </>
  );
}
