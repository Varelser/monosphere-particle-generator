import React from 'react';
import {
  ControlPanelActions,
  ControlPanelFooter,
  ControlPanelHeader,
  ControlPanelTabBar,
  ControlPanelTrigger,
} from './controlPanelChrome';
import { ControlPanelContent } from './controlPanelTabs';
import { ControlPanelProps } from './controlPanelTypes';
import { useControlPanelState } from './useControlPanelState';

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    config,
    contactAmount,
    libraryScope,
    setConfig,
    isOpen,
    setIsOpen,
  } = props;
  const isPublicLibrary = libraryScope === 'public';
  const {
    activeTab,
    applyPerformancePreset,
    applyScreenFxPreset,
    audioActionLabel,
    draggingSequenceItemId,
    dropTargetSequenceItemId,
    editingPresetId,
    editingPresetName,
    formatPresetDate,
    handleCreatePreset,
    handleLibraryFileChange,
    handleSequenceDragEnd,
    handleSequenceDragOver,
    handleSequenceDragStart,
    handleSequenceDrop,
    handleStartRename,
    handleSubmitRename,
    libraryImportMode,
    libraryInputRef,
    lockedPanelClass,
    presetName,
    setActiveTab,
    setEditingPresetId,
    setEditingPresetName,
    setLibraryImportMode,
    setPresetName,
    updateConfig,
    updateLayer1Array,
    updateLayerArray,
    updateMotionArray,
    updatePositionArray,
  } = useControlPanelState({
    audioSourceMode: props.audioSourceMode,
    config,
    isAudioActive: props.isAudioActive,
    isPublicLibrary,
    onCreatePreset: props.onCreatePreset,
    onImportLibrary: props.onImportLibrary,
    onRenamePreset: props.onRenamePreset,
    onReorderSequenceItem: props.onReorderSequenceItem,
    setConfig,
  });

  if (!isOpen) {
    return <ControlPanelTrigger backgroundColor={config.backgroundColor} onOpen={() => setIsOpen(true)} />;
  }

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-black/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-50 transition-transform duration-300 shadow-2xl text-white">
      <ControlPanelHeader onClose={() => setIsOpen(false)} />
      <ControlPanelActions
        isPlaying={props.isPlaying}
        isPublicLibrary={isPublicLibrary}
        onRandomize={props.onRandomize}
        onReset={props.onReset}
        togglePlay={props.togglePlay}
      />
      <ControlPanelTabBar activeTab={activeTab} onSelectTab={setActiveTab} />

      <ControlPanelContent
        activeTab={activeTab}
        config={config}
        contactAmount={contactAmount}
        isPublicLibrary={isPublicLibrary}
        lockedPanelClass={lockedPanelClass}
        updateConfig={updateConfig}
        applyPerformancePreset={applyPerformancePreset}
        applyScreenFxPreset={applyScreenFxPreset}
        presetName={presetName}
        setPresetName={setPresetName}
        handleCreatePreset={handleCreatePreset}
        activePresetId={props.activePresetId}
        onOverwritePreset={props.onOverwritePreset}
        isPresetTransitioning={props.isPresetTransitioning}
        onStopPresetTransition={props.onStopPresetTransition}
        presetBlendDuration={props.presetBlendDuration}
        onPresetBlendDurationChange={props.onPresetBlendDurationChange}
        libraryInputRef={libraryInputRef}
        handleLibraryFileChange={handleLibraryFileChange}
        onExportLibrary={props.onExportLibrary}
        libraryImportMode={libraryImportMode}
        setLibraryImportMode={setLibraryImportMode}
        libraryNotice={props.libraryNotice}
        onDismissLibraryNotice={props.onDismissLibraryNotice}
        sequenceLoopEnabled={props.sequenceLoopEnabled}
        onSequenceLoopEnabledChange={props.onSequenceLoopEnabledChange}
        isSequencePlaying={props.isSequencePlaying}
        onStartSequencePlayback={props.onStartSequencePlayback}
        onStopSequencePlayback={props.onStopSequencePlayback}
        presetSequence={props.presetSequence}
        activeSequenceItemId={props.activeSequenceItemId}
        sequenceSinglePassDuration={props.sequenceSinglePassDuration}
        onLoadSequenceItem={props.onLoadSequenceItem}
        sequenceStepProgress={props.sequenceStepProgress}
        draggingSequenceItemId={draggingSequenceItemId}
        dropTargetSequenceItemId={dropTargetSequenceItemId}
        handleSequenceDragStart={handleSequenceDragStart}
        handleSequenceDragOver={handleSequenceDragOver}
        handleSequenceDrop={handleSequenceDrop}
        handleSequenceDragEnd={handleSequenceDragEnd}
        presets={props.presets}
        onRenameSequenceItem={props.onRenameSequenceItem}
        onSequenceHoldChange={props.onSequenceHoldChange}
        onSequenceTransitionChange={props.onSequenceTransitionChange}
        onSequenceTransitionEasingChange={props.onSequenceTransitionEasingChange}
        onSequenceDriveModeChange={props.onSequenceDriveModeChange}
        onSequenceDriveStrengthModeChange={props.onSequenceDriveStrengthModeChange}
        onSequenceDriveStrengthOverrideChange={props.onSequenceDriveStrengthOverrideChange}
        onSequenceDriveMultiplierChange={props.onSequenceDriveMultiplierChange}
        onCaptureSequenceKeyframe={props.onCaptureSequenceKeyframe}
        onResetSequenceKeyframe={props.onResetSequenceKeyframe}
        onDuplicateSequenceItem={props.onDuplicateSequenceItem}
        onMoveSequenceItem={props.onMoveSequenceItem}
        onRemoveSequenceItem={props.onRemoveSequenceItem}
        videoExportMode={props.videoExportMode}
        onVideoExportModeChange={props.onVideoExportModeChange}
        videoFps={props.videoFps}
        onVideoFpsChange={props.onVideoFpsChange}
        videoDurationSeconds={props.videoDurationSeconds}
        onVideoDurationSecondsChange={props.onVideoDurationSecondsChange}
        isVideoRecording={props.isVideoRecording}
        onStartVideoRecording={props.onStartVideoRecording}
        onStopVideoRecording={props.onStopVideoRecording}
        isFrameExporting={props.isFrameExporting}
        onStartFrameExport={props.onStartFrameExport}
        onStopFrameExport={props.onStopFrameExport}
        videoNotice={props.videoNotice}
        onDismissVideoNotice={props.onDismissVideoNotice}
        frameNotice={props.frameNotice}
        onDismissFrameNotice={props.onDismissFrameNotice}
        editingPresetId={editingPresetId}
        editingPresetName={editingPresetName}
        setEditingPresetId={setEditingPresetId}
        setEditingPresetName={setEditingPresetName}
        handleSubmitRename={handleSubmitRename}
        handleStartRename={handleStartRename}
        onLoadPreset={props.onLoadPreset}
        formatPresetDate={formatPresetDate}
        isPresetDirty={props.isPresetDirty}
        onTransitionToPreset={props.onTransitionToPreset}
        onAddPresetToSequence={props.onAddPresetToSequence}
        onDuplicatePreset={props.onDuplicatePreset}
        onDeletePreset={props.onDeletePreset}
        updatePositionArray={updatePositionArray}
        updateLayerArray={updateLayerArray}
        updateLayer1Array={updateLayer1Array}
        updateMotionArray={updateMotionArray}
        audioSourceMode={props.audioSourceMode}
        onAudioSourceModeChange={props.onAudioSourceModeChange}
        isAudioActive={props.isAudioActive}
        stopAudio={props.stopAudio}
        startAudio={props.startAudio}
        audioActionLabel={audioActionLabel}
        audioNotice={props.audioNotice}
        onDismissAudioNotice={props.onDismissAudioNotice}
      />

      <ControlPanelFooter
        config={config}
        isPublicLibrary={isPublicLibrary}
        onSave={props.onSave}
        updateConfig={updateConfig}
      />
    </div>
  );
};
