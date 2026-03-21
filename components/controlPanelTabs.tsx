import React from 'react';
import { AmbientTabContent, AudioTabContent } from './controlPanelTabsAudio';
import { GlobalTabContent } from './controlPanelTabsGlobal';
import { Layer1TabContent, Layer2TabContent, Layer3TabContent } from './controlPanelTabsLayers';
import { ControlPanelContentProps } from './controlPanelTabsShared';

export const ControlPanelContent: React.FC<ControlPanelContentProps> = (props) => {
  const { activeTab, isPublicLibrary } = props;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
      {isPublicLibrary && (
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-white/60">
          Public exhibition mode: scene parameters and sequence editing are locked. You can still load, morph, play, and export.
        </div>
      )}
      <div className="mx-auto w-full max-w-4xl space-y-8">
        {activeTab === 'global' && <GlobalTabContent {...props} />}
        {activeTab === 'layer1' && <Layer1TabContent {...props} />}
        {activeTab === 'layer2' && <Layer2TabContent {...props} />}
        {activeTab === 'layer3' && <Layer3TabContent {...props} />}
        {activeTab === 'ambient' && <AmbientTabContent {...props} />}
        {activeTab === 'audio' && <AudioTabContent {...props} />}
      </div>
    </div>
  );
};
