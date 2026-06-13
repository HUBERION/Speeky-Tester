import { useCallback, useEffect, useState } from 'react';
import {
  addSpeaker,
  createSession,
  deleteSession,
  deleteSpeaker,
  getAllSessions,
  getSpeakersForSession,
  setActiveSessionId,
  updateSpeaker,
} from '../db';
import { useSession } from '../hooks/useSession';
import { fmtDateNow, useT } from '../i18n';
import type { Speaker, TestSession } from '../types';
import { ImportModal } from '../components/ImportModal';

export function SpeakersPage() {
  const { t } = useT();
  const { session, refresh } = useSession();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [copyFromId, setCopyFromId] = useState<number | ''>('');

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const allSessions = await getAllSessions();
    setSessions(allSessions);
    if (session?.id) {
      setSpeakers(await getSpeakersForSession(session.id));
    } else {
      setSpeakers([]);
    }
  }, [session?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleNewSession() {
    const name =
      newSessionName.trim() ||
      t('sessions.defaultName', { date: fmtDateNow() });
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
    if (!confirm(t('sessions.deleteConfirm', { name: target?.name ?? '' }))) {
      return;
    }
    await deleteSession(id);
    if (id === session?.id) {
      await setActiveSessionId(null);
      await refresh();
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setCopyFromId((prev) => (prev === id ? '' : prev));
    }
  }

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
    if (!name.trim() || !session?.id) return;
    if (editing?.id) {
      await updateSpeaker({
        ...editing,
        name: name.trim(),
        location: location.trim(),
        note: note.trim() || undefined,
      });
    } else {
      await addSpeaker({
        sessionId: session.id,
        name: name.trim(),
        location: location.trim(),
        note: note.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }
    resetForm();
    await load();
  }

  async function handleCopy(speaker: Speaker) {
    if (!session?.id) return;
    const suffix = t('speakers.copySuffix');
    const re = new RegExp(`\\s*\\(${suffix}(?:\\s*\\d+)?\\)\\s*$`);
    const baseName = speaker.name.replace(re, '');
    const existingNames = speakers
      .map((s) => s.name)
      .filter((n) => n.startsWith(baseName));
    let copyName = `${baseName} (${suffix})`;
    if (existingNames.includes(copyName)) {
      let i = 2;
      while (existingNames.includes(`${baseName} (${suffix} ${i})`)) i++;
      copyName = `${baseName} (${suffix} ${i})`;
    }
    await addSpeaker({
      sessionId: session.id,
      name: copyName,
      location: speaker.location,
      note: speaker.note,
      createdAt: new Date().toISOString(),
    });
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm(t('speakers.deleteConfirm'))) return;
    await deleteSpeaker(id);
    await load();
  }

  if (!session) return <p>{t('common.loadingSession')}</p>;

  return (
    <>
      <div className="card">
        <h2>{t('sessions.heading')}</h2>
        <div className="form-group">
          <input
            placeholder={t('sessions.namePlaceholder')}
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
          />
        </div>
        {sessions.length > 0 && (
          <div className="form-group">
            <label>{t('sessions.copyFrom')}</label>
            <select
              value={copyFromId}
              onChange={(e) =>
                setCopyFromId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">{t('sessions.copyNone')}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="hint">{t('sessions.copyHint')}</p>
          </div>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => void handleNewSession()}
        >
          {t('sessions.create')}
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="card">
          <h3>{t('sessions.manage')}</h3>
          {sessions.map((s) => (
            <div key={s.id} className="list-item">
              <div className="list-item-info">
                <strong>
                  {s.name}
                  {s.id === session.id ? ` (${t('common.active')})` : ''}
                </strong>
              </div>
              <div className="btn-row" style={{ width: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem 0.75rem' }}
                  disabled={s.id === session.id}
                  onClick={() => void setActiveSessionId(s.id!).then(refresh)}
                >
                  {t('sessions.switch')}
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
        <h2>{t('speakers.heading')}</h2>
        <p className="hint">
          {t('speakers.belongHint', { name: session.name })}
        </p>
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          {t('speakers.add')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowImport(true)}
        >
          {t('speakers.import')}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>{editing ? t('speakers.editTitle') : t('speakers.newTitle')}</h2>
          <div className="form-group">
            <label>{t('speakers.nameId')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('speakers.location')}</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>{t('speakers.note')}</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => void handleSave()}>
              {t('common.save')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h2>{t('speakers.list', { count: speakers.length })}</h2>
        {speakers.length === 0 ? (
          <div className="empty-state">{t('speakers.empty')}</div>
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
                  title={t('speakers.copyTitle')}
                  aria-label={t('speakers.copyTitle')}
                  onClick={() => void handleCopy(s)}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem' }}
                  title={t('common.edit')}
                  onClick={() => startEdit(s)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem' }}
                  title={t('common.delete')}
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
          sessionId={session.id!}
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
