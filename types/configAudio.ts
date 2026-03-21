import type { AudioSourceMode, SynthScale, SynthWaveform } from './audio';

export interface ParticleConfigAudio {
  audioEnabled: boolean;
  audioSourceMode: AudioSourceMode;
  audioSensitivity: number;
  audioBeatScale: number;
  audioJitterScale: number;
  audioBassMotionScale: number;
  audioBassSizeScale: number;
  audioBassAlphaScale: number;
  audioTrebleMotionScale: number;
  audioTrebleSizeScale: number;
  audioTrebleAlphaScale: number;
  audioLineScale: number;
  audioCameraScale: number;
  synthWaveform: SynthWaveform;
  synthScale: SynthScale;
  synthBaseFrequency: number;
  synthTempo: number;
  synthVolume: number;
  synthCutoff: number;
  synthPatternDepth: number;
  synthPattern: number[];
}
