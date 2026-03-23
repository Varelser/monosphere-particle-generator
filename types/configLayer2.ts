import type { Layer2Type, Layer3Source, ParticleBurstMode, ParticleBurstWaveform, ParticleSpriteMode, Position3D } from './scene';

export interface ParticleConfigLayer2 {
  layer2Enabled: boolean;
  layer2Color: string;
  layer2Source: Layer3Source;
  layer2SourceCount: number;
  layer2SourceSpread: number;
  layer2SourcePositions: Position3D[];
  layer2Type: Layer2Type;
  layer2MotionMix: boolean;
  layer2Motions: Layer2Type[];

  layer2Counts: number[];
  layer2Sizes: number[];
  layer2RadiusScales: number[];
  layer2FlowSpeeds: number[];
  layer2FlowAmps: number[];
  layer2FlowFreqs: number[];

  layer2Count: number;
  layer2BaseSize: number;
  layer2RadiusScale: number;
  layer2FlowSpeed: number;
  layer2FlowAmplitude: number;
  layer2FlowFrequency: number;
  layer2Complexity: number;
  layer2Trail: number;
  layer2Life: number;
  layer2LifeSpread: number;
  layer2LifeSizeBoost: number;
  layer2LifeSizeTaper: number;
  layer2Burst: number;
  layer2BurstPhase: number;
  layer2BurstMode: ParticleBurstMode;
  layer2BurstWaveform: ParticleBurstWaveform;
  layer2BurstSweepSpeed: number;
  layer2BurstSweepTilt: number;
  layer2BurstConeWidth: number;
  layer2EmitterOrbitSpeed: number;
  layer2EmitterOrbitRadius: number;
  layer2EmitterPulseAmount: number;
  layer2TrailDrag: number;
  layer2TrailTurbulence: number;
  layer2TrailDrift: number;
  layer2VelocityGlow: number;
  layer2VelocityAlpha: number;
  layer2FlickerAmount: number;
  layer2FlickerSpeed: number;
  layer2Streak: number;
  layer2SpriteMode: ParticleSpriteMode;

  layer2ConnectionEnabled: boolean;
  layer2ConnectionDistance: number;
  layer2ConnectionOpacity: number;
  layer2LineVelocityGlow: number;
  layer2LineVelocityAlpha: number;
  layer2LineBurstPulse: number;
  layer2LineShimmer: number;
  layer2LineFlickerSpeed: number;

  layer2Gravity: number;
  layer2Resistance: number;
  layer2SpinX: number;
  layer2SpinY: number;
  layer2SpinZ: number;
  layer2WindX: number;
  layer2WindY: number;
  layer2WindZ: number;

  layer2AffectPos: number;
  layer2NoiseScale: number;
  layer2OctaveMult: number;
  layer2Evolution: number;
  layer2MoveWithWind: number;
  layer2FluidForce: number;
  layer2Viscosity: number;
  layer2Fidelity: number;

  layer2InteractionNeighbor: number;
  layer2MouseForce: number;
  layer2MouseRadius: number;

  layer2CollisionMode: 'none' | 'world';
  layer2CollisionRadius: number;
  layer2Repulsion: number;
  layer2BoundaryEnabled: boolean;
  layer2BoundaryY: number;
  layer2BoundaryBounce: number;

  layer2AuxEnabled: boolean;
  layer2AuxCount: number;
  layer2AuxLife: number;
  layer2AuxDiffusion: number;
  layer2SparkEnabled: boolean;
  layer2SparkCount: number;
  layer2SparkLife: number;
  layer2SparkDiffusion: number;
  layer2SparkBurst: number;
}
