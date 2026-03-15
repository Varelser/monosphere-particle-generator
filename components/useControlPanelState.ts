import React from 'react';
import type { ParticleConfig, PresetRecord } from '../types';
import { useControlPanelConfigHelpers } from './useControlPanelConfigHelpers';
import { useControlPanelLocalState } from './useControlPanelLocalState';
import { useSequenceDrag } from './useSequenceDrag';

type UseControlPanelStateArgs = {
  audioSourceMode: 'microphone' | 'shared-audio' | 'internal-synth';
  config: ParticleConfig;
  isAudioActive: boolean;
  isPublicLibrary: boolean;
  onCreatePreset: (name: string) => void;
  onImportLibrary: (file: File, mode: 'append' | 'replace') => void;
  onRenamePreset: (presetId: string, nextName: string) => void;
  onReorderSequenceItem: (sourceItemId: string, targetItemId: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
};

export function useControlPanelState({
  audioSourceMode,
  isAudioActive,
  isPublicLibrary,
  onCreatePreset,
  onImportLibrary,
  onRenamePreset,
  onReorderSequenceItem,
  setConfig,
}: UseControlPanelStateArgs) {
  const localState = useControlPanelLocalState();
  const configHelpers = useControlPanelConfigHelpers({
    isPublicLibrary,
    setConfig,
  });

  const audioActionLabel = audioSourceMode === 'microphone'
    ? (isAudioActive ? 'Microphone Active' : 'Start Microphone')
    : audioSourceMode === 'shared-audio'
      ? (isAudioActive ? 'Shared Audio Active' : 'Start Shared Audio')
      : (isAudioActive ? 'Built-in Synth Active' : 'Start Built-in Synth');

  const sequenceDrag = useSequenceDrag({
    draggingSequenceItemId: localState.draggingSequenceItemId,
    isPublicLibrary,
    onReorderSequenceItem,
    setDraggingSequenceItemId: localState.setDraggingSequenceItemId,
    setDropTargetSequenceItemId: localState.setDropTargetSequenceItemId,
  });

  const handleCreatePreset = () => {
    const trimmed = localState.presetName.trim();
    if (!trimmed) {
      return;
    }
    onCreatePreset(trimmed);
    localState.setPresetName('');
  };

  const handleStartRename = (preset: PresetRecord) => {
    localState.setEditingPresetId(preset.id);
    localState.setEditingPresetName(preset.name);
  };

  const handleSubmitRename = (presetId: string) => {
    const trimmed = localState.editingPresetName.trim();
    if (!trimmed) {
      return;
    }
    onRenamePreset(presetId, trimmed);
    localState.setEditingPresetId(null);
    localState.setEditingPresetName('');
  };

  const handleLibraryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await onImportLibrary(file, localState.libraryImportMode);
    event.target.value = '';
  };

  return {
    activeTab: localState.activeTab,
    applyPerformancePreset: configHelpers.applyPerformancePreset,
    applyScreenFxPreset: configHelpers.applyScreenFxPreset,
    audioActionLabel,
    draggingSequenceItemId: localState.draggingSequenceItemId,
    dropTargetSequenceItemId: localState.dropTargetSequenceItemId,
    editingPresetId: localState.editingPresetId,
    editingPresetName: localState.editingPresetName,
    formatPresetDate: configHelpers.formatPresetDate,
    handleCreatePreset,
    handleLibraryFileChange,
    handleSequenceDragEnd: sequenceDrag.handleSequenceDragEnd,
    handleSequenceDragOver: sequenceDrag.handleSequenceDragOver,
    handleSequenceDragStart: sequenceDrag.handleSequenceDragStart,
    handleSequenceDrop: sequenceDrag.handleSequenceDrop,
    handleStartRename,
    handleSubmitRename,
    libraryImportMode: localState.libraryImportMode,
    libraryInputRef: localState.libraryInputRef,
    lockedPanelClass: configHelpers.lockedPanelClass,
    presetName: localState.presetName,
    setActiveTab: localState.setActiveTab,
    setEditingPresetId: localState.setEditingPresetId,
    setEditingPresetName: localState.setEditingPresetName,
    setLibraryImportMode: localState.setLibraryImportMode,
    setPresetName: localState.setPresetName,
    updateConfig: configHelpers.updateConfig,
    updateLayer1Array: configHelpers.updateLayer1Array,
    updateLayerArray: configHelpers.updateLayerArray,
    updateMotionArray: configHelpers.updateMotionArray,
    updatePositionArray: configHelpers.updatePositionArray,
  };
}
