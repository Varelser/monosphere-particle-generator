import { Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import type { AudioSourceMode, ParticleConfig } from '../types';
import { startAudioLevelMonitoring } from './audioAnalysis';
import { applySynthSettings, restartSynthSequencer } from './audioSynth';
import type { AnalyzerLike, Notice, SynthEngine } from './audioControllerTypes';
import { startSelectedAudioSource, stopAudioResources } from './audioSourceManager';

type UseAudioControllerArgs = {
  config: ParticleConfig;
  latestConfigRef: MutableRefObject<ParticleConfig>;
  setConfig: Dispatch<SetStateAction<ParticleConfig>>;
};

export function useAudioController({ config, latestConfigRef, setConfig }: UseAudioControllerArgs) {
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioNotice, setAudioNotice] = useState<Notice | null>(null);
  const audioRef = useRef({ bass: 0, treble: 0 });
  const analyzerRef = useRef<AnalyzerLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const sharedAudioStreamRef = useRef<MediaStream | null>(null);
  const synthEngineRef = useRef<SynthEngine | null>(null);

  const dismissAudioNotice = useCallback(() => {
    setAudioNotice(null);
  }, []);

  const stopAudio = useCallback(() => {
    stopAudioResources({
      analyzerRef,
      audioContextRef,
      audioRef,
      microphoneStreamRef,
      sharedAudioStreamRef,
      synthEngineRef,
    }, setConfig, setIsAudioActive);
  }, [setConfig]);

  const startAudio = useCallback(async () => {
    try {
      stopAudio();
      setAudioNotice(null);
      await startSelectedAudioSource(
        latestConfigRef,
        {
          analyzerRef,
          audioContextRef,
          audioRef,
          microphoneStreamRef,
          sharedAudioStreamRef,
          synthEngineRef,
        },
        {
          setAudioNotice,
          setConfig,
          setIsAudioActive,
        },
        stopAudio,
      );
    } catch (err) {
      console.error('Audio initialization failed:', err);
      const message = err instanceof Error ? err.message : 'Audio input could not be started.';
      setAudioNotice({ tone: 'error', message });
    }
  }, [latestConfigRef, setConfig, stopAudio]);

  const handleAudioSourceModeChange = useCallback((mode: AudioSourceMode) => {
    stopAudio();
    setAudioNotice(null);
    setConfig((prev) => ({ ...prev, audioSourceMode: mode }));
  }, [setConfig, stopAudio]);

  useEffect(() => {
    const synth = synthEngineRef.current;
    if (!synth || latestConfigRef.current.audioSourceMode !== 'internal-synth') {
      return;
    }

    applySynthSettings(synth, latestConfigRef.current);
  }, [config.synthCutoff, config.synthPatternDepth, config.synthVolume, config.synthWaveform, latestConfigRef]);

  useEffect(() => {
    const synth = synthEngineRef.current;
    if (!synth || latestConfigRef.current.audioSourceMode !== 'internal-synth') {
      return;
    }

    restartSynthSequencer(synth, latestConfigRef.current);

    return () => {
      if (synth.stepTimer !== null) {
        window.clearInterval(synth.stepTimer);
        synth.stepTimer = null;
      }
    };
  }, [
    config.synthBaseFrequency,
    config.synthCutoff,
    config.synthPattern,
    config.synthPatternDepth,
    config.synthScale,
    config.synthTempo,
    latestConfigRef,
  ]);

  useEffect(() => {
    if (!isAudioActive || !analyzerRef.current) {
      return;
    }
    return startAudioLevelMonitoring(analyzerRef, audioRef, config.audioSensitivity);
  }, [config.audioSensitivity, isAudioActive]);

  useEffect(() => () => {
    stopAudio();
  }, [stopAudio]);

  return {
    audioRef,
    audioNotice,
    dismissAudioNotice,
    handleAudioSourceModeChange,
    isAudioActive,
    sharedAudioStreamRef,
    startAudio,
    stopAudio,
    synthEngineRef,
  };
}
