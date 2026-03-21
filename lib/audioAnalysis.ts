import React from 'react';
import type { AnalyzerLike } from './audioControllerTypes';

type AudioLevels = { bass: number; treble: number };

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

export function createAudioLevelReader(analyzer: AnalyzerLike) {
  const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
  const timeDomainData = typeof analyzer.getByteTimeDomainData === 'function'
    ? new Uint8Array(Math.max(analyzer.fftSize ?? analyzer.frequencyBinCount * 2, analyzer.frequencyBinCount))
    : null;

  return (sensitivity: number, previousLevels: AudioLevels): AudioLevels => {
    analyzer.getByteFrequencyData(frequencyData);
    if (timeDomainData && typeof analyzer.getByteTimeDomainData === 'function') {
      analyzer.getByteTimeDomainData(timeDomainData);
    }

    const low = getBandStats(frequencyData, 0.01, 0.1);
    const lowMid = getBandStats(frequencyData, 0.1, 0.24);
    const presence = getBandStats(frequencyData, 0.24, 0.52);
    const brilliance = getBandStats(frequencyData, 0.52, 0.9);
    const rms = getTimeDomainRms(timeDomainData);

    const nextSensitivity = Math.max(0, sensitivity);
    const bassTarget = clamp01(
      Math.max(
        low.average * 1.3,
        low.peak * 1.75,
        lowMid.average,
        lowMid.peak * 1.15,
        rms * 2.4,
      ) * nextSensitivity,
    );
    const trebleTarget = clamp01(
      Math.max(
        brilliance.average * 1.4,
        brilliance.peak * 1.8,
        presence.average * 1.05,
        presence.peak * 1.25,
        rms * 1.2,
      ) * nextSensitivity,
    );
    const gatedBassTarget = bassTarget < 0.02 && rms < 0.01 ? 0 : bassTarget;
    const gatedTrebleTarget = trebleTarget < 0.02 && rms < 0.01 ? 0 : trebleTarget;

    return {
      bass: clamp01(smoothLevel(previousLevels.bass, gatedBassTarget, 0.28, 0.1)),
      treble: clamp01(smoothLevel(previousLevels.treble, gatedTrebleTarget, 0.22, 0.08)),
    };
  };
}

export function startAudioLevelMonitoring(
  analyzerRef: React.MutableRefObject<AnalyzerLike | null>,
  audioRef: React.MutableRefObject<{ bass: number; treble: number }>,
  sensitivity: number,
) {
  const analyzer = analyzerRef.current;
  if (!analyzer) {
    return () => {};
  }

  const readAudioLevels = createAudioLevelReader(analyzer);
  let animationFrame = 0;

  const updateAudio = () => {
    audioRef.current = readAudioLevels(sensitivity, audioRef.current);
    animationFrame = requestAnimationFrame(updateAudio);
  };

  updateAudio();
  return () => cancelAnimationFrame(animationFrame);
}
