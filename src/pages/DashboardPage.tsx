import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createSession,
  deleteSession,
  getAllSessions,
  getMeasurementsForSession,
  getSpeakersForSession,
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
  const [copyFromId, setCopyFromId] = useState<number | ''>('');

  useEffect(() => {
    async function load() {
      if (!session?.id) return;
      const [speakers, measurements, allSessions] = await Promise.all([
        getSpeakersForSession(session.id),
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
    const id = await createSession(
      name,
      copyFromId === '' ? undefined : copyFromId,
    );
    await setActiveSessionId(id);
    setNewSessionName('');
    setCopyFromId('');
    await refresh();
  }

  async function handleDeleteSession(id: number) {
    const target = sessions.find((s) => s.id === id);
    if (
      !confirm(
        `Sitzung „${target?.name ?? ''}" inklusive aller Lautsprecher und Messungen löschen?`,
      )
    ) {
      return;
    }
    await deleteSession(id);
    if (id === session?.id) {
      // Aktive Sitzung gelöscht: nächste übernehmen bzw. neue Default anlegen.
      await setActiveSessionId(null);
      await refresh();
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setCopyFromId((prev) => (prev === id ? '' : prev));
    }
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
        {sessions.length > 0 && (
          <div className="form-group">
            <label>Lautsprecher übernehmen von</label>
            <select
              value={copyFromId}
              onChange={(e) =>
                setCopyFromId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">– keine (leer starten) –</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="hint">
              Kopiert die Lautsprecherliste der gewählten Sitzung in die neue
              Sitzung. Messergebnisse werden nicht übernommen.
            </p>
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => void handleNewSession()}>
          Neue Testsitzung erstellen
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="card">
          <h3>Sitzungen verwalten</h3>
          {sessions.map((s) => (
            <div key={s.id} className="list-item">
              <div className="list-item-info">
                <strong>
                  {s.name}
                  {s.id === session?.id ? ' (aktiv)' : ''}
                </strong>
              </div>
              <div className="btn-row" style={{ width: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem 0.75rem' }}
                  disabled={s.id === session?.id}
                  onClick={() => void setActiveSessionId(s.id!).then(refresh)}
                >
                  Wechseln
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem 0.75rem' }}
                  onClick={() => void handleDeleteSession(s.id!)}
                >
                  ✕
                </button>
              </div>
            </div>
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
