import type { LiveFrame, MeasurementResult } from '../types';

const FFT_SIZE = 8192;
export const DEFAULT_FREQUENCY_TOLERANCE_HZ = 50;

function amplitudeToDbfs(amplitude: number): number {
  const floor = 1e-10;
  return 20 * Math.log10(Math.max(amplitude, floor));
}

function hzToBin(frequencyHz: number, sampleRate: number, fftSize: number): number {
  return Math.round((frequencyHz * fftSize) / sampleRate);
}

function getBinRange(
  frequencyHz: number,
  frequencyToleranceHz: number,
  sampleRate: number,
  fftSize: number,
): { center: number; start: number; end: number } {
  const center = hzToBin(frequencyHz, sampleRate, fftSize);
  const lowHz = Math.max(0, frequencyHz - frequencyToleranceHz);
  const highHz = frequencyHz + frequencyToleranceHz;
  const start = Math.max(1, Math.floor((lowHz * fftSize) / sampleRate));
  const end = Math.min(
    fftSize / 2 - 1,
    Math.ceil((highHz * fftSize) / sampleRate),
  );
  return { center, start, end };
}

function getTargetAmplitude(
  data: Uint8Array,
  start: number,
  end: number,
): number {
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    const normalized = data[i] / 255;
    sum += normalized;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function getNoiseFloor(
  data: Uint8Array,
  center: number,
  start: number,
  end: number,
  marginBins: number,
): number {
  const neighborValues: number[] = [];
  for (
    let i = Math.max(1, start - marginBins);
    i <= Math.min(data.length - 1, end + marginBins);
    i++
  ) {
    if (i < start || i > end) {
      if (Math.abs(i - center) > Math.min(2, marginBins)) {
        neighborValues.push(data[i] / 255);
      }
    }
  }
  if (neighborValues.length === 0) return 0;
  neighborValues.sort((a, b) => a - b);
  const mid = Math.floor(neighborValues.length / 2);
  return neighborValues.length % 2 === 0
    ? (neighborValues[mid - 1] + neighborValues[mid]) / 2
    : neighborValues[mid];
}

function buildSpectrum(data: Uint8Array, maxBins = 128): number[] {
  const step = Math.max(1, Math.floor(data.length / maxBins));
  const spectrum: number[] = [];
  for (let i = 0; i < data.length && spectrum.length < maxBins; i += step) {
    spectrum.push(data[i] / 255);
  }
  return spectrum;
}

export function formatFrequencyBand(
  frequencyHz: number,
  toleranceHz: number,
): string {
  return `${frequencyHz} Hz ±${toleranceHz} Hz`;
}

export class AudioAnalyzer {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;

  async start(): Promise<void> {
    if (this.context) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.context = new AudioContext();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.3;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
  }

  stop(): void {
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.context = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.dataArray = null;
  }

  analyzeFrame(
    frequencyHz: number,
    frequencyToleranceHz: number = DEFAULT_FREQUENCY_TOLERANCE_HZ,
  ): LiveFrame {
    if (!this.analyser || !this.dataArray || !this.context) {
      return {
        levelDbfs: -100,
        noiseFloorDbfs: -100,
        snrDb: 0,
        detected: false,
        spectrum: [],
      };
    }
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    const sampleRate = this.context.sampleRate;
    const { center, start, end } = getBinRange(
      frequencyHz,
      frequencyToleranceHz,
      sampleRate,
      FFT_SIZE,
    );
    const guardHz = Math.max(frequencyToleranceHz, 50);
    const marginBins = Math.max(
      3,
      Math.ceil((guardHz * FFT_SIZE) / sampleRate),
    );
    const amplitude = getTargetAmplitude(this.dataArray, start, end);
    const noise = getNoiseFloor(
      this.dataArray,
      center,
      start,
      end,
      marginBins,
    );
    const levelDbfs = amplitudeToDbfs(amplitude);
    const noiseFloorDbfs = amplitudeToDbfs(noise);
    const snrDb = levelDbfs - noiseFloorDbfs;
    return {
      levelDbfs,
      noiseFloorDbfs,
      snrDb,
      detected: snrDb >= 3 && levelDbfs > -80,
      spectrum: buildSpectrum(this.dataArray),
    };
  }

  async measure(
    frequencyHz: number,
    durationMs: number,
    passSnrThreshold: number,
    frequencyToleranceHz: number = DEFAULT_FREQUENCY_TOLERANCE_HZ,
    onFrame?: (frame: LiveFrame) => void,
  ): Promise<MeasurementResult> {
    await this.start();
    const frames: LiveFrame[] = [];
    const start = performance.now();
    while (performance.now() - start < durationMs) {
      const frame = this.analyzeFrame(frequencyHz, frequencyToleranceHz);
      frames.push(frame);
      onFrame?.(frame);
      await new Promise((r) => setTimeout(r, 50));
    }
    if (frames.length === 0) {
      return {
        detected: false,
        levelDbfs: -100,
        noiseFloorDbfs: -100,
        snrDb: 0,
        peakDbfs: -100,
        avgDbfs: -100,
        status: 'inconclusive',
      };
    }
    const levelDbfs =
      frames.reduce((s, f) => s + f.levelDbfs, 0) / frames.length;
    const noiseFloorDbfs =
      frames.reduce((s, f) => s + f.noiseFloorDbfs, 0) / frames.length;
    const snrDb = frames.reduce((s, f) => s + f.snrDb, 0) / frames.length;
    const peakDbfs = Math.max(...frames.map((f) => f.levelDbfs));
    const avgDbfs = levelDbfs;
    const detected = frames.filter((f) => f.detected).length > frames.length / 2;
    let status: MeasurementResult['status'] = 'inconclusive';
    if (detected && snrDb >= passSnrThreshold) {
      status = 'pass';
    } else if (!detected || snrDb < passSnrThreshold) {
      status = detected ? 'fail' : 'fail';
    }
    if (!detected && snrDb < 3) {
      status = 'inconclusive';
    }
    return {
      detected,
      levelDbfs,
      noiseFloorDbfs,
      snrDb,
      peakDbfs,
      avgDbfs,
      status,
    };
  }
}

export function applySplCalibration(
  levelDbfs: number,
  calibration?: { offsetDbSpl: number; referenceDbfs: number; referenceDbSpl: number },
): number | undefined {
  if (!calibration) return undefined;
  const offset = calibration.referenceDbSpl - calibration.referenceDbfs;
  return levelDbfs + offset;
}

export function getDeviceInfo(): string {
  return navigator.userAgent;
}
