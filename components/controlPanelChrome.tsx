import React from 'react';
import {
  Download,
  Globe,
  Haze,
  Layers,
  LucideIcon,
  Music,
  Pause,
  Play,
  RefreshCw,
  Settings2,
  Shuffle,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import type { ParticleConfig } from '../types';
import { ControlPanelTab } from './controlPanelParts';

export const CONTROL_PANEL_TABS: { id: ControlPanelTab; icon: LucideIcon; label: string }[] = [
  { id: 'global', icon: Globe, label: 'Main' },
  { id: 'layer1', icon: Layers, label: 'L1' },
  { id: 'layer2', icon: Zap, label: 'L2' },
  { id: 'layer3', icon: Sparkles, label: 'L3' },
  { id: 'ambient', icon: Haze, label: 'Amb' },
  { id: 'audio', icon: Music, label: 'FX' },
];

export const ControlPanelTrigger: React.FC<{
  backgroundColor: ParticleConfig['backgroundColor'];
  onOpen: () => void;
}> = ({ backgroundColor, onOpen }) => {
  const triggerButtonClass = `absolute top-6 right-6 z-50 p-3 backdrop-blur-md border rounded-full transition-all shadow-lg hover:scale-105 ${
    backgroundColor === 'white'
      ? 'bg-black/5 border-black/10 text-black hover:bg-black/10'
      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
  }`;

  return (
    <button onClick={onOpen} className={triggerButtonClass}>
      <Settings2 size={20} />
    </button>
  );
};

export const ControlPanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex justify-between items-center p-6 pb-2">
    <h2 className="text-lg font-light tracking-[0.2em]">KALOKAGATHIA</h2>
    <button
      onClick={onClose}
      className="opacity-50 hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-full"
    >
      <X size={24} />
    </button>
  </div>
);

export const ControlPanelActions: React.FC<{
  isPlaying: boolean;
  isPublicLibrary: boolean;
  onRandomize: () => void;
  onReset: () => void;
  togglePlay: () => void;
}> = ({ isPlaying, isPublicLibrary, onRandomize, onReset, togglePlay }) => (
  <div className="px-6 py-4 grid grid-cols-4 gap-2">
    <button
      onClick={togglePlay}
      className={`col-span-2 flex items-center justify-center gap-2 py-2 font-semibold rounded transition-colors ${
        isPlaying
          ? 'bg-white text-black hover:bg-gray-200'
          : 'bg-red-500/80 text-white hover:bg-red-500'
      }`}
    >
      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      <span className="text-xs uppercase">{isPlaying ? 'Pause' : 'Play'}</span>
    </button>
    <button onClick={onRandomize} disabled={isPublicLibrary} className="col-span-1 flex items-center justify-center p-2 border border-white/20 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title={isPublicLibrary ? 'Locked in public build' : 'Randomize'}>
      <Shuffle size={18} />
    </button>
    <button onClick={onReset} disabled={isPublicLibrary} className="col-span-1 flex items-center justify-center p-2 border border-white/20 rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed" title={isPublicLibrary ? 'Locked in public build' : 'Reset'}>
      <RefreshCw size={18} />
    </button>
  </div>
);

export const ControlPanelTabBar: React.FC<{
  activeTab: ControlPanelTab;
  onSelectTab: (tab: ControlPanelTab) => void;
}> = ({ activeTab, onSelectTab }) => (
  <div className="flex border-b border-white/10 px-6 gap-2">
    {CONTROL_PANEL_TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onSelectTab(tab.id)}
        className={`flex flex-1 justify-center items-center gap-1.5 pb-3 text-[10px] uppercase tracking-wider border-b-2 transition-colors ${
          activeTab === tab.id
            ? 'border-white text-white'
            : 'border-transparent text-white/40 hover:text-white/70'
        }`}
      >
        <tab.icon size={14} />
        {tab.label}
      </button>
    ))}
  </div>
);

export const ControlPanelFooter: React.FC<{
  config: ParticleConfig;
  isPublicLibrary: boolean;
  onSave: () => void;
  updateConfig: <K extends keyof ParticleConfig>(key: K, value: ParticleConfig[K]) => void;
}> = ({ config, isPublicLibrary, onSave, updateConfig }) => (
  <div className="p-6 border-t border-white/10 bg-black/20">
    <button
      onClick={onSave}
      className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black font-bold uppercase tracking-wider rounded hover:bg-gray-200 transition-colors"
    >
      <Download size={16} /> Save Image (High-Res)
    </button>
    <div className="mt-4 flex justify-between items-center text-[9px] uppercase tracking-widest opacity-40">
      <span>Transparent BG</span>
      <button
        onClick={() => updateConfig('exportTransparent', !config.exportTransparent)}
        disabled={isPublicLibrary}
        className={`w-8 h-4 rounded-full relative transition-colors ${config.exportTransparent ? 'bg-white' : 'bg-white/20'} disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${config.exportTransparent ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
    <div className="mt-4 flex justify-between text-[9px] uppercase tracking-widest opacity-40">
      <span>Resolution</span>
      <div className="flex gap-2 font-mono">
        <button disabled={isPublicLibrary} onClick={() => updateConfig('exportScale', 1)} className={`${config.exportScale === 1 ? 'text-white underline' : ''} disabled:opacity-30 disabled:no-underline`}>1x</button>
        <button disabled={isPublicLibrary} onClick={() => updateConfig('exportScale', 2)} className={`${config.exportScale === 2 ? 'text-white underline' : ''} disabled:opacity-30 disabled:no-underline`}>2x</button>
        <button disabled={isPublicLibrary} onClick={() => updateConfig('exportScale', 4)} className={`${config.exportScale === 4 ? 'text-white underline' : ''} disabled:opacity-30 disabled:no-underline`}>4x</button>
        <button disabled={isPublicLibrary} onClick={() => updateConfig('exportScale', 8)} className={`${config.exportScale === 8 ? 'text-white underline' : ''} disabled:opacity-30 disabled:no-underline`}>8x</button>
      </div>
    </div>
  </div>
);
