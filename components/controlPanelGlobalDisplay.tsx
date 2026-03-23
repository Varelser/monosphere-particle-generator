import React from 'react';
import { Camera, Monitor, Move3d } from 'lucide-react';
import { getConfigPerformanceScore, getConfigPerformanceTier, getRenderQualityDescription } from '../lib/performanceHints';
import { SCREEN_FX_PRESETS, Slider, Toggle } from './controlPanelParts';
import { ControlPanelContentProps } from './controlPanelTabsShared';

export const GlobalDisplaySection: React.FC<ControlPanelContentProps> = ({
  applyPerformancePreset,
  applyScreenFxPreset,
  config,
  contactAmount,
  isPublicLibrary,
  updateConfig,
}) => {
  const performanceTier = getConfigPerformanceTier(config);
  const performanceScore = getConfigPerformanceScore(config);

  return (
  <>
    <div className={isPublicLibrary ? 'pointer-events-none opacity-45 select-none' : ''}>
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Monitor size={12} /> Display
      </h3>
      <div className="mb-4 rounded border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-white/70">
          <span>Render Quality</span>
          <span className="font-mono">{performanceTier}</span>
        </div>
        <Toggle
          label="Quality Profile"
          value={config.renderQuality}
          options={[
            { label: 'Draft', val: 'draft' },
            { label: 'Balanced', val: 'balanced' },
            { label: 'Cinematic', val: 'cinematic' },
          ]}
          onChange={(v) => updateConfig('renderQuality', v)}
        />
        <div className="mt-2 text-[10px] text-white/50">
          {getRenderQualityDescription(config.renderQuality)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={() => applyPerformancePreset('editing')}
            className="rounded border border-white/15 bg-white/5 px-2 py-2 text-[9px] uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Optimize Edit
          </button>
          <button
            onClick={() => applyPerformancePreset('balanced')}
            className="rounded border border-white/15 bg-white/5 px-2 py-2 text-[9px] uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Balanced
          </button>
          <button
            onClick={() => applyPerformancePreset('cinematic')}
            className="rounded border border-white/15 bg-white/5 px-2 py-2 text-[9px] uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Cinematic
          </button>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-white/45">
            <span>Scene Load</span>
            <span>{Math.round(performanceScore * 10) / 10}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-[width] duration-150 ${
                performanceTier === 'heavy' ? 'bg-red-300' : performanceTier === 'medium' ? 'bg-white/80' : 'bg-white/45'
              }`}
              style={{ width: `${Math.min(100, performanceScore * 8)}%` }}
            />
          </div>
        </div>
      </div>
      <Toggle label="Background" value={config.backgroundColor} options={[{ label: 'Black', val: 'black' }, { label: 'White', val: 'white' }]} onChange={(v) => updateConfig('backgroundColor', v)} />
      <Toggle label="Particles" value={config.particleColor} options={[{ label: 'White', val: 'white' }, { label: 'Black', val: 'black' }]} onChange={(v) => updateConfig('particleColor', v)} />
      <Slider label="Base Opacity" value={config.opacity} min={0.1} max={1} step={0.01} onChange={(v) => updateConfig('opacity', v)} />
      <Slider label="Contrast / Intensity" value={config.contrast} min={0.5} max={5.0} step={0.1} onChange={(v) => updateConfig('contrast', v)} />
      <Slider label="Edge Softness" value={config.particleSoftness} min={0} max={1} step={0.01} onChange={(v) => updateConfig('particleSoftness', v)} />
      <Slider label="Glow / Halo" value={config.particleGlow} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('particleGlow', v)} />
      <div className="mt-5 rounded border border-white/10 bg-white/5 p-3">
        <div className="mb-3 text-[10px] uppercase tracking-widest font-bold text-white/70">Inter-Layer Collision</div>
        <Toggle label="Layer Repulsion" value={config.interLayerCollisionEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('interLayerCollisionEnabled', v)} />
        {config.interLayerCollisionEnabled && (
          <>
            <div className="mb-4 rounded border border-white/10 bg-black/20 p-3" data-contact-meter={contactAmount.toFixed(3)}>
              <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-white/65">
                <span>Contact Meter</span>
                <span className="font-mono">{Math.round(contactAmount * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-white transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(100, contactAmount * 100))}%` }} />
              </div>
            </div>
            <Toggle
              label="Collider Mode"
              value={config.interLayerCollisionMode}
              options={[
                { label: 'Layer Volume', val: 'layer-volume' },
                { label: 'Per Source', val: 'source-volume' },
              ]}
              onChange={(v) => updateConfig('interLayerCollisionMode', v)}
            />
            <Slider label="Push Strength" value={config.interLayerCollisionStrength} min={0} max={200} step={1} onChange={(v) => updateConfig('interLayerCollisionStrength', v)} />
            <Slider label="Collision Padding" value={config.interLayerCollisionPadding} min={0} max={400} step={1} onChange={(v) => updateConfig('interLayerCollisionPadding', v)} />
            <Toggle label="Audio Link" value={config.interLayerAudioReactive} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('interLayerAudioReactive', v)} />
            {config.interLayerAudioReactive && (
              <Slider label="Audio Boost" value={config.interLayerAudioBoost} min={0} max={4} step={0.05} onChange={(v) => updateConfig('interLayerAudioBoost', v)} />
            )}
            <Toggle label="Impact FX" value={config.interLayerContactFxEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('interLayerContactFxEnabled', v)} />
            {config.interLayerContactFxEnabled && (
              <>
                <Slider label="Contact Glow" value={config.interLayerContactGlowBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('interLayerContactGlowBoost', v)} />
                <Slider label="Contact Size" value={config.interLayerContactSizeBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('interLayerContactSizeBoost', v)} />
                <Slider label="Contact Line Boost" value={config.interLayerContactLineBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('interLayerContactLineBoost', v)} />
                <Slider label="Contact Screen Boost" value={config.interLayerContactScreenBoost} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('interLayerContactScreenBoost', v)} />
              </>
            )}
          </>
        )}
      </div>
      <div className="mt-5 rounded border border-white/10 bg-white/5 p-3">
        <div className="mb-3 text-[10px] uppercase tracking-widest font-bold text-white/70">Particle Shape &amp; Lighting</div>
        <Toggle
          label="SDF Shape Mode"
          value={config.sdfShapeEnabled}
          options={[{ label: 'On', val: true }, { label: 'Off', val: false }]}
          onChange={(v) => updateConfig('sdfShapeEnabled', v)}
        />
        {config.sdfShapeEnabled && (
          <>
            <Toggle
              label="Shape"
              value={config.sdfShape}
              options={[
                { label: 'Sphere', val: 'sphere' },
                { label: 'Ring', val: 'ring' },
                { label: 'Star', val: 'star' },
                { label: 'Hex', val: 'hexagon' },
              ]}
              onChange={(v) => updateConfig('sdfShape', v)}
            />
            <Slider label="Specular Intensity" value={config.sdfSpecularIntensity} min={0} max={3} step={0.05} onChange={(v) => updateConfig('sdfSpecularIntensity', v)} />
            <Slider label="Shininess" value={config.sdfSpecularShininess} min={1} max={64} step={1} onChange={(v) => updateConfig('sdfSpecularShininess', v)} />
            <Slider label="Ambient Light" value={config.sdfAmbientLight} min={0} max={1} step={0.01} onChange={(v) => updateConfig('sdfAmbientLight', v)} />
            <Slider label="Light X" value={config.sdfLightX} min={-1} max={1} step={0.01} onChange={(v) => updateConfig('sdfLightX', v)} />
            <Slider label="Light Y" value={config.sdfLightY} min={-1} max={1} step={0.01} onChange={(v) => updateConfig('sdfLightY', v)} />
          </>
        )}
      </div>
      <div className="mt-5 rounded border border-white/10 bg-white/5 p-3">
        <div className="mb-3 text-[10px] uppercase tracking-widest font-bold text-white/70">Post Processing</div>
        <Toggle
          label="Bloom"
          value={config.postBloomEnabled}
          options={[{ label: 'On', val: true }, { label: 'Off', val: false }]}
          onChange={(v) => updateConfig('postBloomEnabled', v)}
        />
        {config.postBloomEnabled && (
          <>
            <Slider label="Bloom Intensity" value={config.postBloomIntensity} min={0} max={5} step={0.05} onChange={(v) => updateConfig('postBloomIntensity', v)} />
            <Slider label="Bloom Radius" value={config.postBloomRadius} min={0} max={1} step={0.01} onChange={(v) => updateConfig('postBloomRadius', v)} />
            <Slider label="Luminance Threshold" value={config.postBloomThreshold} min={0} max={1} step={0.01} onChange={(v) => updateConfig('postBloomThreshold', v)} />
          </>
        )}
        <Toggle
          label="Chromatic Aberration"
          value={config.postChromaticAberrationEnabled}
          options={[{ label: 'On', val: true }, { label: 'Off', val: false }]}
          onChange={(v) => updateConfig('postChromaticAberrationEnabled', v)}
        />
        {config.postChromaticAberrationEnabled && (
          <Slider label="CA Offset" value={config.postChromaticAberrationOffset} min={0} max={0.01} step={0.0001} onChange={(v) => updateConfig('postChromaticAberrationOffset', v)} />
        )}
      </div>
      <Toggle label="Depth Fog" value={config.depthFogEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('depthFogEnabled', v)} />
      {config.depthFogEnabled && (
        <>
          <Slider label="Fog Near" value={config.depthFogNear} min={100} max={5000} step={25} onChange={(v) => updateConfig('depthFogNear', Math.min(v, config.depthFogFar - 50))} />
          <Slider label="Fog Far" value={config.depthFogFar} min={200} max={9000} step={25} onChange={(v) => updateConfig('depthFogFar', Math.max(v, config.depthFogNear + 50))} />
        </>
      )}
      <div className="mt-5 rounded border border-white/10 bg-white/5 p-3">
        <div className="mb-3 text-[10px] uppercase tracking-widest font-bold text-white/70">Screen FX</div>
        <div className="mb-4">
          <div className="mb-2 text-[10px] uppercase tracking-widest font-medium opacity-70">FX Presets</div>
          <div className="grid grid-cols-4 gap-2">
            {SCREEN_FX_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyScreenFxPreset(preset)}
                className="py-2 text-[9px] font-bold uppercase rounded border border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <Slider label="Scanline Intensity" value={config.screenScanlineIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenScanlineIntensity', v)} />
        <Slider label="Scanline Density" value={config.screenScanlineDensity} min={120} max={1200} step={10} onChange={(v) => updateConfig('screenScanlineDensity', v)} />
        <Slider label="Film Grain" value={config.screenNoiseIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenNoiseIntensity', v)} />
        <Slider label="Vignette" value={config.screenVignetteIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenVignetteIntensity', v)} />
        <Slider label="Radial Pulse" value={config.screenPulseIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenPulseIntensity', v)} />
        <Slider label="Pulse Speed" value={config.screenPulseSpeed} min={0.1} max={4} step={0.01} onChange={(v) => updateConfig('screenPulseSpeed', v)} />
        <Slider label="Impact Flash" value={config.screenImpactFlashIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenImpactFlashIntensity', v)} />
        <Slider label="Burst Auto Drive" value={config.screenBurstDrive} min={0} max={2} step={0.01} onChange={(v) => updateConfig('screenBurstDrive', v)} />
        <Slider label="Burst Noise Boost" value={config.screenBurstNoiseBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('screenBurstNoiseBoost', v)} />
        <Slider label="Burst Flash Boost" value={config.screenBurstFlashBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('screenBurstFlashBoost', v)} />
        <Slider label="Interference Bands" value={config.screenInterferenceIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenInterferenceIntensity', v)} />
        <Slider label="Persistence" value={config.screenPersistenceIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenPersistenceIntensity', v)} />
        <Slider label="Persistence Layers" value={config.screenPersistenceLayers} min={1} max={4} step={1} onChange={(v) => updateConfig('screenPersistenceLayers', v)} />
        <Slider label="Signal Split" value={config.screenSplitIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenSplitIntensity', v)} />
        <Slider label="Split Offset" value={config.screenSplitOffset} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenSplitOffset', v)} />
        <Toggle label="Sequence Drive" value={config.screenSequenceDriveEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('screenSequenceDriveEnabled', v)} />
        {config.screenSequenceDriveEnabled && (
          <Slider label="Sequence Boost" value={config.screenSequenceDriveStrength} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenSequenceDriveStrength', v)} />
        )}
        <Slider label="Sweep Glow" value={config.screenSweepIntensity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('screenSweepIntensity', v)} />
        <Slider label="Sweep Speed" value={config.screenSweepSpeed} min={0.1} max={3} step={0.01} onChange={(v) => updateConfig('screenSweepSpeed', v)} />
      </div>
    </div>

    <div className={`${isPublicLibrary ? 'pointer-events-none opacity-45 select-none' : ''} pt-4 border-t border-white/10`}>
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Camera size={12} /> Camera & View
      </h3>
      <Toggle
        label="Camera Control"
        value={config.cameraControlMode}
        options={[
          { label: 'Auto', val: 'auto' },
          { label: 'Hybrid', val: 'hybrid' },
          { label: 'Manual', val: 'manual' },
        ]}
        onChange={(v) => updateConfig('cameraControlMode', v)}
      />
      <div className="mb-3 text-[10px] text-white/45">
        {config.cameraControlMode === 'auto'
          ? 'Auto locks OrbitControls and lets the camera rig fully choreograph motion.'
          : config.cameraControlMode === 'manual'
            ? 'Manual disables camera impulse so orbit, pan, and zoom stay fully user-driven.'
            : 'Hybrid keeps OrbitControls live and adds camera impulse only when you are not interacting.'}
      </div>
      <Toggle label="View Mode" value={config.viewMode || 'perspective'} options={[{ label: '3D (Persp)', val: 'perspective' }, { label: '2D (Ortho)', val: 'orthographic' }]} onChange={(v) => updateConfig('viewMode', v)} />
      <Slider label="Perspective (FOV) (3D Only)" value={config.perspective} min={200} max={3000} step={50} onChange={(v) => updateConfig('perspective', v)} />
      <Slider label={config.viewMode === 'orthographic' ? 'Camera Zoom (2D)' : 'Camera Distance (3D)'} value={config.cameraDistance} min={0} max={5000} step={10} onChange={(v) => updateConfig('cameraDistance', v)} />
      <Slider label="Camera Impulse" value={config.cameraImpulseStrength} min={0} max={2} step={0.01} onChange={(v) => updateConfig('cameraImpulseStrength', v)} />
      <Slider label="Impulse Speed" value={config.cameraImpulseSpeed} min={0.05} max={4} step={0.01} onChange={(v) => updateConfig('cameraImpulseSpeed', v)} />
      <Slider label="Impulse Drift" value={config.cameraImpulseDrift} min={0} max={2} step={0.01} onChange={(v) => updateConfig('cameraImpulseDrift', v)} />
      <Slider label="Burst Camera Boost" value={config.cameraBurstBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('cameraBurstBoost', v)} />
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 text-[10px] uppercase tracking-widest font-medium opacity-70 mb-1">Manual Axis Rotation</div>
        <div className="col-span-2">
          <Slider label="X Axis" value={config.manualRotationX} min={0} max={Math.PI * 2} step={0.05} onChange={(v) => updateConfig('manualRotationX', v)} />
          <Slider label="Y Axis" value={config.manualRotationY} min={0} max={Math.PI * 2} step={0.05} onChange={(v) => updateConfig('manualRotationY', v)} />
          <Slider label="Z Axis" value={config.manualRotationZ} min={0} max={Math.PI * 2} step={0.05} onChange={(v) => updateConfig('manualRotationZ', v)} />
        </div>
      </div>
    </div>

    <div className={`${isPublicLibrary ? 'pointer-events-none opacity-45 select-none' : ''} pt-4 border-t border-white/10`}>
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Move3d size={12} /> Auto Animation
      </h3>
      <Slider label="Auto Speed X" value={config.rotationSpeedX} min={-0.2} max={0.2} step={0.001} onChange={(v) => updateConfig('rotationSpeedX', v)} />
      <Slider label="Auto Speed Y" value={config.rotationSpeedY} min={-0.2} max={0.2} step={0.001} onChange={(v) => updateConfig('rotationSpeedY', v)} />
    </div>
  </>
  );
};
