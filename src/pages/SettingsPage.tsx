import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearCalibration,
  getAppSettings,
  getCalibration,
  saveAppSettings,
  saveCalibration,
} from '../db';
import { AudioAnalyzer } from '../audio/analyzer';
import { fmtDateTime, useT } from '../i18n';
import type { AppSettings, Calibration } from '../types';

export function SettingsPage() {
  const { t } = useT();
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

  if (!settings) return <p>{t('common.loading')}</p>;

  return (
    <>
      <div className="card">
        <h2>{t('settings.defaults')}</h2>
        <div className="form-group">
          <label>{t('settings.defaultFreq')}</label>
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
          <label>{t('settings.defaultSpread')}</label>
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
          <p className="hint">{t('settings.spreadHint')}</p>
        </div>
        <div className="form-group">
          <label>{t('settings.passSnr')}</label>
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
          <label>{t('settings.defaultDuration')}</label>
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
          {t('settings.saveSettings')}
        </button>
        {saved && <p className="hint" style={{ color: 'var(--success)' }}>{t('settings.saved')}</p>}
      </div>

      <div className="card">
        <h2>{t('settings.splTitle')}</h2>
        <p className="hint">{t('settings.splHint')}</p>
        <div className="form-group">
          <label>{t('settings.refLevel')}</label>
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
          {measuring ? t('settings.measuring') : t('settings.startRef')}
        </button>
        {measuredDbfs !== null && (
          <p>{t('settings.measuredRef', { value: measuredDbfs.toFixed(1) })}</p>
        )}
        {calibration && (
          <p className="hint">
            {t('settings.calActiveSince', {
              date: fmtDateTime(calibration.updatedAt),
              offset: calibration.offsetDbSpl.toFixed(1),
            })}
          </p>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={measuredDbfs === null}
            onClick={() => void saveCalibrationData()}
          >
            {t('settings.saveCal')}
          </button>
          {calibration && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void removeCalibration()}
            >
              {t('settings.deleteCal')}
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2>{t('settings.deviceNotes')}</h2>
        <ul className="hint" style={{ paddingLeft: '1.2rem' }}>
          <li>{t('settings.note1')}</li>
          <li>{t('settings.note2')}</li>
          <li>{t('settings.note3')}</li>
          <li>{t('settings.note4')}</li>
        </ul>
      </div>
    </>
  );
}
