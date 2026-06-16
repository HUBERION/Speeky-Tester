import { deleteSession, setActiveSessionId } from '../db';
import { useT } from '../i18n';
import type { TestSession } from '../types';

interface Props {
  sessions: TestSession[];
  activeSessionId?: number;
  onClose: () => void;
  onChanged: () => void;
}

export function SessionSwitchModal({
  sessions,
  activeSessionId,
  onClose,
  onChanged,
}: Props) {
  const { t } = useT();

  async function handleSwitch(id: number) {
    await setActiveSessionId(id);
    onChanged();
    onClose();
  }

  async function handleDelete(id: number) {
    const target = sessions.find((s) => s.id === id);
    if (!confirm(t('sessions.deleteConfirm', { name: target?.name ?? '' }))) {
      return;
    }
    await deleteSession(id);
    if (id === activeSessionId) {
      await setActiveSessionId(null);
    }
    onChanged();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('sessions.switchTitle')}</h2>
        {sessions.length === 0 ? (
          <p className="hint">{t('sessions.noneYet')}</p>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className="list-item">
              <div className="list-item-info">
                <strong>
                  {s.name}
                  {s.id === activeSessionId ? ` (${t('common.active')})` : ''}
                </strong>
                {s.site && <small>{s.site}</small>}
              </div>
              <div className="btn-row" style={{ width: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem 0.75rem' }}
                  disabled={s.id === activeSessionId}
                  onClick={() => void handleSwitch(s.id!)}
                >
                  {t('sessions.switch')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ width: 'auto', margin: 0, padding: '0.5rem 0.75rem' }}
                  onClick={() => void handleDelete(s.id!)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('importModal.close')}
        </button>
      </div>
    </div>
  );
}
