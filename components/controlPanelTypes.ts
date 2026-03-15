import React from 'react';
import {
  AudioSourceMode,
  ParticleConfig,
  PresetRecord,
  PresetSequenceItem,
  SequenceDriveMode,
  SequenceDriveStrengthMode,
  SequenceTransitionEasing,
} from '../types';

export interface ControlPanelCoreProps {
  config: ParticleConfig;
  contactAmount: number;
  libraryScope: 'private' | 'public';
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  isPlaying: boolean;
  togglePlay: () => void;
  onSave: () => void;
  onReset: () => void;
  onRandomize: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export interface ControlPanelPresetProps {
  presets: PresetRecord[];
  activePresetId: string | null;
  isPresetDirty: boolean;
  onCreatePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onOverwritePreset: (presetId: string) => void;
  onRenamePreset: (presetId: string, nextName: string) => void;
  onDuplicatePreset: (presetId: string) => void;
  onDeletePreset: (presetId: string) => void;
  presetBlendDuration: number;
  onPresetBlendDurationChange: (seconds: number) => void;
  onTransitionToPreset: (presetId: string) => void;
  isPresetTransitioning: boolean;
  onStopPresetTransition: () => void;
}

export interface ControlPanelSequenceProps {
  presetSequence: PresetSequenceItem[];
  activeSequenceItemId: string | null;
  isSequencePlaying: boolean;
  sequenceLoopEnabled: boolean;
  onSequenceLoopEnabledChange: (enabled: boolean) => void;
  onAddPresetToSequence: (presetId: string) => void;
  onRemoveSequenceItem: (itemId: string) => void;
  onSequenceHoldChange: (itemId: string, holdSeconds: number) => void;
  onSequenceTransitionChange: (itemId: string, transitionSeconds: number) => void;
  onSequenceTransitionEasingChange: (itemId: string, transitionEasing: SequenceTransitionEasing) => void;
  onSequenceDriveModeChange: (itemId: string, mode: SequenceDriveMode) => void;
  onSequenceDriveStrengthModeChange: (itemId: string, mode: SequenceDriveStrengthMode) => void;
  onSequenceDriveStrengthOverrideChange: (itemId: string, value: number) => void;
  onSequenceDriveMultiplierChange: (itemId: string, multiplier: number) => void;
  onRenameSequenceItem: (itemId: string, label: string) => void;
  onCaptureSequenceKeyframe: (itemId: string) => void;
  onResetSequenceKeyframe: (itemId: string) => void;
  onLoadSequenceItem: (itemId: string) => void;
  onDuplicateSequenceItem: (itemId: string) => void;
  onMoveSequenceItem: (itemId: string, direction: -1 | 1) => void;
  onReorderSequenceItem: (sourceItemId: string, targetItemId: string) => void;
  onStartSequencePlayback: () => void;
  onStopSequencePlayback: () => void;
  sequenceStepProgress: number;
  sequenceSinglePassDuration: number;
}

export interface ControlPanelExportProps {
  audioSourceMode: AudioSourceMode;
  videoExportMode: 'current' | 'sequence';
  onVideoExportModeChange: (mode: 'current' | 'sequence') => void;
  videoDurationSeconds: number;
  onVideoDurationSecondsChange: (seconds: number) => void;
  videoFps: number;
  onVideoFpsChange: (fps: number) => void;
  isVideoRecording: boolean;
  onStartVideoRecording: () => void;
  onStopVideoRecording: () => void;
  videoNotice: { tone: 'success' | 'error'; message: string } | null;
  onDismissVideoNotice: () => void;
  isFrameExporting: boolean;
  onStartFrameExport: () => void;
  onStopFrameExport: () => void;
  frameNotice: { tone: 'success' | 'error'; message: string } | null;
  onDismissFrameNotice: () => void;
}

export interface ControlPanelLibraryProps {
  onExportLibrary: () => void;
  onImportLibrary: (file: File, mode: 'append' | 'replace') => void;
  libraryNotice: { tone: 'success' | 'error'; message: string } | null;
  onDismissLibraryNotice: () => void;
}

export interface ControlPanelAudioProps {
  audioSourceMode: AudioSourceMode;
  onAudioSourceModeChange: (mode: AudioSourceMode) => void;
  audioNotice: { tone: 'success' | 'error'; message: string } | null;
  onDismissAudioNotice: () => void;
  startAudio: () => void;
  stopAudio: () => void;
  isAudioActive: boolean;
}

export interface ControlPanelProps extends
  ControlPanelCoreProps,
  ControlPanelPresetProps,
  ControlPanelSequenceProps,
  ControlPanelExportProps,
  ControlPanelLibraryProps,
  ControlPanelAudioProps {}
