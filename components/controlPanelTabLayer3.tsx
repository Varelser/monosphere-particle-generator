import React from 'react';
import { Copy, Gauge, GitCommit, Minimize2, Network, Share2, Shuffle, Sliders } from 'lucide-react';
import { getLayerPerformanceSummary } from '../lib/performanceHints';
import {
  LayerAttributeSettings,
  MotionSelector,
  PerSourceMotionConfig,
  Slider,
  SourcePositionConfig,
  SourceSelector,
  Toggle,
} from './controlPanelParts';
import { ControlPanelContentProps } from './controlPanelTabsShared';

export const Layer3TabContent: React.FC<ControlPanelContentProps> = ({ config, lockedPanelClass, updateConfig, updateLayerArray, updateMotionArray, updatePositionArray }) => {
  const layerLoad = getLayerPerformanceSummary(config, 3);

  return (
  <div className={lockedPanelClass}>
    <div className="mb-6">
      <Toggle label="Enable Layer 3" value={config.layer3Enabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer3Enabled', v)} />
    </div>
    {config.layer3Enabled && (
      <>
        <SourceSelector value={config.layer3Source} onChange={(v) => updateConfig('layer3Source', v)} />
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Copy size={12} /> Multi-Emitter Settings
          </h3>
          <Slider label="Source Count" value={config.layer3SourceCount} min={1} max={50} step={1} onChange={(v) => updateConfig('layer3SourceCount', v)} />
          <Slider label="Source Spread" value={config.layer3SourceSpread} min={0} max={20000} step={10} onChange={(v) => updateConfig('layer3SourceSpread', v)} />
          {config.layer3SourceCount > 1 && (
            <SourcePositionConfig
              count={config.layer3SourceCount}
              positions={config.layer3SourcePositions}
              onChange={(idx, axis, val) => updatePositionArray('layer3SourcePositions', idx, axis, val)}
              currentTheme={config.backgroundColor}
            />
          )}
          {config.layer3SourceCount > 1 && (
            <LayerAttributeSettings
              count={config.layer3SourceCount}
              counts={config.layer3Counts}
              sizes={config.layer3Sizes}
              radiusScales={config.layer3RadiusScales}
              speeds={config.layer3FlowSpeeds}
              amps={config.layer3FlowAmps}
              freqs={config.layer3FlowFreqs}
              updateCount={(idx, v) => updateLayerArray('layer3Counts', idx, v, 'layer3Count', config.layer3SourceCount)}
              updateSize={(idx, v) => updateLayerArray('layer3Sizes', idx, v, 'layer3Count', config.layer3SourceCount)}
              updateRadius={(idx, v) => updateLayerArray('layer3RadiusScales', idx, v, 'layer3Count', config.layer3SourceCount)}
              updateSpeed={(idx, v) => updateLayerArray('layer3FlowSpeeds', idx, v, 'layer3Count', config.layer3SourceCount)}
              updateAmp={(idx, v) => updateLayerArray('layer3FlowAmps', idx, v, 'layer3Count', config.layer3SourceCount)}
              updateFreq={(idx, v) => updateLayerArray('layer3FlowFreqs', idx, v, 'layer3Count', config.layer3SourceCount)}
              currentTheme={config.backgroundColor}
            />
          )}
        </div>
        <div className="mb-6 flex items-center justify-between border border-white/20 p-2 rounded bg-white/5">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/80">
            <Shuffle size={14} />
            <span>Mix Motions per Source</span>
          </div>
          <button
            onClick={() => updateConfig('layer3MotionMix', !config.layer3MotionMix)}
            className={`w-10 h-5 rounded-full relative transition-colors ${config.layer3MotionMix ? 'bg-white' : 'bg-white/20'}`}
            disabled={config.layer3SourceCount <= 1}
            title={config.layer3SourceCount <= 1 ? 'Requires multiple sources' : ''}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-all ${config.layer3MotionMix ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {config.layer3MotionMix ? (
          <PerSourceMotionConfig count={config.layer3SourceCount} motions={config.layer3Motions} onChange={(idx, val) => updateMotionArray('layer3Motions', idx, val)} currentTheme={config.backgroundColor} />
        ) : (
          <MotionSelector value={config.layer3Type} onChange={(v) => updateConfig('layer3Type', v)} />
        )}
        <div className="mb-4 rounded border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-white/70">
            <span>Layer Load</span>
            <span className="font-mono">{layerLoad.tier}</span>
          </div>
          <div className="mb-3 text-[10px] text-white/45">
            {layerLoad.suggestions[0] ?? 'Current count and simulation budget are in a comfortable range.'}
          </div>
          <Toggle
            label="Viewport Quality"
            value={config.renderQuality}
            options={[
              { label: 'Draft', val: 'draft' },
              { label: 'Balanced', val: 'balanced' },
              { label: 'Cinematic', val: 'cinematic' },
            ]}
            onChange={(v) => updateConfig('renderQuality', v)}
          />
        </div>
        <div>
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">L3: Dynamics</h3>
          <Slider label="Speed / Velocity" value={config.layer3FlowSpeed} min={0} max={10.0} step={0.001} onChange={(v) => updateConfig('layer3FlowSpeed', v)} />
          <Slider label="Amplitude / Force" value={config.layer3FlowAmplitude} min={0} max={10000} step={1} onChange={(v) => updateConfig('layer3FlowAmplitude', v)} />
          <Slider label="Frequency / Density" value={config.layer3FlowFrequency} min={0} max={200} step={0.1} onChange={(v) => updateConfig('layer3FlowFrequency', v)} />
          <Slider label="Complexity / Noise" value={config.layer3Complexity} min={0} max={50} step={0.1} onChange={(v) => updateConfig('layer3Complexity', v)} />
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Gauge size={12} /> L3: Forces
          </h3>
          <Slider label="Gravity (Y-Axis)" value={config.layer3Gravity} min={-200} max={200} step={0.1} onChange={(v) => updateConfig('layer3Gravity', v)} />
          <Slider label="Air Resistance" value={config.layer3Resistance} min={0} max={0.99} step={0.01} onChange={(v) => updateConfig('layer3Resistance', v)} />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="col-span-3 text-[10px] uppercase tracking-widest font-medium opacity-70">Wind / Bias</div>
            <Slider label="X" value={config.layer3WindX} min={-200} max={200} step={1} onChange={(v) => updateConfig('layer3WindX', v)} />
            <Slider label="Y" value={config.layer3WindY} min={-200} max={200} step={1} onChange={(v) => updateConfig('layer3WindY', v)} />
            <Slider label="Z" value={config.layer3WindZ} min={-200} max={200} step={1} onChange={(v) => updateConfig('layer3WindZ', v)} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="col-span-3 text-[10px] uppercase tracking-widest font-medium opacity-70">Layer Spin</div>
            <Slider label="X" value={config.layer3SpinX} min={-5.0} max={5.0} step={0.001} onChange={(v) => updateConfig('layer3SpinX', v)} />
            <Slider label="Y" value={config.layer3SpinY} min={-5.0} max={5.0} step={0.001} onChange={(v) => updateConfig('layer3SpinY', v)} />
            <Slider label="Z" value={config.layer3SpinZ} min={-5.0} max={5.0} step={0.001} onChange={(v) => updateConfig('layer3SpinZ', v)} />
          </div>
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sliders size={12} /> L3: Simulation Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Slider label="Affect Position" value={config.layer3AffectPos} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3AffectPos', v)} />
            <Slider label="Noise Scale" value={config.layer3NoiseScale} min={0.1} max={50} step={0.1} onChange={(v) => updateConfig('layer3NoiseScale', v)} />
            <Slider label="Evolution Spd" value={config.layer3Evolution} min={0} max={10} step={0.01} onChange={(v) => updateConfig('layer3Evolution', v)} />
            <Slider label="Move w/ Wind" value={config.layer3MoveWithWind} min={0} max={10} step={0.01} onChange={(v) => updateConfig('layer3MoveWithWind', v)} />
            <Slider label="Fluid Force" value={config.layer3FluidForce} min={0} max={50} step={0.1} onChange={(v) => updateConfig('layer3FluidForce', v)} />
            <Slider label="Viscosity" value={config.layer3Viscosity} min={0.01} max={0.9} step={0.01} onChange={(v) => updateConfig('layer3Viscosity', v)} />
            <Slider label="Octave Mult" value={config.layer3OctaveMult} min={1} max={10} step={0.1} onChange={(v) => updateConfig('layer3OctaveMult', v)} />
            <Slider label="Fidelity (Iter)" value={config.layer3Fidelity} min={1} max={10} step={1} onChange={(v) => updateConfig('layer3Fidelity', v)} />
          </div>
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <GitCommit size={12} /> L3: Interactions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Slider label="Neighbor Bias (Repel <-> Cohere)" value={config.layer3InteractionNeighbor} min={-5} max={5} step={0.01} onChange={(v) => updateConfig('layer3InteractionNeighbor', v)} />
            </div>
            <Slider label="Mouse Force" value={config.layer3MouseForce} min={-500} max={500} step={1} onChange={(v) => updateConfig('layer3MouseForce', v)} />
            <Slider label="Mouse Radius" value={config.layer3MouseRadius} min={0} max={2000} step={10} onChange={(v) => updateConfig('layer3MouseRadius', v)} />
          </div>
          <div className="mt-4 border-t border-white/5 pt-2">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/60 mb-2">
              <Network size={12} /> Nearby Connections / Plexus
            </div>
            <Toggle label="Draw Lines" value={config.layer3ConnectionEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer3ConnectionEnabled', v)} />
            {config.layer3ConnectionEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <Slider label="Max Distance" value={config.layer3ConnectionDistance} min={10} max={1000} step={1} onChange={(v) => updateConfig('layer3ConnectionDistance', v)} />
                <Slider label="Opacity" value={config.layer3ConnectionOpacity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3ConnectionOpacity', v)} />
                <Slider label="Line Velocity Glow" value={config.layer3LineVelocityGlow} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3LineVelocityGlow', v)} />
                <Slider label="Line Velocity Alpha" value={config.layer3LineVelocityAlpha} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3LineVelocityAlpha', v)} />
                <Slider label="Line Burst Pulse" value={config.layer3LineBurstPulse} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3LineBurstPulse', v)} />
                <Slider label="Line Shimmer" value={config.layer3LineShimmer} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3LineShimmer', v)} />
                <Slider label="Shimmer Speed" value={config.layer3LineFlickerSpeed} min={0.05} max={8} step={0.01} onChange={(v) => updateConfig('layer3LineFlickerSpeed', v)} />
              </div>
            )}
          </div>
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Minimize2 size={12} /> L3: Physics & Collision
          </h3>
          <Toggle label="Collision Mode" value={config.layer3CollisionMode || 'none'} options={[{ label: 'Off', val: 'none' }, { label: 'Cell Repulsion', val: 'world' }]} onChange={(v) => updateConfig('layer3CollisionMode', v)} />
          {config.layer3CollisionMode !== 'none' && (
            <>
              <Slider label="Cell Radius" value={config.layer3CollisionRadius || 20} min={1} max={500} step={1} onChange={(v) => updateConfig('layer3CollisionRadius', v)} />
              <Slider label="Cell Push Force" value={config.layer3Repulsion || 10} min={0} max={500} step={1} onChange={(v) => updateConfig('layer3Repulsion', v)} />
            </>
          )}
          <Toggle label="Floor Boundary" value={config.layer3BoundaryEnabled || false} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer3BoundaryEnabled', v)} />
          {config.layer3BoundaryEnabled && (
            <>
              <Slider label="Floor Level Y" value={config.layer3BoundaryY || 300} min={-2000} max={2000} step={10} onChange={(v) => updateConfig('layer3BoundaryY', v)} />
              <Slider label="Bounce Factor" value={config.layer3BoundaryBounce || 0.5} min={0} max={2.0} step={0.1} onChange={(v) => updateConfig('layer3BoundaryBounce', v)} />
            </>
          )}
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">L3: Structure</h3>
          <Slider label="Particle Count" value={config.layer3Count} min={0} max={2000000} step={1000} onChange={(v) => updateConfig('layer3Count', v)} />
          <Slider label="Radius Scale" value={config.layer3RadiusScale} min={0.1} max={100.0} step={0.01} onChange={(v) => updateConfig('layer3RadiusScale', v)} />
          <Slider label="Particle Size" value={config.layer3BaseSize} min={0.1} max={100} step={0.1} onChange={(v) => updateConfig('layer3BaseSize', v)} />
          <Slider label="Trail Strength" value={config.layer3Trail} min={0} max={0.99} step={0.01} onChange={(v) => updateConfig('layer3Trail', v)} />
          <Slider label="Life Frames" value={config.layer3Life} min={4} max={240} step={1} onChange={(v) => updateConfig('layer3Life', v)} />
          <Slider label="Life Spread" value={config.layer3LifeSpread} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3LifeSpread', v)} />
          <Slider label="Life Size Boost" value={config.layer3LifeSizeBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3LifeSizeBoost', v)} />
          <Slider label="Life Size Taper" value={config.layer3LifeSizeTaper} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3LifeSizeTaper', v)} />
          <Slider label="Burst Push" value={config.layer3Burst} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3Burst', v)} />
          <Slider label="Burst Phase" value={config.layer3BurstPhase} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3BurstPhase', v)} />
          <Toggle
            label="Burst Direction"
            value={config.layer3BurstMode}
            options={[
              { label: 'Radial', val: 'radial' },
              { label: 'Cone', val: 'cone' },
              { label: 'Sweep', val: 'sweep' },
            ]}
            onChange={(v) => updateConfig('layer3BurstMode', v)}
          />
          <Toggle
            label="Burst Wave"
            value={config.layer3BurstWaveform}
            options={[
              { label: 'Single', val: 'single' },
              { label: 'Loop', val: 'loop' },
              { label: 'Stutter', val: 'stutter' },
              { label: 'Heart', val: 'heartbeat' },
            ]}
            onChange={(v) => updateConfig('layer3BurstWaveform', v)}
          />
          <Slider label="Sweep Speed" value={config.layer3BurstSweepSpeed} min={0.05} max={6} step={0.01} onChange={(v) => updateConfig('layer3BurstSweepSpeed', v)} />
          <Slider label="Sweep Tilt" value={config.layer3BurstSweepTilt} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3BurstSweepTilt', v)} />
          <Slider label="Cone Width" value={config.layer3BurstConeWidth} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3BurstConeWidth', v)} />
          <Slider label="Emitter Orbit Spd" value={config.layer3EmitterOrbitSpeed} min={0} max={6} step={0.01} onChange={(v) => updateConfig('layer3EmitterOrbitSpeed', v)} />
          <Slider label="Emitter Orbit Rad" value={config.layer3EmitterOrbitRadius} min={0} max={400} step={1} onChange={(v) => updateConfig('layer3EmitterOrbitRadius', v)} />
          <Slider label="Emitter Pulse" value={config.layer3EmitterPulseAmount} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer3EmitterPulseAmount', v)} />
          <Slider label="Trail Drag" value={config.layer3TrailDrag} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer3TrailDrag', v)} />
          <Slider label="Trail Turbulence" value={config.layer3TrailTurbulence} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer3TrailTurbulence', v)} />
          <Slider label="Trail Drift" value={config.layer3TrailDrift} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer3TrailDrift', v)} />
          <Slider label="Velocity Glow" value={config.layer3VelocityGlow} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3VelocityGlow', v)} />
          <Slider label="Velocity Alpha" value={config.layer3VelocityAlpha} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3VelocityAlpha', v)} />
          <Slider label="Particle Flicker" value={config.layer3FlickerAmount} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer3FlickerAmount', v)} />
          <Slider label="Flicker Speed" value={config.layer3FlickerSpeed} min={0.05} max={8} step={0.01} onChange={(v) => updateConfig('layer3FlickerSpeed', v)} />
          <Slider label="Velocity Stretch" value={config.layer3Streak} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3Streak', v)} />
          <Toggle
            label="Sprite Shape"
            value={config.layer3SpriteMode}
            options={[
              { label: 'Soft', val: 'soft' },
              { label: 'Ring', val: 'ring' },
              { label: 'Spark', val: 'spark' },
            ]}
            onChange={(v) => updateConfig('layer3SpriteMode', v)}
          />
        </div>
        <div className="pt-2">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Share2 size={12} /> Aux Emitter System
          </h3>
          <Toggle label="Emit from Parents" value={config.layer3AuxEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer3AuxEnabled', v)} />
          {config.layer3AuxEnabled && (
            <>
              <Slider label="Emitted Particles" value={config.layer3AuxCount} min={100} max={1000000} step={100} onChange={(v) => updateConfig('layer3AuxCount', v)} />
              <Slider label="Life / Trail Length" value={config.layer3AuxLife} min={1} max={500} step={1} onChange={(v) => updateConfig('layer3AuxLife', v)} />
              <Slider label="Diffusion / Spread" value={config.layer3AuxDiffusion} min={0} max={200} step={0.1} onChange={(v) => updateConfig('layer3AuxDiffusion', v)} />
            </>
          )}
        </div>
        <div className="pt-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Share2 size={12} /> Burst Sparks
          </h3>
          <Toggle label="Emit Spark Bursts" value={config.layer3SparkEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer3SparkEnabled', v)} />
          {config.layer3SparkEnabled && (
            <>
              <Slider label="Spark Count" value={config.layer3SparkCount} min={100} max={300000} step={100} onChange={(v) => updateConfig('layer3SparkCount', v)} />
              <Slider label="Spark Life" value={config.layer3SparkLife} min={4} max={120} step={1} onChange={(v) => updateConfig('layer3SparkLife', v)} />
              <Slider label="Spark Diffusion" value={config.layer3SparkDiffusion} min={0} max={20} step={0.1} onChange={(v) => updateConfig('layer3SparkDiffusion', v)} />
              <Slider label="Spark Burst Boost" value={config.layer3SparkBurst} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer3SparkBurst', v)} />
            </>
          )}
        </div>
      </>
    )}
  </div>
  );
};
