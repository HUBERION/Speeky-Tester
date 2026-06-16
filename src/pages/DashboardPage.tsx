import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMeasurementsForSession, getSpeakersForSession } from '../db';
import { useSession } from '../hooks/useSession';
import { fmtDateTime, useT } from '../i18n';

export function DashboardPage() {
  const { t } = useT();
  const { session } = useSession();
  const [stats, setStats] = useState({
    speakers: 0,
    tested: 0,
    adhoc: 0,
    pass: 0,
    fail: 0,
  });

  useEffect(() => {
    async function load() {
      if (!session?.id) return;
      const [speakers, measurements] = await Promise.all([
        getSpeakersForSession(session.id),
        getMeasurementsForSession(session.id),
      ]);
      const listMeasurements = measurements.filter((m) => m.speakerId != null);
      setStats({
        speakers: speakers.length,
        tested: new Set(listMeasurements.map((m) => m.speakerId)).size,
        adhoc: measurements.filter((m) => m.speakerId == null).length,
        pass: measurements.filter((m) => m.status === 'pass').length,
        fail: measurements.filter((m) => m.status === 'fail').length,
      });
    }
    void load();
  }, [session?.id]);

  return (
    <>
      <div className="card">
        <h2>{t('dashboard.activeSession')}</h2>
        {session ? (
          <>
            <p>
              <strong>{session.name}</strong>
            </p>
            {session.site && <p className="hint">{session.site}</p>}
            <p className="hint">
              {t('dashboard.created', { date: fmtDateTime(session.createdAt) })}
            </p>
          </>
        ) : (
          <p>{t('dashboard.noActiveSession')}</p>
        )}
      </div>

      <div className="card">
        <h2>{t('dashboard.progress')}</h2>
        <div className="stat-grid">
          <div className="stat">
            <strong>{stats.tested}/{stats.speakers}</strong>
            <span>{t('dashboard.list')}</span>
          </div>
          <div className="stat">
            <strong>{stats.adhoc}</strong>
            <span>{t('dashboard.adhoc')}</span>
          </div>
          <div className="stat">
            <strong>{stats.pass}</strong>
            <span>{t('dashboard.passed')}</span>
          </div>
        </div>
        <p className="hint" style={{ marginTop: '0.5rem' }}>
          {t('dashboard.failedHint', { count: stats.fail })}
        </p>
      </div>

      <Link to="/measure" className="btn btn-primary">
        {t('dashboard.measureList')}
      </Link>
      <Link to="/measure?mode=adhoc" className="btn btn-secondary">
        {t('dashboard.measureAdhoc')}
      </Link>

      <div className="card">
        <h3>{t('dashboard.hintTitle')}</h3>
        <p className="hint">{t('dashboard.hint')}</p>
      </div>
    </>
  );
}
