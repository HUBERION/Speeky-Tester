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
    name: measurement.adhocLabel?.trim() || 'Ad-hoc Messung',
    location: measurement.adhocLocation?.trim() || '–',
    isAdhoc: true,
  };
}
