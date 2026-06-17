import Dexie, { type EntityTable } from 'dexie';
import { fmtDateNow, tGlobal } from '../i18n';
import type {
  AppSettings,
  Calibration,
  Measurement,
  Speaker,
  TestSession,
} from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  defaultFrequency: 19000,
  frequencyToleranceHz: 50,
  passSnrThreshold: 6,
  defaultDurationMs: 5000,
  theme: 'system',
};

const DEFAULT_SESSION_SETTINGS = {
  defaultFrequency: 19000,
  frequencyToleranceHz: 50,
  passSnrThreshold: 6,
  defaultDurationMs: 5000,
};

class SpeekyDatabase extends Dexie {
  speakers!: EntityTable<Speaker, 'id'>;
  sessions!: EntityTable<TestSession, 'id'>;
  measurements!: EntityTable<Measurement, 'id'>;
  calibration!: EntityTable<Calibration, 'id'>;
  appSettings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('speeky-tester');
    this.version(1).stores({
      speakers: '++id, name, location, createdAt',
      sessions: '++id, name, createdAt',
      measurements: '++id, sessionId, speakerId, [sessionId+speakerId], timestamp, status',
      calibration: '++id',
      appSettings: '++id',
    });
    // v2: Lautsprecher gehören jetzt zu genau einer Sitzung (sessionId).
    this.version(2)
      .stores({
        speakers: '++id, sessionId, name, location, createdAt, [sessionId+name]',
      })
      .upgrade(async (tx) => {
        const sessionsTable = tx.table('sessions');
        const sessions = await sessionsTable.toArray();
        const rawActive = localStorage.getItem('activeSessionId');
        const activeId = rawActive ? Number(rawActive) : null;
        let targetId: number | undefined;
        if (activeId && sessions.some((s) => s.id === activeId)) {
          targetId = activeId;
        } else if (sessions.length > 0) {
          targetId = sessions[0].id;
        }
        if (targetId == null) {
          targetId = (await sessionsTable.add({
            name: tGlobal('sessions.migratedName', { date: fmtDateNow() }),
            createdAt: new Date().toISOString(),
            settings: { ...DEFAULT_SESSION_SETTINGS },
          })) as number;
        }
        // Bestehende globale Lautsprecher der aktiven/ersten Sitzung zuordnen.
        await tx
          .table('speakers')
          .toCollection()
          .modify((s: { sessionId?: number }) => {
            if (s.sessionId == null) s.sessionId = targetId;
          });
      });
  }
}

export const db = new SpeekyDatabase();

export async function getAppSettings(): Promise<AppSettings> {
  const existing = await db.appSettings.toCollection().first();
  if (existing) {
    return { ...DEFAULT_SETTINGS, ...existing, id: existing.id };
  }
  const id = await db.appSettings.add(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, id };
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  if (settings.id) {
    await db.appSettings.put(settings);
  } else {
    await db.appSettings.add(settings);
  }
}

export async function getCalibration(): Promise<Calibration | undefined> {
  return db.calibration.toCollection().first();
}

export async function saveCalibration(calibration: Calibration): Promise<void> {
  if (calibration.id) {
    await db.calibration.put(calibration);
  } else {
    const existing = await getCalibration();
    if (existing?.id) {
      await db.calibration.put({ ...calibration, id: existing.id });
    } else {
      await db.calibration.add(calibration);
    }
  }
}

export async function clearCalibration(): Promise<void> {
  await db.calibration.clear();
}

export async function getSpeakersForSession(
  sessionId: number,
): Promise<Speaker[]> {
  return db.speakers.where('sessionId').equals(sessionId).sortBy('name');
}

export async function copySpeakersToSession(
  fromSessionId: number,
  toSessionId: number,
): Promise<number> {
  const speakers = await getSpeakersForSession(fromSessionId);
  if (speakers.length === 0) return 0;
  const now = new Date().toISOString();
  await db.speakers.bulkAdd(
    speakers.map((s) => ({
      sessionId: toSessionId,
      name: s.name,
      location: s.location,
      note: s.note,
      createdAt: now,
    })),
  );
  return speakers.length;
}

