import React from 'react';
import type { AnalyzerLike } from './audioControllerTypes';

export function createFakeSharedAudioAnalyzer() {
  return {
    frequencyBinCount: 128,
    getByteFrequencyData(data: Uint8Array) {
      data.fill(0);
      const amplitude = Math.max(0, Math.min(255, Math.round((window.__sharedAudioGain ?? 0) * 255)));
      for (let i = 0; i < 10 && i < data.length; i += 1) data[i] = amplitude;
      for (let i = 80; i < 120 && i < data.length; i += 1) data[i] = amplitude;
    },
  } satisfies AnalyzerLike;
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

  let animationFrame = 0;
  const dataArray = new Uint8Array(analyzer.frequencyBinCount);

  const updateAudio = () => {
    const nextSensitivity = Math.max(0, sensitivity);
    analyzerRef.current?.getByteFrequencyData(dataArray);
    let bass = 0;
    let treble = 0;
    for (let index = 0; index < 10; index += 1) {
      bass += dataArray[index] ?? 0;
    }
    for (let index = 80; index < 120; index += 1) {
      treble += dataArray[index] ?? 0;
    }
    audioRef.current.bass = Math.min(1, (bass / 10 / 255) * nextSensitivity);
    audioRef.current.treble = Math.min(1, (treble / 40 / 255) * nextSensitivity);
    animationFrame = requestAnimationFrame(updateAudio);
  };

  updateAudio();
  return () => cancelAnimationFrame(animationFrame);
}
