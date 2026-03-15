import { useRef, useState } from 'react';
import { ControlPanelTab } from './controlPanelParts';

export function useControlPanelLocalState() {
  const [activeTab, setActiveTab] = useState<ControlPanelTab>('global');
  const [presetName, setPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [libraryImportMode, setLibraryImportMode] = useState<'append' | 'replace'>('append');
  const [draggingSequenceItemId, setDraggingSequenceItemId] = useState<string | null>(null);
  const [dropTargetSequenceItemId, setDropTargetSequenceItemId] = useState<string | null>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  return {
    activeTab,
    draggingSequenceItemId,
    dropTargetSequenceItemId,
    editingPresetId,
    editingPresetName,
    libraryImportMode,
    libraryInputRef,
    presetName,
    setActiveTab,
    setDraggingSequenceItemId,
    setDropTargetSequenceItemId,
    setEditingPresetId,
    setEditingPresetName,
    setLibraryImportMode,
    setPresetName,
  };
}
