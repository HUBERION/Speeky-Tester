export type MeasurementStatus = 'pass' | 'fail' | 'inconclusive';

export interface SessionSettings {
  defaultFrequency: number;
  passSnrThreshold: number;
  defaultDurationMs: number;
}

export interface Speaker {
  id?: number;
  name: string;
  location: string;
  note?: string;
  createdAt: string;
}

export interface TestSession {
  id?: number;
  name: string;
  createdAt: string;
  settings: SessionSettings;
}

export interface Measurement {
  id?: number;
  sessionId: number;
  speakerId: number;
  frequencyHz: number;
  durationMs: number;
  timestamp: string;
  detected: boolean;
  levelDbfs: number;
  noiseFloorDbfs: number;
  snrDb: number;
  peakDbfs: number;
  avgDbfs: number;
  levelDbSpl?: number;
  status: MeasurementStatus;
  notes?: string;
  deviceInfo: string;
}

export interface Calibration {
  id?: number;
  offsetDbSpl: number;
  referenceDbfs: number;
  referenceDbSpl: number;
  updatedAt: string;
}

export interface AppSettings {
  id?: number;
  defaultFrequency: number;
  passSnrThreshold: number;
  defaultDurationMs: number;
}

export interface LiveFrame {
  levelDbfs: number;
  noiseFloorDbfs: number;
  snrDb: number;
  detected: boolean;
  spectrum: number[];
}

export interface MeasurementResult {
  detected: boolean;
  levelDbfs: number;
  noiseFloorDbfs: number;
  snrDb: number;
  peakDbfs: number;
  avgDbfs: number;
  levelDbSpl?: number;
  status: MeasurementStatus;
}

export interface ExportRow {
  speakerName: string;
  location: string;
  frequencyHz: number;
  detected: boolean;
  levelDbfs: number;
  noiseFloorDbfs: number;
  snrDb: number;
  peakDbfs: number;
  avgDbfs: number;
  levelDbSpl?: number;
  status: MeasurementStatus;
  timestamp: string;
  notes: string;
}

export interface ExportData {
  sessionName: string;
  exportDate: string;
  totalSpeakers: number;
  passCount: number;
  failCount: number;
  inconclusiveCount: number;
  calibrationActive: boolean;
  deviceInfo: string;
  appVersion: string;
  rows: ExportRow[];
}
