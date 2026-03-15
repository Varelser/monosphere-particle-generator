import type { AudioSourceMode, SynthScale, SynthWaveform } from './audio';

export interface ParticleConfigAudio {
  audioEnabled: boolean;
  audioSourceMode: AudioSourceMode;
  audioSensitivity: number;
  audioBeatScale: number;
  audioJitterScale: number;
  synthWaveform: SynthWaveform;
  synthScale: SynthScale;
  synthBaseFrequency: number;
  synthTempo: number;
  synthVolume: number;
  synthCutoff: number;
  synthPatternDepth: number;
  synthPattern: number[];
}
