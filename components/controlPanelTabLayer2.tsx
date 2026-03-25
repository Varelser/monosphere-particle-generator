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

export const Layer2TabContent: React.FC<ControlPanelContentProps> = ({ config, lockedPanelClass, updateConfig, updateLayerArray, updateMotionArray, updatePositionArray }) => {
  const layerLoad = getLayerPerformanceSummary(config, 2);

  return (
  <div className={lockedPanelClass}>
    <div className="mb-6">
      <Toggle label="Enable Layer 2" value={config.layer2Enabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2Enabled', v)} />
    </div>
    {config.layer2Enabled && (
      <>
        <SourceSelector value={config.layer2Source} onChange={(v) => updateConfig('layer2Source', v)} />
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Copy size={12} /> Multi-Emitter Settings
          </h3>
          <Slider label="Source Count" value={config.layer2SourceCount} min={1} max={50} step={1} onChange={(v) => updateConfig('layer2SourceCount', v)} />
          <Slider label="Source Spread" value={config.layer2SourceSpread} min={0} max={20000} step={10} onChange={(v) => updateConfig('layer2SourceSpread', v)} />
          {config.layer2SourceCount > 1 && (
            <SourcePositionConfig
              count={config.layer2SourceCount}
              positions={config.layer2SourcePositions}
              onChange={(idx, axis, val) => updatePositionArray('layer2SourcePositions', idx, axis, val)}
              currentTheme={config.backgroundColor}
            />
          )}
          {config.layer2SourceCount > 1 && (
            <LayerAttributeSettings
              count={config.layer2SourceCount}
              counts={config.layer2Counts}
              sizes={config.layer2Sizes}
              radiusScales={config.layer2RadiusScales}
              speeds={config.layer2FlowSpeeds}
              amps={config.layer2FlowAmps}
              freqs={config.layer2FlowFreqs}
              updateCount={(idx, v) => updateLayerArray('layer2Counts', idx, v, 'layer2Count', config.layer2SourceCount)}
              updateSize={(idx, v) => updateLayerArray('layer2Sizes', idx, v, 'layer2Count', config.layer2SourceCount)}
              updateRadius={(idx, v) => updateLayerArray('layer2RadiusScales', idx, v, 'layer2Count', config.layer2SourceCount)}
              updateSpeed={(idx, v) => updateLayerArray('layer2FlowSpeeds', idx, v, 'layer2Count', config.layer2SourceCount)}
              updateAmp={(idx, v) => updateLayerArray('layer2FlowAmps', idx, v, 'layer2Count', config.layer2SourceCount)}
              updateFreq={(idx, v) => updateLayerArray('layer2FlowFreqs', idx, v, 'layer2Count', config.layer2SourceCount)}
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
            onClick={() => updateConfig('layer2MotionMix', !config.layer2MotionMix)}
            className={`w-10 h-5 rounded-full relative transition-colors ${config.layer2MotionMix ? 'bg-white' : 'bg-white/20'}`}
            disabled={config.layer2SourceCount <= 1}
            title={config.layer2SourceCount <= 1 ? 'Requires multiple sources' : ''}
          >
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-all ${config.layer2MotionMix ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {config.layer2MotionMix ? (
          <PerSourceMotionConfig count={config.layer2SourceCount} motions={config.layer2Motions} onChange={(idx, val) => updateMotionArray('layer2Motions', idx, val)} currentTheme={config.backgroundColor} />
        ) : (
          <MotionSelector value={config.layer2Type} onChange={(v) => updateConfig('layer2Type', v)} />
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
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">L2: Dynamics</h3>
          <Slider label="Speed / Velocity" value={config.layer2FlowSpeed} min={0} max={10.0} step={0.001} onChange={(v) => updateConfig('layer2FlowSpeed', v)} />
          <Slider label="Amplitude / Force" value={config.layer2FlowAmplitude} min={0} max={10000} step={1} onChange={(v) => updateConfig('layer2FlowAmplitude', v)} />
          <Slider label="Frequency / Density" value={config.layer2FlowFrequency} min={0} max={200} step={0.1} onChange={(v) => updateConfig('layer2FlowFrequency', v)} />
          <Slider label="Complexity / Noise" value={config.layer2Complexity} min={0} max={50} step={0.1} onChange={(v) => updateConfig('layer2Complexity', v)} />
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Gauge size={12} /> L2: Forces
          </h3>
          <Slider label="Gravity (Y-Axis)" value={config.layer2Gravity} min={-200} max={200} step={0.1} onChange={(v) => updateConfig('layer2Gravity', v)} />
          <Slider label="Air Resistance" value={config.layer2Resistance} min={0} max={0.99} step={0.01} onChange={(v) => updateConfig('layer2Resistance', v)} />
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="col-span-3 text-[10px] uppercase tracking-widest font-medium opacity-70">Wind / Bias</div>
            <Slider label="X" value={config.layer2WindX} min={-200} max={200} step={1} onChange={(v) => updateConfig('layer2WindX', v)} />
            <Slider label="Y" value={config.layer2WindY} min={-200} max={200} step={1} onChange={(v) => updateConfig('layer2WindY', v)} />
            <Slider label="Z" value={config.layer2WindZ} min={-200} max={200} step={1} onChange={(v) => updateConfig('layer2WindZ', v)} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="col-span-3 text-[10px] uppercase tracking-widest font-medium opacity-70">Layer Spin</div>
            <Slider label="X" value={config.layer2SpinX} min={-5.0} max={5.0} step={0.001} onChange={(v) => updateConfig('layer2SpinX', v)} />
            <Slider label="Y" value={config.layer2SpinY} min={-5.0} max={5.0} step={0.001} onChange={(v) => updateConfig('layer2SpinY', v)} />
            <Slider label="Z" value={config.layer2SpinZ} min={-5.0} max={5.0} step={0.001} onChange={(v) => updateConfig('layer2SpinZ', v)} />
          </div>
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sliders size={12} /> L2: Simulation Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Slider label="Affect Position" value={config.layer2AffectPos} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2AffectPos', v)} />
            <Slider label="Noise Scale" value={config.layer2NoiseScale} min={0.1} max={50} step={0.1} onChange={(v) => updateConfig('layer2NoiseScale', v)} />
            <Slider label="Evolution Spd" value={config.layer2Evolution} min={0} max={10} step={0.01} onChange={(v) => updateConfig('layer2Evolution', v)} />
            <Slider label="Move w/ Wind" value={config.layer2MoveWithWind} min={0} max={10} step={0.01} onChange={(v) => updateConfig('layer2MoveWithWind', v)} />
            <Slider label="Fluid Force" value={config.layer2FluidForce} min={0} max={50} step={0.1} onChange={(v) => updateConfig('layer2FluidForce', v)} />
            <Slider label="Viscosity" value={config.layer2Viscosity} min={0.01} max={0.9} step={0.01} onChange={(v) => updateConfig('layer2Viscosity', v)} />
            <Slider label="Octave Mult" value={config.layer2OctaveMult} min={1} max={10} step={0.1} onChange={(v) => updateConfig('layer2OctaveMult', v)} />
            <Slider label="Fidelity (Iter)" value={config.layer2Fidelity} min={1} max={10} step={1} onChange={(v) => updateConfig('layer2Fidelity', v)} />
          </div>
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <GitCommit size={12} /> L2: Interactions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Slider label="Neighbor Bias (Repel <-> Cohere)" value={config.layer2InteractionNeighbor} min={-5} max={5} step={0.01} onChange={(v) => updateConfig('layer2InteractionNeighbor', v)} />
            </div>
            <Slider label="Mouse Force" value={config.layer2MouseForce} min={-500} max={500} step={1} onChange={(v) => updateConfig('layer2MouseForce', v)} />
            <Slider label="Mouse Radius" value={config.layer2MouseRadius} min={0} max={2000} step={10} onChange={(v) => updateConfig('layer2MouseRadius', v)} />
          </div>
          <div className="mt-4 border-t border-white/5 pt-2">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/60 mb-2">
              <Network size={12} /> Nearby Connections / Plexus
            </div>
            <Toggle label="Draw Lines" value={config.layer2ConnectionEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2ConnectionEnabled', v)} />
            {config.layer2ConnectionEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <Slider label="Max Distance" value={config.layer2ConnectionDistance} min={10} max={1000} step={1} onChange={(v) => updateConfig('layer2ConnectionDistance', v)} />
                <Slider label="Opacity" value={config.layer2ConnectionOpacity} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2ConnectionOpacity', v)} />
                <Slider label="Line Velocity Glow" value={config.layer2LineVelocityGlow} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2LineVelocityGlow', v)} />
                <Slider label="Line Velocity Alpha" value={config.layer2LineVelocityAlpha} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2LineVelocityAlpha', v)} />
                <Slider label="Line Burst Pulse" value={config.layer2LineBurstPulse} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2LineBurstPulse', v)} />
                <Slider label="Line Shimmer" value={config.layer2LineShimmer} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2LineShimmer', v)} />
                <Slider label="Shimmer Speed" value={config.layer2LineFlickerSpeed} min={0.05} max={8} step={0.01} onChange={(v) => updateConfig('layer2LineFlickerSpeed', v)} />
              </div>
            )}
          </div>
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Minimize2 size={12} /> L2: Physics & Collision
          </h3>
          <Toggle label="Collision Mode" value={config.layer2CollisionMode || 'none'} options={[{ label: 'Off', val: 'none' }, { label: 'Cell Repulsion', val: 'world' }]} onChange={(v) => updateConfig('layer2CollisionMode', v)} />
          {config.layer2CollisionMode !== 'none' && (
            <>
              <Slider label="Cell Radius" value={config.layer2CollisionRadius || 20} min={1} max={500} step={1} onChange={(v) => updateConfig('layer2CollisionRadius', v)} />
              <Slider label="Cell Push Force" value={config.layer2Repulsion || 10} min={0} max={500} step={1} onChange={(v) => updateConfig('layer2Repulsion', v)} />
            </>
          )}
          <Toggle label="Floor Boundary" value={config.layer2BoundaryEnabled || false} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2BoundaryEnabled', v)} />
          {config.layer2BoundaryEnabled && (
            <>
              <Slider label="Floor Level Y" value={config.layer2BoundaryY || 300} min={-2000} max={2000} step={10} onChange={(v) => updateConfig('layer2BoundaryY', v)} />
              <Slider label="Bounce Factor" value={config.layer2BoundaryBounce || 0.5} min={0} max={2.0} step={0.1} onChange={(v) => updateConfig('layer2BoundaryBounce', v)} />
            </>
          )}
        </div>
        <div className="border-b border-white/10 pb-4 mb-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">L2: Structure</h3>
          <div className="mb-4">
            <div className="mb-2 text-[10px] uppercase tracking-widest font-medium opacity-70">Particle Color</div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.layer2Color}
                onChange={(e) => updateConfig('layer2Color', e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-white/20 bg-transparent p-0.5"
              />
              <span className="font-mono text-[10px] opacity-60">{config.layer2Color.toUpperCase()}</span>
              <button onClick={() => updateConfig('layer2Color', '#ffffff')} className="ml-auto rounded border border-white/15 bg-white/5 px-2 py-1 text-[9px] uppercase hover:bg-white/10">Reset</button>
            </div>
          </div>
          <Slider label="Particle Count" value={config.layer2Count} min={0} max={2000000} step={1000} onChange={(v) => updateConfig('layer2Count', v)} />
          <Slider label="Radius Scale" value={config.layer2RadiusScale} min={0.1} max={100.0} step={0.01} onChange={(v) => updateConfig('layer2RadiusScale', v)} />
          <Slider label="Particle Size" value={config.layer2BaseSize} min={0.1} max={100} step={0.1} onChange={(v) => updateConfig('layer2BaseSize', v)} />
          <Slider label="Trail Strength" value={config.layer2Trail} min={0} max={0.99} step={0.01} onChange={(v) => updateConfig('layer2Trail', v)} />
          <Slider label="Life Frames" value={config.layer2Life} min={4} max={240} step={1} onChange={(v) => updateConfig('layer2Life', v)} />
          <Slider label="Life Spread" value={config.layer2LifeSpread} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2LifeSpread', v)} />
          <Slider label="Life Size Boost" value={config.layer2LifeSizeBoost} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2LifeSizeBoost', v)} />
          <Slider label="Life Size Taper" value={config.layer2LifeSizeTaper} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2LifeSizeTaper', v)} />
          <Slider label="Burst Push" value={config.layer2Burst} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2Burst', v)} />
          <Slider label="Burst Phase" value={config.layer2BurstPhase} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2BurstPhase', v)} />
          <Toggle
            label="Burst Direction"
            value={config.layer2BurstMode}
            options={[
              { label: 'Radial', val: 'radial' },
              { label: 'Cone', val: 'cone' },
              { label: 'Sweep', val: 'sweep' },
            ]}
            onChange={(v) => updateConfig('layer2BurstMode', v)}
          />
          <Toggle
            label="Burst Wave"
            value={config.layer2BurstWaveform}
            options={[
              { label: 'Single', val: 'single' },
              { label: 'Loop', val: 'loop' },
              { label: 'Stutter', val: 'stutter' },
              { label: 'Heart', val: 'heartbeat' },
            ]}
            onChange={(v) => updateConfig('layer2BurstWaveform', v)}
          />
          <Slider label="Sweep Speed" value={config.layer2BurstSweepSpeed} min={0.05} max={6} step={0.01} onChange={(v) => updateConfig('layer2BurstSweepSpeed', v)} />
          <Slider label="Sweep Tilt" value={config.layer2BurstSweepTilt} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2BurstSweepTilt', v)} />
          <Slider label="Cone Width" value={config.layer2BurstConeWidth} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2BurstConeWidth', v)} />
          <Slider label="Emitter Orbit Spd" value={config.layer2EmitterOrbitSpeed} min={0} max={6} step={0.01} onChange={(v) => updateConfig('layer2EmitterOrbitSpeed', v)} />
          <Slider label="Emitter Orbit Rad" value={config.layer2EmitterOrbitRadius} min={0} max={400} step={1} onChange={(v) => updateConfig('layer2EmitterOrbitRadius', v)} />
          <Slider label="Emitter Pulse" value={config.layer2EmitterPulseAmount} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer2EmitterPulseAmount', v)} />
          <Slider label="Trail Drag" value={config.layer2TrailDrag} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer2TrailDrag', v)} />
          <Slider label="Trail Turbulence" value={config.layer2TrailTurbulence} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer2TrailTurbulence', v)} />
          <Slider label="Trail Drift" value={config.layer2TrailDrift} min={0} max={1.5} step={0.01} onChange={(v) => updateConfig('layer2TrailDrift', v)} />
          <Slider label="Velocity Glow" value={config.layer2VelocityGlow} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2VelocityGlow', v)} />
          <Slider label="Velocity Alpha" value={config.layer2VelocityAlpha} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2VelocityAlpha', v)} />
          <Slider label="Particle Flicker" value={config.layer2FlickerAmount} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2FlickerAmount', v)} />
          <Slider label="Flicker Speed" value={config.layer2FlickerSpeed} min={0.05} max={8} step={0.01} onChange={(v) => updateConfig('layer2FlickerSpeed', v)} />
          <Slider label="Velocity Stretch" value={config.layer2Streak} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2Streak', v)} />
          <Toggle
            label="Sprite Shape"
            value={config.layer2SpriteMode}
            options={[
              { label: 'Soft', val: 'soft' },
              { label: 'Ring', val: 'ring' },
              { label: 'Spark', val: 'spark' },
            ]}
            onChange={(v) => updateConfig('layer2SpriteMode', v)}
          />
        </div>
        <div className="pt-2">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Share2 size={12} /> Aux Emitter System
          </h3>
          <Toggle label="Emit from Parents" value={config.layer2AuxEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2AuxEnabled', v)} />
          {config.layer2AuxEnabled && (
            <>
              <Slider label="Emitted Particles" value={config.layer2AuxCount} min={100} max={1000000} step={100} onChange={(v) => updateConfig('layer2AuxCount', v)} />
              <Slider label="Life / Trail Length" value={config.layer2AuxLife} min={1} max={500} step={1} onChange={(v) => updateConfig('layer2AuxLife', v)} />
              <Slider label="Diffusion / Spread" value={config.layer2AuxDiffusion} min={0} max={200} step={0.1} onChange={(v) => updateConfig('layer2AuxDiffusion', v)} />
            </>
          )}
        </div>
        <div className="pt-4">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Share2 size={12} /> Burst Sparks
          </h3>
          <Toggle label="Emit Spark Bursts" value={config.layer2SparkEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2SparkEnabled', v)} />
          {config.layer2SparkEnabled && (
            <>
              <Slider label="Spark Count" value={config.layer2SparkCount} min={100} max={300000} step={100} onChange={(v) => updateConfig('layer2SparkCount', v)} />
              <Slider label="Spark Life" value={config.layer2SparkLife} min={4} max={120} step={1} onChange={(v) => updateConfig('layer2SparkLife', v)} />
              <Slider label="Spark Diffusion" value={config.layer2SparkDiffusion} min={0} max={20} step={0.1} onChange={(v) => updateConfig('layer2SparkDiffusion', v)} />
              <Slider label="Spark Burst Boost" value={config.layer2SparkBurst} min={0} max={2} step={0.01} onChange={(v) => updateConfig('layer2SparkBurst', v)} />
            </>
          )}
        </div>
        <div className="pt-4 border-t border-white/10">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">L2: Ghost Trail</h3>
          <Toggle label="Ghost Trail" value={config.layer2GhostTrailEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2GhostTrailEnabled', v)} />
          {config.layer2GhostTrailEnabled && (
            <>
              <Slider label="Ghost Count" value={config.layer2GhostTrailCount} min={1} max={8} step={1} onChange={(v) => updateConfig('layer2GhostTrailCount', Math.round(v))} />
              <Slider label="Time Step (s)" value={config.layer2GhostTrailDt} min={0.01} max={0.5} step={0.01} onChange={(v) => updateConfig('layer2GhostTrailDt', v)} />
              <Slider label="Fade" value={config.layer2GhostTrailFade} min={0.1} max={0.95} step={0.01} onChange={(v) => updateConfig('layer2GhostTrailFade', v)} />
            </>
          )}
        </div>
        <div className="pt-4 border-t border-white/10">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">L2: SDF Shape</h3>
          <Toggle label="SDF Shape Mode" value={config.layer2SdfEnabled} options={[{ label: 'On', val: true }, { label: 'Off', val: false }]} onChange={(v) => updateConfig('layer2SdfEnabled', v)} />
          {config.layer2SdfEnabled && (
            <>
              <Toggle label="Shape" value={config.layer2SdfShape} options={[{ label: 'Sphere', val: 'sphere' }, { label: 'Ring', val: 'ring' }, { label: 'Star', val: 'star' }, { label: 'Hex', val: 'hexagon' }]} onChange={(v) => updateConfig('layer2SdfShape', v)} />
              <Slider label="Specular" value={config.layer2SdfSpecular} min={0} max={3} step={0.05} onChange={(v) => updateConfig('layer2SdfSpecular', v)} />
              <Slider label="Shininess" value={config.layer2SdfShininess} min={1} max={64} step={1} onChange={(v) => updateConfig('layer2SdfShininess', v)} />
              <Slider label="Ambient" value={config.layer2SdfAmbient} min={0} max={1} step={0.01} onChange={(v) => updateConfig('layer2SdfAmbient', v)} />
              <Slider label="Light X" value={config.layer2SdfLightX} min={-1} max={1} step={0.01} onChange={(v) => updateConfig('layer2SdfLightX', v)} />
              <Slider label="Light Y" value={config.layer2SdfLightY} min={-1} max={1} step={0.01} onChange={(v) => updateConfig('layer2SdfLightY', v)} />
            </>
          )}
        </div>
      </>
    )}
  </div>
  );
};