export async function addSpeaker(speaker: Omit<Speaker, 'id'>): Promise<number> {
  return (await db.speakers.add(speaker)) as number;
}

export async function updateSpeaker(speaker: Speaker): Promise<void> {
  await db.speakers.put(speaker);
}

export async function deleteSpeaker(id: number): Promise<void> {
  await db.speakers.delete(id);
}

export async function getAllSessions(): Promise<TestSession[]> {
  return db.sessions.orderBy('createdAt').reverse().toArray();
}

function withSessionDefaults(session: TestSession): TestSession {
  return {
    ...session,
    settings: { ...DEFAULT_SESSION_SETTINGS, ...session.settings },
  };
}

export async function getSession(id: number): Promise<TestSession | undefined> {
  const session = await db.sessions.get(id);
  return session ? withSessionDefaults(session) : undefined;
}

export async function createSession(
  name: string,
  copyFromSessionId?: number,
  site?: string,
): Promise<number> {
  const settings = await getAppSettings();
  const id = (await db.sessions.add({
    name,
    site: site?.trim() || undefined,
    createdAt: new Date().toISOString(),
    settings: {
      defaultFrequency: settings.defaultFrequency,
      frequencyToleranceHz: settings.frequencyToleranceHz,
      passSnrThreshold: settings.passSnrThreshold,
      defaultDurationMs: settings.defaultDurationMs,
    },
  })) as number;
  if (copyFromSessionId != null) {
    await copySpeakersToSession(copyFromSessionId, id);
  }
  return id;
}

export async function updateSession(session: TestSession): Promise<void> {
  await db.sessions.put(session);
}

export async function deleteSession(id: number): Promise<void> {
  await db.measurements.where('sessionId').equals(id).delete();
  await db.speakers.where('sessionId').equals(id).delete();
  await db.sessions.delete(id);
}

export async function getMeasurementsForSession(
  sessionId: number,
): Promise<Measurement[]> {
  return db.measurements
    .where('sessionId')
    .equals(sessionId)
    .sortBy('timestamp');
}

export async function getMeasurementForSpeaker(
  sessionId: number,
  speakerId: number,
): Promise<Measurement | undefined> {
  return db.measurements
    .where('[sessionId+speakerId]')
    .equals([sessionId, speakerId])
    .first();
}

export async function addMeasurement(
  measurement: Omit<Measurement, 'id'>,
): Promise<number> {
  if (measurement.speakerId != null) {
    const existing = await db.measurements
      .where('sessionId')
      .equals(measurement.sessionId)
      .and((m) => m.speakerId === measurement.speakerId)
      .first();
    if (existing?.id) {
      await db.measurements.put({ ...measurement, id: existing.id });
      return existing.id;
    }
  }
  return (await db.measurements.add(measurement)) as number;
}

export async function updateMeasurement(measurement: Measurement): Promise<void> {
  await db.measurements.put(measurement);
}

export async function deleteMeasurement(id: number): Promise<void> {
  await db.measurements.delete(id);
}

export async function getActiveSessionId(): Promise<number | null> {
  const raw = localStorage.getItem('activeSessionId');
  return raw ? Number(raw) : null;
}

export async function setActiveSessionId(id: number | null): Promise<void> {
  if (id === null) {
    localStorage.removeItem('activeSessionId');
  } else {
    localStorage.setItem('activeSessionId', String(id));
  }
}

export async function ensureDefaultSession(): Promise<TestSession> {
  const activeId = await getActiveSessionId();
  if (activeId) {
    const session = await getSession(activeId);
    if (session) return session;
  }
  const sessions = await getAllSessions();
  if (sessions.length > 0 && sessions[0].id) {
    await setActiveSessionId(sessions[0].id);
    return sessions[0];
  }
  const id = await createSession(
    tGlobal('sessions.defaultName', { date: fmtDateNow() }),
  );
  await setActiveSessionId(id);
  const session = await getSession(id);
  return session!;
}

export { DEFAULT_SESSION_SETTINGS };
