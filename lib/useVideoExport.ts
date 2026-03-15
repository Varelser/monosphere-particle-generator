import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';
import type { Notice, SynthEngine } from './audioControllerTypes';
import {
  getSupportedVideoMimeType,
  validateVideoExportTarget,
} from './videoExportHelpers';
import {
  cleanupVideoExportSession,
  startVideoRecorderSession,
  stopVideoRecorder,
} from './videoExportRecording';

type UseVideoExportArgs = {
  config: ParticleConfig;
  handleStartSequencePlayback: () => void;
  presetSequenceLength: number;
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>;
  sequenceLoopEnabled: boolean;
  sequenceSinglePassDuration: number;
  setSequenceLoopEnabled: (value: boolean) => void;
  sharedAudioStreamRef: MutableRefObject<MediaStream | null>;
  stopSequencePlayback: () => void;
  synthEngineRef: MutableRefObject<SynthEngine | null>;
  videoDurationSeconds: number;
  videoExportMode: 'current' | 'sequence';
  videoFps: number;
};

export function useVideoExport({
  config,
  handleStartSequencePlayback,
  presetSequenceLength,
  rendererRef,
  sequenceLoopEnabled,
  sequenceSinglePassDuration,
  setSequenceLoopEnabled,
  sharedAudioStreamRef,
  stopSequencePlayback,
  synthEngineRef,
  videoDurationSeconds,
  videoExportMode,
  videoFps,
}: UseVideoExportArgs) {
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoNotice, setVideoNotice] = useState<Notice | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoStopTimerRef = useRef<number | null>(null);
  const recordingLoopRestoreRef = useRef<boolean | null>(null);
  const recordingModeRef = useRef<'current' | 'sequence'>('current');

  const clearVideoStopTimer = useCallback(() => {
    if (videoStopTimerRef.current !== null) {
      window.clearTimeout(videoStopTimerRef.current);
      videoStopTimerRef.current = null;
    }
  }, []);

  const dismissVideoNotice = useCallback(() => {
    setVideoNotice(null);
  }, []);

  const showVideoNotice = useCallback((message: string) => {
    setVideoNotice({ tone: 'error', message });
  }, []);

  const stopVideoRecording = useCallback(() => {
    clearVideoStopTimer();

    if (recordingModeRef.current === 'sequence') {
      stopSequencePlayback();
    }

    stopVideoRecorder({
      mediaRecorderRef,
      mediaStreamRef,
      recordingLoopRestoreRef,
      videoChunksRef,
    }, {
      setIsVideoRecording,
      setSequenceLoopEnabled,
      setVideoNotice,
    });
  }, [clearVideoStopTimer, setSequenceLoopEnabled, stopSequencePlayback]);

  const startVideoRecording = useCallback(() => {
    const renderer = rendererRef.current;
    const canvas = renderer?.domElement ?? null;
    const validationError = validateVideoExportTarget(
      canvas,
      presetSequenceLength,
      sequenceSinglePassDuration,
      videoDurationSeconds,
      videoExportMode,
    );
    if (validationError) {
      setVideoNotice({ tone: 'error', message: validationError });
      return;
    }

    const targetDuration = videoExportMode === 'sequence'
      ? sequenceSinglePassDuration
      : Math.max(0.5, videoDurationSeconds);
    const mimeType = getSupportedVideoMimeType();
    if (!canvas) {
      return;
    }

    dismissVideoNotice();
    clearVideoStopTimer();
    videoChunksRef.current = [];
    recordingModeRef.current = videoExportMode;
    recordingLoopRestoreRef.current = sequenceLoopEnabled;

    try {
      startVideoRecorderSession({
        canvas,
        config,
        mimeType,
        refs: {
          mediaRecorderRef,
          mediaStreamRef,
          recordingLoopRestoreRef,
          videoChunksRef,
        },
        setters: {
          setIsVideoRecording,
          setSequenceLoopEnabled,
          setVideoNotice,
        },
        sharedAudioStreamRef,
        stopVideoRecording,
        synthEngineRef,
        videoExportMode,
        videoFps,
      });

      if (videoExportMode === 'sequence') {
        setSequenceLoopEnabled(false);
        handleStartSequencePlayback();
      }

      videoStopTimerRef.current = window.setTimeout(() => {
        stopVideoRecording();
      }, targetDuration * 1000);
    } catch (error) {
      console.error('Video recording failed to start:', error);
      setVideoNotice({ tone: 'error', message: 'Could not start video recording.' });
      stopVideoRecording();
    }
  }, [
    clearVideoStopTimer,
    config.audioSourceMode,
    dismissVideoNotice,
    handleStartSequencePlayback,
    presetSequenceLength,
    rendererRef,
    sequenceLoopEnabled,
    sequenceSinglePassDuration,
    setSequenceLoopEnabled,
    sharedAudioStreamRef,
    stopVideoRecording,
    synthEngineRef,
    videoDurationSeconds,
    videoExportMode,
    videoFps,
  ]);

  useEffect(() => () => {
    clearVideoStopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupVideoExportSession({
      mediaRecorderRef,
      mediaStreamRef,
      recordingLoopRestoreRef,
      videoChunksRef,
    }, {
      setIsVideoRecording,
      setSequenceLoopEnabled,
      setVideoNotice,
    });
  }, [clearVideoStopTimer]);

  return {
    dismissVideoNotice,
    isVideoRecording,
    showVideoNotice,
    startVideoRecording,
    stopVideoRecording,
    videoNotice,
  };
}
