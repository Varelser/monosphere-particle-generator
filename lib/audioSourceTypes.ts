import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ParticleConfig } from '../types';
import type { AnalyzerLike, Notice, SynthEngine } from './audioControllerTypes';

export type AudioControllerRefs = {
  analyzerRef: MutableRefObject<AnalyzerLike | null>;
  audioContextRef: MutableRefObject<AudioContext | null>;
  audioRef: MutableRefObject<{ bass: number; treble: number }>;
  microphoneStreamRef: MutableRefObject<MediaStream | null>;
  sharedAudioStreamRef: MutableRefObject<MediaStream | null>;
  synthEngineRef: MutableRefObject<SynthEngine | null>;
};

export type AudioControllerSetters = {
  setAudioNotice: Dispatch<SetStateAction<Notice | null>>;
  setConfig: Dispatch<SetStateAction<ParticleConfig>>;
  setIsAudioActive: Dispatch<SetStateAction<boolean>>;
};
