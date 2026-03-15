import React from 'react';
import { Mic, X } from 'lucide-react';
import type { AudioSourceMode, SynthScale, SynthWaveform } from '../types';
import { Slider, SynthPatternEditor, Toggle } from './controlPanelParts';
import { ControlPanelContentProps } from './controlPanelTabsShared';

export const AmbientTabContent: React.FC<ControlPanelContentProps> = ({ config, lockedPanelClass, updateConfig }) => (
  <div className={lockedPanelClass}>
    <div className="mb-6">
      <Toggle label="Ambient Dust" value={config.ambientEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('ambientEnabled', v)} />
    </div>
    {config.ambientEnabled && (
      <>
        <Slider label="Particle Count" value={config.ambientCount} min={0} max={100000} step={100} onChange={(v) => updateConfig('ambientCount', v)} />
        <Slider label="Spread / Range" value={config.ambientSpread} min={100} max={5000} step={10} onChange={(v) => updateConfig('ambientSpread', v)} />
        <Slider label="Drift Speed" value={config.ambientSpeed} min={0} max={2.0} step={0.001} onChange={(v) => updateConfig('ambientSpeed', v)} />
        <Slider label="Particle Size" value={config.ambientBaseSize} min={0.1} max={50} step={0.1} onChange={(v) => updateConfig('ambientBaseSize', v)} />
      </>
    )}
  </div>
);

export const AudioTabContent: React.FC<ControlPanelContentProps> = ({
  audioActionLabel,
  audioNotice,
  audioSourceMode,
  config,
  isAudioActive,
  onAudioSourceModeChange,
  onDismissAudioNotice,
  startAudio,
  stopAudio,
  updateConfig,
}) => (
  <div>
    <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
      <Mic size={12} /> Audio Analysis
    </h3>
    <Toggle
      label="Audio Source"
      value={audioSourceMode}
      options={[
        { label: 'Microphone', val: 'microphone' },
        { label: 'Shared Tab / System', val: 'shared-audio' },
        { label: 'Built-in Synth', val: 'internal-synth' },
      ]}
      onChange={(value) => onAudioSourceModeChange(value as AudioSourceMode)}
    />
    <div className="mb-4">
      <button
        onClick={isAudioActive ? stopAudio : startAudio}
        className={`w-full py-3 rounded border font-bold uppercase tracking-wider transition-all ${
          isAudioActive ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-white/5 border-white/20 hover:bg-white/10'
        }`}
      >
        {audioActionLabel}
      </button>
    </div>
    {audioNotice && (
      <div className={`mb-4 flex items-start justify-between gap-3 rounded border px-3 py-2 text-[10px] uppercase tracking-widest ${
        audioNotice.tone === 'error'
          ? 'border-red-400/30 bg-red-500/10 text-red-100/90'
          : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90'
      }`}>
        <span>{audioNotice.message}</span>
        <button onClick={onDismissAudioNotice} className="opacity-60 hover:opacity-100">
          <X size={12} />
        </button>
      </div>
    )}
    {audioSourceMode === 'shared-audio' && (
      <div className="mb-4 rounded border border-cyan-400/20 bg-cyan-500/10 px-3 py-3 text-[10px] uppercase tracking-widest text-cyan-100/80">
        <div className="mb-2 font-bold text-cyan-50">YouTube Live / Shared Audio</div>
        <div className="mb-1">1. Press Start Shared Audio.</div>
        <div className="mb-1">2. Pick the tab, app window, or screen where your synth is playing.</div>
        <div className="mb-1">3. Enable audio sharing in the browser picker.</div>
        <div>4. Keep that share active while recording or streaming.</div>
      </div>
    )}
    {audioSourceMode === 'internal-synth' && (
      <>
        <Toggle
          label="Synth Wave"
          value={config.synthWaveform}
          options={[
            { label: 'Sine', val: 'sine' },
            { label: 'Tri', val: 'triangle' },
            { label: 'Saw', val: 'sawtooth' },
            { label: 'Square', val: 'square' },
          ]}
          onChange={(value) => updateConfig('synthWaveform', value as SynthWaveform)}
        />
        <Toggle
          label="Synth Scale"
          value={config.synthScale}
          options={[
            { label: 'Min Pent', val: 'minor-pentatonic' },
            { label: 'Minor', val: 'natural-minor' },
            { label: 'Dorian', val: 'dorian' },
            { label: 'Phryg', val: 'phrygian' },
            { label: 'Major', val: 'major' },
          ]}
          onChange={(value) => updateConfig('synthScale', value as SynthScale)}
        />
        <Slider label="Synth Base Hz" value={config.synthBaseFrequency} min={40} max={440} step={1} onChange={(v) => updateConfig('synthBaseFrequency', v)} />
        <Slider label="Synth Tempo" value={config.synthTempo} min={60} max={180} step={1} onChange={(v) => updateConfig('synthTempo', v)} />
        <Slider label="Synth Volume" value={config.synthVolume} min={0.01} max={0.4} step={0.01} onChange={(v) => updateConfig('synthVolume', v)} />
        <Slider label="Synth Cutoff" value={config.synthCutoff} min={120} max={6000} step={10} onChange={(v) => updateConfig('synthCutoff', v)} />
        <Slider label="Pattern Depth" value={config.synthPatternDepth} min={0} max={1} step={0.01} onChange={(v) => updateConfig('synthPatternDepth', v)} />
        <SynthPatternEditor pattern={config.synthPattern} onChange={(nextPattern) => updateConfig('synthPattern', nextPattern)} />
        <div className="mb-4 rounded border border-white/10 bg-black/10 px-3 py-2 text-[10px] uppercase tracking-widest text-white/55">
          Use this only when you want the browser to generate its own reference synth.
        </div>
      </>
    )}
    <Slider label={audioSourceMode === 'microphone' ? 'Mic Sensitivity' : 'Analysis Sensitivity'} value={config.audioSensitivity} min={0.1} max={5} step={0.1} onChange={(v) => updateConfig('audioSensitivity', v)} />
    <Slider label="Bass -> Amplitude/Size" value={config.audioBeatScale} min={0} max={2} step={0.1} onChange={(v) => updateConfig('audioBeatScale', v)} />
    <Slider label="Treble -> Noise/Speed" value={config.audioJitterScale} min={0} max={2} step={0.1} onChange={(v) => updateConfig('audioJitterScale', v)} />
  </div>
);
