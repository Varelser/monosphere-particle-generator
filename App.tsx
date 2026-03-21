import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ControlPanel } from './components/ControlPanel';
import { AppScene } from './components/AppScene';
import { StandaloneSynthWindow } from './components/StandaloneSynthWindow';
import type { ParticleConfig, PresetSequenceItem } from './types';
import {
  DEFAULT_CONFIG,
  getInterLayerContactAmount,
  LIBRARY_SCOPE,
  loadInitialPrivateConfig,
  loadPresetSequence,
  normalizeConfig,
  PUBLIC_PRESET_LIBRARY,
} from './lib/appState';
import { useAppControlPanelProps } from './lib/useAppControlPanelProps';
import { useAppPresetActions } from './lib/useAppPresetActions';
import { useAudioController } from './lib/useAudioController';
import { useExportController } from './lib/useExportController';
import { useLibraryTransfer } from './lib/useLibraryTransfer';
import { usePresetLibrary } from './lib/usePresetLibrary';
import { usePresetTransition } from './lib/usePresetTransition';
import { useSequenceController } from './lib/useSequenceController';
import { AUDIO_BRIDGE_MODE_PARAM, AUDIO_BRIDGE_MODE_VALUE } from './lib/audioBridge';

const App: React.FC = () => {
  const appMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get(AUDIO_BRIDGE_MODE_PARAM)
    : null;
  if (appMode === AUDIO_BRIDGE_MODE_VALUE) {
    return <StandaloneSynthWindow />;
  }

  const isPublicLibraryMode = LIBRARY_SCOPE === 'public';
  const [config, setConfig] = useState<ParticleConfig>(() => (
    isPublicLibraryMode ? normalizeConfig(PUBLIC_PRESET_LIBRARY.currentConfig) : loadInitialPrivateConfig()
  ));
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isPresetTransitioning, setIsPresetTransitioning] = useState(false);
  const [videoExportMode, setVideoExportMode] = useState<'current' | 'sequence'>('sequence');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(8);
  const [videoFps, setVideoFps] = useState(30);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const initialPresetSequenceRef = useRef<PresetSequenceItem[] | null>(null);

  const {
    activePresetId,
    handleCreatePreset,
    handleDeletePreset,
    handleDismissLibraryNotice,
    handleDuplicatePreset,
    handleOverwritePreset,
    handleRandomize,
    handleRenamePreset,
    isPresetDirty,
    libraryNotice,
    presetBlendDuration,
    presets,
    setActivePresetId,
    setLibraryNotice,
    setPresets,
    setPresetBlendDuration,
    validPresetIds,
  } = usePresetLibrary({
    config,
    isPublicLibraryMode,
    setConfig,
  });

  const {
    applyConfigInstant,
    applyConfigMorph,
    latestConfigRef,
    stopPresetTransition,
  } = usePresetTransition({
    config,
    setActivePresetId,
    setConfig,
    setIsPresetTransitioning,
  });

  if (initialPresetSequenceRef.current === null) {
    initialPresetSequenceRef.current = isPublicLibraryMode
      ? PUBLIC_PRESET_LIBRARY.presetSequence
      : loadPresetSequence(validPresetIds);
  }

  const interLayerContactAmount = useMemo(() => getInterLayerContactAmount(config), [config]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;
    (window as Window & {
      __KALO_DEBUG__?: {
        getConfig: () => ParticleConfig;
        setConfig: (next: Partial<ParticleConfig>) => void;
        setPlaying: (next: boolean) => void;
      };
    }).__KALO_DEBUG__ = {
      getConfig: () => config,
      setConfig: (next) => setConfig((prev) => normalizeConfig({ ...prev, ...next })),
      setPlaying: (next) => setIsPlaying(next),
    };
    return () => {
      delete (window as Window & { __KALO_DEBUG__?: unknown }).__KALO_DEBUG__;
    };
  }, [config]);

  const {
    audioRef,
    audioNotice,
    dismissAudioNotice,
    handleAudioSourceModeChange,
    isAudioActive,
    sharedAudioStreamRef,
    startAudio,
    stopAudio,
    synthEngineRef,
  } = useAudioController({
    config,
    latestConfigRef,
    setConfig,
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || !import.meta.env.DEV) return;
    (window as Window & {
      __KALO_AUDIO_DEBUG__?: {
        getLevels: () => { bass: number; treble: number };
      };
    }).__KALO_AUDIO_DEBUG__ = {
      getLevels: () => ({ ...audioRef.current }),
    };
    return () => {
      delete (window as Window & { __KALO_AUDIO_DEBUG__?: unknown }).__KALO_AUDIO_DEBUG__;
    };
  }, [audioRef]);

  const {
    activeSequenceItemId,
    handleAddPresetToSequence,
    handleCaptureSequenceKeyframe,
    handleDuplicateSequenceItem,
    handleLoadSequenceItem,
    handleMoveSequenceItem,
    handleRemoveSequenceItem,
    handleRenameSequenceItem,
    handleReorderSequenceItem,
    handleResetSequenceKeyframe,
    handleSequenceDriveModeChange,
    handleSequenceDriveMultiplierChange,
    handleSequenceDriveStrengthModeChange,
    handleSequenceDriveStrengthOverrideChange,
    handleSequenceHoldChange,
    handleSequenceTransitionChange,
    handleSequenceTransitionEasingChange,
    handleStartSequencePlayback,
    handleStopSequencePlayback,
    isSequencePlaying,
    presetSequence,
    sequenceLoopEnabled,
    sequenceSinglePassDuration,
    sequenceStepProgress,
    setActiveSequenceItemId,
    setPresetSequence,
    setSequenceLoopEnabled,
    stopSequencePlayback,
  } = useSequenceController({
    applyConfigInstant,
    applyConfigMorph,
    config,
    initialPresetSequence: initialPresetSequenceRef.current,
    initialSequenceLoopEnabled: isPublicLibraryMode ? PUBLIC_PRESET_LIBRARY.sequenceLoopEnabled : true,
    isPresetTransitioning,
    isPublicLibraryMode,
    latestConfigRef,
    presetBlendDuration,
    presets,
    setLibraryNotice,
    validPresetIds,
  });

  const {
    dismissFrameNotice,
    dismissVideoNotice,
    frameNotice,
    isFrameExporting,
    isVideoRecording,
    startFrameExport,
    startVideoRecording,
    stopFrameExport,
    stopVideoRecording,
    videoNotice,
  } = useExportController({
    config,
    stopSequencePlayback,
    handleStartSequencePlayback,
    presetSequenceLength: presetSequence.length,
    rendererRef,
    sequenceLoopEnabled,
    sequenceSinglePassDuration,
    setSequenceLoopEnabled,
    sharedAudioStreamRef,
    synthEngineRef,
    videoDurationSeconds,
    videoExportMode,
    videoFps,
  });

  const { handleExportLibrary, handleImportLibrary } = useLibraryTransfer({
    activePresetId,
    config,
    isPublicLibraryMode,
    presetBlendDuration,
    presetSequence,
    presets,
    sequenceLoopEnabled,
    setActivePresetId,
    setActiveSequenceItemId,
    setConfig,
    setLibraryNotice,
    setPresetBlendDuration,
    setPresetSequence,
    setPresets,
    setSequenceLoopEnabled,
    stopPresetTransition,
    stopSequencePlayback,
    validPresetIds,
  });

  const { handleLoadPreset, handleTransitionToPreset } = useAppPresetActions({
    applyConfigInstant,
    applyConfigMorph,
    presetBlendDuration,
    presets,
    stopSequencePlayback,
  });

  const controlPanelProps = useAppControlPanelProps({
    activePresetId,
    activeSequenceItemId,
    audioNotice,
    audioSourceMode: config.audioSourceMode,
    config,
    contactAmount: interLayerContactAmount,
    frameNotice,
    isAudioActive,
    isFrameExporting,
    isOpen: isPanelOpen,
    isPlaying,
    isPresetDirty,
    isPresetTransitioning,
    isPublicLibraryMode,
    isSequencePlaying,
    isVideoRecording,
    libraryNotice,
    libraryScope: LIBRARY_SCOPE,
    onAddPresetToSequence: handleAddPresetToSequence,
    onAudioSourceModeChange: handleAudioSourceModeChange,
    onCaptureSequenceKeyframe: handleCaptureSequenceKeyframe,
    onCreatePreset: handleCreatePreset,
    onDeletePreset: handleDeletePreset,
    onDismissAudioNotice: dismissAudioNotice,
    onDismissFrameNotice: dismissFrameNotice,
    onDismissLibraryNotice: handleDismissLibraryNotice,
    onDismissVideoNotice: dismissVideoNotice,
    onDuplicatePreset: handleDuplicatePreset,
    onDuplicateSequenceItem: handleDuplicateSequenceItem,
    onExportLibrary: handleExportLibrary,
    onImportLibrary: handleImportLibrary,
    onLoadPreset: handleLoadPreset,
    onLoadSequenceItem: handleLoadSequenceItem,
    onMoveSequenceItem: handleMoveSequenceItem,
    onOverwritePreset: handleOverwritePreset,
    onPresetBlendDurationChange: setPresetBlendDuration,
    onRandomize: handleRandomize,
    onRemoveSequenceItem: handleRemoveSequenceItem,
    onRenamePreset: handleRenamePreset,
    onRenameSequenceItem: handleRenameSequenceItem,
    onReorderSequenceItem: handleReorderSequenceItem,
    onResetSequenceKeyframe: handleResetSequenceKeyframe,
    onSequenceDriveModeChange: handleSequenceDriveModeChange,
    onSequenceDriveMultiplierChange: handleSequenceDriveMultiplierChange,
    onSequenceDriveStrengthModeChange: handleSequenceDriveStrengthModeChange,
    onSequenceDriveStrengthOverrideChange: handleSequenceDriveStrengthOverrideChange,
    onSequenceHoldChange: handleSequenceHoldChange,
    onSequenceLoopEnabledChange: setSequenceLoopEnabled,
    onSequenceTransitionChange: handleSequenceTransitionChange,
    onSequenceTransitionEasingChange: handleSequenceTransitionEasingChange,
    onStartFrameExport: startFrameExport,
    onStartSequencePlayback: handleStartSequencePlayback,
    onStartVideoRecording: startVideoRecording,
    onStopFrameExport: stopFrameExport,
    onStopPresetTransition: stopPresetTransition,
    onStopSequencePlayback: handleStopSequencePlayback,
    onStopVideoRecording: stopVideoRecording,
    onTransitionToPreset: handleTransitionToPreset,
    onVideoDurationSecondsChange: setVideoDurationSeconds,
    onVideoExportModeChange: setVideoExportMode,
    onVideoFpsChange: setVideoFps,
    presetBlendDuration,
    presetSequence,
    presets,
    sequenceLoopEnabled,
    sequenceSinglePassDuration,
    sequenceStepProgress,
    setConfig,
    setIsOpen: setIsPanelOpen,
    setIsPlaying,
    setSaveTrigger,
    startAudio,
    stopAudio,
    videoDurationSeconds,
    videoExportMode,
    videoFps,
    videoNotice,
  });

  return (
    <div className={`relative w-full h-screen ${config.backgroundColor === 'white' ? 'bg-white' : 'bg-black'}`}>
      <AppScene
        audioRef={audioRef}
        config={config}
        interLayerContactAmount={interLayerContactAmount}
        isPlaying={isPlaying}
        isSequencePlaying={isSequencePlaying}
        rendererRef={rendererRef}
        saveTrigger={saveTrigger}
        sequenceStepProgress={sequenceStepProgress}
      />
      <ControlPanel
        {...controlPanelProps}
      />
    </div>
  );
};

export default App;
