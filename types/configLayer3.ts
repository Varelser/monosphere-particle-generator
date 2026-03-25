import type { Layer2Type, Layer3Source, ParticleBurstMode, ParticleBurstWaveform, ParticleSpriteMode, Position3D } from './scene';

export interface ParticleConfigLayer3 {
  layer3Enabled: boolean;
  layer3Color: string;
  layer3Source: Layer3Source;
  layer3SourceCount: number;
  layer3SourceSpread: number;
  layer3SourcePositions: Position3D[];
  layer3Type: Layer2Type;
  layer3MotionMix: boolean;
  layer3Motions: Layer2Type[];

  layer3Counts: number[];
  layer3Sizes: number[];
  layer3RadiusScales: number[];
  layer3FlowSpeeds: number[];
  layer3FlowAmps: number[];
  layer3FlowFreqs: number[];

  layer3Count: number;
  layer3BaseSize: number;
  layer3RadiusScale: number;
  layer3FlowSpeed: number;
  layer3FlowAmplitude: number;
  layer3FlowFrequency: number;
  layer3Complexity: number;
  layer3Trail: number;
  layer3Life: number;
  layer3LifeSpread: number;
  layer3LifeSizeBoost: number;
  layer3LifeSizeTaper: number;
  layer3Burst: number;
  layer3BurstPhase: number;
  layer3BurstMode: ParticleBurstMode;
  layer3BurstWaveform: ParticleBurstWaveform;
  layer3BurstSweepSpeed: number;
  layer3BurstSweepTilt: number;
  layer3BurstConeWidth: number;
  layer3EmitterOrbitSpeed: number;
  layer3EmitterOrbitRadius: number;
  layer3EmitterPulseAmount: number;
  layer3TrailDrag: number;
  layer3TrailTurbulence: number;
  layer3TrailDrift: number;
  layer3VelocityGlow: number;
  layer3VelocityAlpha: number;
  layer3FlickerAmount: number;
  layer3FlickerSpeed: number;
  layer3Streak: number;
  layer3SpriteMode: ParticleSpriteMode;

  layer3ConnectionEnabled: boolean;
  layer3ConnectionDistance: number;
  layer3ConnectionOpacity: number;
  layer3LineVelocityGlow: number;
  layer3LineVelocityAlpha: number;
  layer3LineBurstPulse: number;
  layer3LineShimmer: number;
  layer3LineFlickerSpeed: number;

  layer3Gravity: number;
  layer3Resistance: number;
  layer3SpinX: number;
  layer3SpinY: number;
  layer3SpinZ: number;
  layer3WindX: number;
  layer3WindY: number;
  layer3WindZ: number;

  layer3AffectPos: number;
  layer3NoiseScale: number;
  layer3OctaveMult: number;
  layer3Evolution: number;
  layer3MoveWithWind: number;
  layer3FluidForce: number;
  layer3Viscosity: number;
  layer3Fidelity: number;

  layer3InteractionNeighbor: number;
  layer3MouseForce: number;
  layer3MouseRadius: number;

  layer3CollisionMode: 'none' | 'world';
  layer3CollisionRadius: number;
  layer3Repulsion: number;
  layer3BoundaryEnabled: boolean;
  layer3BoundaryY: number;
  layer3BoundaryBounce: number;

  layer3AuxEnabled: boolean;
  layer3AuxCount: number;
  layer3AuxLife: number;
  layer3AuxDiffusion: number;
  layer3SparkEnabled: boolean;
  layer3SparkCount: number;
  layer3SparkLife: number;
  layer3SparkDiffusion: number;
  layer3SparkBurst: number;
  layer3GeomMode3D: 'billboard' | 'cube' | 'tetra';
  layer3GeomScale3D: number;
  // Ghost Trail (time-offset copies)
  layer3GhostTrailEnabled: boolean;
  layer3GhostTrailCount: number;
  layer3GhostTrailDt: number;
  layer3GhostTrailFade: number;
  // Per-layer SDF
  layer3SdfEnabled: boolean;
  layer3SdfShape: 'sphere' | 'ring' | 'star' | 'hexagon';
  layer3SdfLightX: number;
  layer3SdfLightY: number;
  layer3SdfSpecular: number;
  layer3SdfShininess: number;
  layer3SdfAmbient: number;
}
