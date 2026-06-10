import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createSession,
  getAllSessions,
  getAllSpeakers,
  getMeasurementsForSession,
  setActiveSessionId,
} from '../db';
import { useSession } from '../hooks/useSession';

export function DashboardPage() {
  const { session, refresh } = useSession();
  const [stats, setStats] = useState({
    speakers: 0,
    tested: 0,
    adhoc: 0,
    pass: 0,
    fail: 0,
  });
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof getAllSessions>>>([]);
  const [newSessionName, setNewSessionName] = useState('');

  useEffect(() => {
    async function load() {
      if (!session?.id) return;
      const [speakers, measurements, allSessions] = await Promise.all([
        getAllSpeakers(),
        getMeasurementsForSession(session.id),
        getAllSessions(),
      ]);
      setSessions(allSessions);
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

  async function handleNewSession() {
    const name =
      newSessionName.trim() ||
      `Messung ${new Date().toLocaleDateString('de-DE')}`;
    const id = await createSession(name);
    await setActiveSessionId(id);
    setNewSessionName('');
    await refresh();
  }

  return (
    <>
      <div className="card">
        <h2>Aktive Testsitzung</h2>
        {session ? (
          <>
            <p>
              <strong>{session.name}</strong>
            </p>
            <p className="hint">
              Erstellt: {new Date(session.createdAt).toLocaleString('de-DE')}
            </p>
          </>
        ) : (
          <p>Keine Sitzung aktiv</p>
        )}
      </div>

      <div className="card">
        <h2>Fortschritt</h2>
        <div className="stat-grid">
          <div className="stat">
            <strong>{stats.tested}/{stats.speakers}</strong>
            <span>Liste</span>
          </div>
          <div className="stat">
            <strong>{stats.adhoc}</strong>
            <span>Ad-hoc</span>
          </div>
          <div className="stat">
            <strong>{stats.pass}</strong>
            <span>Bestanden</span>
          </div>
        </div>
        <p className="hint" style={{ marginTop: '0.5rem' }}>
          {stats.fail} nicht bestanden (Liste + Ad-hoc)
        </p>
      </div>

      <Link to="/measure" className="btn btn-primary">
        Messung (Liste)
      </Link>
      <Link to="/measure?mode=adhoc" className="btn btn-secondary">
        Ad-hoc Messung
      </Link>
      <Link to="/speakers" className="btn btn-secondary">
        Lautsprecher verwalten
      </Link>

      <div className="card">
        <h3>Neue Sitzung</h3>
        <div className="form-group">
          <input
            placeholder="Sitzungsname (optional)"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void handleNewSession()}>
          Neue Testsitzung erstellen
        </button>
      </div>

      {sessions.length > 1 && (
        <div className="card">
          <h3>Sitzungen wechseln</h3>
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="btn btn-secondary"
              disabled={s.id === session?.id}
              onClick={() => void setActiveSessionId(s.id!).then(refresh)}
            >
              {s.name}
              {s.id === session?.id ? ' (aktiv)' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="card">
        <h3>Hinweis</h3>
        <p className="hint">
          Die App misst einen <strong>externen Testton</strong> über das
          Mikrofon. Starten Sie den Ton an der PA-Anlage, bevor Sie die Messung
          beginnen. Viele Geräte begrenzen den Ultraschallbereich oberhalb von
          18–20 kHz.
        </p>
      </div>
    </>
  );
}
