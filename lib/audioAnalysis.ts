import React from 'react';
import type { AnalyzerLike, AudioLevels } from './audioControllerTypes';

export type AudioAnalysisOptions = {
  sensitivity: number;
  gateThreshold: number;
  responseCurve: number;
  pulseDecay: number;
  // Custom frequency band Hz ranges
  bandALowHz: number;
  bandAHighHz: number;
  bandBLowHz: number;
  bandBHighHz: number;
  sampleRate: number;
};

export function createFakeSharedAudioAnalyzer() {
  return {
    frequencyBinCount: 128,
    fftSize: 256,
    getByteFrequencyData(data: Uint8Array) {
      data.fill(0);
      const amplitude = Math.max(0, Math.min(255, Math.round((window.__sharedAudioGain ?? 0) * 255)));
      for (let i = 1; i < 14 && i < data.length; i += 1) data[i] = amplitude;
      for (let i = 22; i < 84 && i < data.length; i += 1) data[i] = amplitude;
    },
  } satisfies AnalyzerLike;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getBandStats(data: Uint8Array, startRatio: number, endRatio: number) {
  const start = Math.max(0, Math.floor(data.length * startRatio));
  const end = Math.max(start + 1, Math.min(data.length, Math.ceil(data.length * endRatio)));
  let total = 0;
  let peak = 0;
  for (let index = start; index < end; index += 1) {
    const value = data[index] ?? 0;
    total += value;
    peak = Math.max(peak, value);
  }
  const average = total / Math.max(1, end - start) / 255;
  return {
    average,
    peak: peak / 255,
  };
}

function getTimeDomainRms(data: Uint8Array | null) {
  if (!data || data.length === 0) return 0;

  let total = 0;
  for (let index = 0; index < data.length; index += 1) {
    const normalized = ((data[index] ?? 128) - 128) / 128;
    total += normalized * normalized;
  }
  return Math.sqrt(total / data.length);
}

function smoothLevel(previous: number, target: number, rise: number, fall: number) {
  const blend = target > previous ? rise : fall;
  return previous + (target - previous) * blend;
}

function getBandByHz(
  data: Uint8Array,
  lowHz: number,
  highHz: number,
  sampleRate: number,
  fftSize: number,
) {
  const nyquist = sampleRate / 2;
  const startRatio = Math.max(0, lowHz / nyquist);
  const endRatio = Math.min(1, highHz / nyquist);
  return getBandStats(data, startRatio, endRatio);
}

export function createAudioLevelReader(analyzer: AnalyzerLike) {
  const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
  const timeDomainData = typeof analyzer.getByteTimeDomainData === 'function'
    ? new Uint8Array(Math.max(analyzer.fftSize ?? analyzer.frequencyBinCount * 2, analyzer.frequencyBinCount))
    : null;

  return (options: AudioAnalysisOptions, previousLevels: AudioLevels): AudioLevels => {
    analyzer.getByteFrequencyData(frequencyData);
    if (timeDomainData && typeof analyzer.getByteTimeDomainData === 'function') {
      analyzer.getByteTimeDomainData(timeDomainData);
    }

    const low = getBandStats(frequencyData, 0.01, 0.1);
    const lowMid = getBandStats(frequencyData, 0.1, 0.24);
    const presence = getBandStats(frequencyData, 0.24, 0.52);
    const brilliance = getBandStats(frequencyData, 0.52, 0.9);
    const rms = getTimeDomainRms(timeDomainData);

    const fftSize = (analyzer.fftSize ?? analyzer.frequencyBinCount * 2);
    const sampleRate = Math.max(8000, options.sampleRate);

    const bandARaw = getBandByHz(frequencyData, options.bandALowHz, options.bandAHighHz, sampleRate, fftSize);
    const bandBRaw = getBandByHz(frequencyData, options.bandBLowHz, options.bandBHighHz, sampleRate, fftSize);

    const nextSensitivity = Math.max(0, options.sensitivity);
    const gateThreshold = clamp01(options.gateThreshold);
    const responseCurve = Math.max(0.35, Math.min(2.5, options.responseCurve));
    const pulseDecay = clamp01(options.pulseDecay);

    const bassTargetRaw = clamp01(
      Math.max(
        low.average * 1.3,
        low.peak * 1.75,
        lowMid.average,
        lowMid.peak * 1.15,
        rms * 2.4,
      ) * nextSensitivity,
    );
    const trebleTargetRaw = clamp01(
      Math.max(
        brilliance.average * 1.4,
        brilliance.peak * 1.8,
        presence.average * 1.05,
        presence.peak * 1.25,
        rms * 1.2,
      ) * nextSensitivity,
    );
    const applyDynamics = (value: number) => {
      if (value < 0.02 && rms < 0.01) return 0;
      const gated = value <= gateThreshold ? 0 : (value - gateThreshold) / Math.max(0.0001, 1 - gateThreshold);
      return clamp01(Math.pow(clamp01(gated), responseCurve));
    };

    const gatedBassTarget = applyDynamics(bassTargetRaw);
    const gatedTrebleTarget = applyDynamics(trebleTargetRaw);
    const gatedBandATarget = applyDynamics(clamp01(Math.max(bandARaw.average * 1.4, bandARaw.peak * 1.8) * nextSensitivity));
    const gatedBandBTarget = applyDynamics(clamp01(Math.max(bandBRaw.average * 1.4, bandBRaw.peak * 1.8) * nextSensitivity));

    const smoothedBass = clamp01(smoothLevel(previousLevels.bass, gatedBassTarget, 0.28, 0.1));
    const smoothedTreble = clamp01(smoothLevel(previousLevels.treble, gatedTrebleTarget, 0.22, 0.08));
    const smoothedBandA = clamp01(smoothLevel(previousLevels.bandA, gatedBandATarget, 0.28, 0.1));
    const smoothedBandB = clamp01(smoothLevel(previousLevels.bandB, gatedBandBTarget, 0.22, 0.08));

    const pulseTarget = clamp01(
      Math.max(
        0,
        (gatedBassTarget - previousLevels.bass * 0.72) * 2.8,
        (gatedTrebleTarget - previousLevels.treble * 0.82) * 1.35,
      ) + gatedBassTarget * 0.22,
    );

    return {
      bass: smoothedBass,
      treble: smoothedTreble,
      pulse: clamp01(smoothLevel(previousLevels.pulse, pulseTarget, 0.68, pulseDecay)),
      bandA: smoothedBandA,
      bandB: smoothedBandB,
    };
  };
}

export function startAudioLevelMonitoring(
  analyzerRef: React.MutableRefObject<AnalyzerLike | null>,
  audioRef: React.MutableRefObject<AudioLevels>,
  options: AudioAnalysisOptions | React.MutableRefObject<AudioAnalysisOptions>,
) {
  const analyzer = analyzerRef.current;
  if (!analyzer) {
    return () => {};
  }

  const readAudioLevels = createAudioLevelReader(analyzer);
  let animationFrame = 0;
  const getOptions = () => ('current' in options ? options.current : options);

  const updateAudio = () => {
    audioRef.current = readAudioLevels(getOptions(), audioRef.current);
    animationFrame = requestAnimationFrame(updateAudio);
  };

  updateAudio();
  return () => cancelAnimationFrame(animationFrame);
}
