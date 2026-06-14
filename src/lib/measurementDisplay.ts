import { tGlobal } from '../i18n';
import type { Measurement, Speaker } from '../types';

export function isAdhocMeasurement(measurement: Measurement): boolean {
  return measurement.speakerId == null;
}

export function getMeasurementDisplay(
  measurement: Measurement,
  speaker?: Speaker,
): { name: string; location: string; isAdhoc: boolean } {
  if (speaker && measurement.speakerId != null) {
    return { name: speaker.name, location: speaker.location, isAdhoc: false };
  }
  return {
    name: measurement.adhocLabel?.trim() || tGlobal('measure.adhocUnlabeled'),
    location: measurement.adhocLocation?.trim() || tGlobal('common.noLocation'),
    isAdhoc: true,
  };
}

export function formatAdhocExportName(name: string): string {
  return `[${tGlobal('doc.adhocPrefix')}] ${name}`;
}
