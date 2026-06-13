import {
  getCalibration,
  getMeasurementsForSession,
  getSession,
  getSpeakersForSession,
} from '../db';
import { getDeviceInfo } from '../audio/analyzer';
import { getMeasurementDisplay } from '../lib/measurementDisplay';
import type { ExportData, ExportRow } from '../types';

const APP_VERSION = '1.0.0';

export async function buildExportData(sessionId: number): Promise<ExportData> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Sitzung nicht gefunden');
  const [speakers, measurements, calibration] = await Promise.all([
    getSpeakersForSession(sessionId),
    getMeasurementsForSession(sessionId),
    getCalibration(),
  ]);
  const speakerMap = new Map(speakers.map((s) => [s.id!, s]));
  const rows: ExportRow[] = measurements.map((m) => {
    const speaker = m.speakerId != null ? speakerMap.get(m.speakerId) : undefined;
    const display = getMeasurementDisplay(m, speaker);
    return {
      speakerName: display.isAdhoc ? `[Ad-hoc] ${display.name}` : display.name,
      location: display.location,
      frequencyHz: m.frequencyHz,
      frequencyToleranceHz: m.frequencyToleranceHz ?? 50,
      detected: m.detected,
      levelDbfs: m.levelDbfs,
      noiseFloorDbfs: m.noiseFloorDbfs,
      snrDb: m.snrDb,
      peakDbfs: m.peakDbfs,
      avgDbfs: m.avgDbfs,
      levelDbSpl: m.levelDbSpl,
      status: m.status,
      timestamp: m.timestamp,
      notes: m.notes ?? '',
    };
  });
  return {
    sessionName: session.name,
    exportDate: new Date().toLocaleString('de-DE'),
    totalSpeakers: speakers.length,
    passCount: measurements.filter((m) => m.status === 'pass').length,
    failCount: measurements.filter((m) => m.status === 'fail').length,
    inconclusiveCount: measurements.filter((m) => m.status === 'inconclusive')
      .length,
    calibrationActive: !!calibration,
    deviceInfo: getDeviceInfo(),
    appVersion: APP_VERSION,
    rows,
  };
}

export { APP_VERSION };
