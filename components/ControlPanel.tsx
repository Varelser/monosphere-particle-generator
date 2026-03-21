import React from 'react';
import {
  ControlPanelActions,
  ControlPanelFooter,
  ControlPanelHeader,
  ControlPanelRail,
  ControlPanelTabBar,
  ControlPanelTrigger,
} from './controlPanelChrome';
import { ControlPanelContent } from './controlPanelTabs';
import { ControlPanelProps } from './controlPanelTypes';
import { useControlPanelState } from './useControlPanelState';

export const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const [isWide, setIsWide] = React.useState(false);
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
    return (
      <ControlPanelTrigger
        activeTab={activeTab}
        backgroundColor={config.backgroundColor}
        onOpen={() => setIsOpen(true)}
        onSelectTab={setActiveTab}
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-50 flex w-full justify-end p-3 text-white sm:p-4">
      <div className={`flex h-full w-full items-stretch justify-end ${isWide ? 'max-w-[min(96vw,78rem)]' : 'max-w-[min(96vw,66rem)]'}`}>
        <ControlPanelRail
          activeTab={activeTab}
          isWide={isWide}
          onClose={() => setIsOpen(false)}
          onSelectTab={setActiveTab}
          onToggleWidth={() => setIsWide((prev) => !prev)}
        />
        <div className="pointer-events-auto flex min-w-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-black/88 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <ControlPanelHeader
            activeTab={activeTab}
            isPublicLibrary={isPublicLibrary}
            isWide={isWide}
            onClose={() => setIsOpen(false)}
            onToggleWidth={() => setIsWide((prev) => !prev)}
          />
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
      </div>
    </div>
  );
};
