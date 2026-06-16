import { useState } from 'react';
import { createSession, setActiveSessionId } from '../db';
import { fmtDateNow, useT } from '../i18n';
import type { TestSession } from '../types';

interface Props {
  sessions: TestSession[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSessionModal({ sessions, onClose, onCreated }: Props) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [copyFromId, setCopyFromId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const sessionName =
        name.trim() || t('sessions.defaultName', { date: fmtDateNow() });
      const id = await createSession(
        sessionName,
        copyFromId === '' ? undefined : copyFromId,
        site.trim() || undefined,
      );
      await setActiveSessionId(id);
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('sessions.createTitle')}</h2>
        <div className="form-group">
          <label>{t('sessions.nameLabel')}</label>
          <input
            placeholder={t('sessions.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>{t('sessions.siteLabel')}</label>
          <input
            placeholder={t('sessions.sitePlaceholder')}
            value={site}
            onChange={(e) => setSite(e.target.value)}
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
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void handleCreate()}
        >
          {saving ? t('sessions.creating') : t('sessions.create')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
