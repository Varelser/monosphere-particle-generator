import React from 'react';
import { GlobalDisplaySection } from './controlPanelGlobalDisplay';
import { GlobalExportSection } from './controlPanelGlobalExport';
import { GlobalPresetsSection } from './controlPanelGlobalPresets';
import { GlobalSequenceSection } from './controlPanelGlobalSequence';
import { ControlPanelContentProps } from './controlPanelTabsShared';

export const GlobalTabContent: React.FC<ControlPanelContentProps> = (props) => (
  <>
    <GlobalPresetsSection {...props} />
    <GlobalSequenceSection {...props} />
    <GlobalExportSection {...props} />
    <GlobalDisplaySection {...props} />
  </>
);
