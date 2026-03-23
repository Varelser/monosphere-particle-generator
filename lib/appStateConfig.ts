import type { ParticleConfig, SequenceDriveMode, SequenceDriveStrengthMode, SequenceTransitionEasing, SynthScale } from '../types';

export const DEFAULT_CONFIG: ParticleConfig = {
  // View & Camera
  viewMode: 'perspective',
  cameraControlMode: 'hybrid',
  renderQuality: 'balanced',
  rotationSpeedX: 0.0005,
  rotationSpeedY: 0.001,
  manualRotationX: 0,
  manualRotationY: 0,
  manualRotationZ: 0,
  perspective: 1000,
  cameraDistance: 60,
  cameraImpulseStrength: 0,
  cameraImpulseSpeed: 1.1,
  cameraImpulseDrift: 0.2,
  cameraBurstBoost: 0.35,

  // Display
  opacity: 0.85,
  contrast: 1.0,
  particleSoftness: 0.5,
  particleGlow: 0.2,
  particleColor: 'white',
  backgroundColor: 'black',

  // Screen FX
  screenScanlineIntensity: 0.0,
  screenScanlineDensity: 420,
  screenNoiseIntensity: 0.0,
  screenVignetteIntensity: 0.0,
  screenPulseIntensity: 0.0,
  screenPulseSpeed: 1.2,
  screenImpactFlashIntensity: 0.0,
  screenBurstDrive: 0.0,
  screenBurstNoiseBoost: 0.28,
  screenBurstFlashBoost: 0.32,
  screenInterferenceIntensity: 0.0,
  screenPersistenceIntensity: 0.0,
  screenPersistenceLayers: 2,
  screenSplitIntensity: 0.0,
  screenSplitOffset: 0.35,
  screenSweepIntensity: 0.0,
  screenSweepSpeed: 0.8,
  screenSequenceDriveEnabled: false,
  screenSequenceDriveStrength: 0.35,

  // Inter-Layer Collision
  interLayerCollisionEnabled: false,
  interLayerCollisionStrength: 55,
  interLayerCollisionPadding: 80,
  interLayerCollisionMode: 'layer-volume',
  interLayerAudioReactive: false,
  interLayerAudioBoost: 1.2,
  interLayerContactFxEnabled: false,
  interLayerContactGlowBoost: 0.5,
  interLayerContactSizeBoost: 0.35,
  interLayerContactLineBoost: 0.45,
  interLayerContactScreenBoost: 0.35,

  // Depth Fog & Export
  depthFogEnabled: false,
  depthFogNear: 500,
  depthFogFar: 2800,
  exportScale: 1,
  exportTransparent: false,

  // Audio
  audioEnabled: false,
  audioSourceMode: 'microphone',
  audioSensitivity: 1.0,
  audioBeatScale: 0.5,
  audioJitterScale: 0.5,
  audioGateThreshold: 0.04,
  audioResponseCurve: 0.85,
  audioPulseDecay: 0.18,
  audioBassMotionScale: 1.2,
  audioBassSizeScale: 1.35,
  audioBassAlphaScale: 1.15,
  audioTrebleMotionScale: 1.15,
  audioTrebleSizeScale: 1.1,
  audioTrebleAlphaScale: 1.1,
  audioPulseScale: 1.35,
  audioBurstScale: 1.25,
  audioScreenScale: 1.15,
  audioMorphScale: 1.1,
  audioShatterScale: 1.2,
  audioTwistScale: 1.2,
  audioBendScale: 1.1,
  audioWarpScale: 1.25,
  audioLineScale: 1.2,
  audioCameraScale: 1.15,
  audioHueShiftScale: 0,

  // Synth
  synthWaveform: 'sawtooth',
  synthScale: 'minor-pentatonic',
  synthBaseFrequency: 110,
  synthTempo: 108,
  synthVolume: 0.18,
  synthCutoff: 1200,
  synthPatternDepth: 0.65,
  synthPattern: [0, 2, 4, 5, 3, 1, 4, 6],

  // Layer 1
  layer1Enabled: true,
  layer1Color: '#ffffff',
  layer1Count: 2000,
  layer1SourceCount: 1,
  layer1SourceSpread: 200,
  layer1SourcePositions: [],
  layer1Counts: [],
  layer1Radii: [],
  layer1Volumes: [],
  layer1Jitters: [],
  layer1Sizes: [],
  layer1PulseSpeeds: [],
  layer1PulseAmps: [],
  baseSize: 1.0,
  sphereRadius: 50,
  layer1Volume: 0.0,
  jitter: 0.0,
  pulseSpeed: 0.003,
  pulseAmplitude: 0.5,

  // Layer 2
  layer2Enabled: false,
  layer2Color: '#ffffff',
  layer2Source: 'sphere',
  layer2SourceCount: 1,
  layer2SourceSpread: 200,
  layer2SourcePositions: [],
  layer2Type: 'flow',
  layer2MotionMix: false,
  layer2Motions: [],
  layer2Count: 3000,
  layer2BaseSize: 0.8,
  layer2RadiusScale: 1.0,
  layer2FlowSpeed: 0.005,
  layer2FlowAmplitude: 20,
  layer2FlowFrequency: 1.5,
  layer2Complexity: 1,
  layer2Trail: 0.0,
  layer2Life: 0,
  layer2LifeSpread: 0,
  layer2LifeSizeBoost: 0,
  layer2LifeSizeTaper: 0,
  layer2Burst: 0,
  layer2BurstPhase: 0,
  layer2BurstMode: 'radial',
  layer2BurstWaveform: 'single',
  layer2BurstSweepSpeed: 0.9,
  layer2BurstSweepTilt: 0.35,
  layer2BurstConeWidth: 0.45,
  layer2EmitterOrbitSpeed: 0,
  layer2EmitterOrbitRadius: 0,
  layer2EmitterPulseAmount: 0,
  layer2TrailDrag: 0,
  layer2TrailTurbulence: 0,
  layer2TrailDrift: 0,
  layer2VelocityGlow: 0,
  layer2VelocityAlpha: 0,
  layer2FlickerAmount: 0,
  layer2FlickerSpeed: 1,
  layer2Streak: 0,
  layer2SpriteMode: 'soft',
  layer2Counts: [],
  layer2Sizes: [],
  layer2RadiusScales: [],
  layer2FlowSpeeds: [],
  layer2FlowAmps: [],
  layer2FlowFreqs: [],
  layer2ConnectionEnabled: false,
  layer2ConnectionDistance: 50,
  layer2ConnectionOpacity: 0.2,
  layer2LineVelocityGlow: 0.35,
  layer2LineVelocityAlpha: 0.25,
  layer2LineBurstPulse: 0.25,
  layer2LineShimmer: 0.18,
  layer2LineFlickerSpeed: 1.2,
  layer2Gravity: 0,
  layer2Resistance: 0,
  layer2SpinX: 0,
  layer2SpinY: 0,
  layer2SpinZ: 0,
  layer2WindX: 0,
  layer2WindY: 0,
  layer2WindZ: 0,
  layer2AffectPos: 1.0,
  layer2NoiseScale: 1.0,
  layer2OctaveMult: 2.0,
  layer2Evolution: 1.0,
  layer2MoveWithWind: 0.0,
  layer2FluidForce: 1.0,
  layer2Viscosity: 0.1,
  layer2Fidelity: 1,
  layer2InteractionNeighbor: 0.0,
  layer2MouseForce: 0,
  layer2MouseRadius: 100,
  layer2CollisionMode: 'none',
  layer2CollisionRadius: 20,
  layer2Repulsion: 10,
  layer2BoundaryEnabled: false,
  layer2BoundaryY: 200,
  layer2BoundaryBounce: 0.5,
  layer2AuxEnabled: false,
  layer2AuxCount: 1800,
  layer2AuxLife: 50,
  layer2AuxDiffusion: 1.0,
  layer2SparkEnabled: false,
  layer2SparkCount: 1600,
  layer2SparkLife: 24,
  layer2SparkDiffusion: 2.5,
  layer2SparkBurst: 0.9,

  // Layer 3
  layer3Enabled: false,
  layer3Color: '#ffffff',
  layer3Source: 'sphere',
  layer3SourceCount: 1,
  layer3SourceSpread: 200,
  layer3SourcePositions: [],
  layer3Type: 'flow',
  layer3MotionMix: false,
  layer3Motions: [],
  layer3Count: 1800,
  layer3BaseSize: 0.8,
  layer3RadiusScale: 1.0,
  layer3FlowSpeed: 0.005,
  layer3FlowAmplitude: 20,
  layer3FlowFrequency: 1.5,
  layer3Complexity: 1,
  layer3Trail: 0.0,
  layer3Life: 0,
  layer3LifeSpread: 0,
  layer3LifeSizeBoost: 0,
  layer3LifeSizeTaper: 0,
  layer3Burst: 0,
  layer3BurstPhase: 0,
  layer3BurstMode: 'radial',
  layer3BurstWaveform: 'single',
  layer3BurstSweepSpeed: 1.0,
  layer3BurstSweepTilt: 0.35,
  layer3BurstConeWidth: 0.4,
  layer3EmitterOrbitSpeed: 0,
  layer3EmitterOrbitRadius: 0,
  layer3EmitterPulseAmount: 0,
  layer3TrailDrag: 0,
  layer3TrailTurbulence: 0,
  layer3TrailDrift: 0,
  layer3VelocityGlow: 0,
  layer3VelocityAlpha: 0,
  layer3FlickerAmount: 0,
  layer3FlickerSpeed: 1,
  layer3Streak: 0,
  layer3SpriteMode: 'soft',
  layer3Counts: [],
  layer3Sizes: [],
  layer3RadiusScales: [],
  layer3FlowSpeeds: [],
  layer3FlowAmps: [],
  layer3FlowFreqs: [],
  layer3ConnectionEnabled: false,
  layer3ConnectionDistance: 50,
  layer3ConnectionOpacity: 0.2,
  layer3LineVelocityGlow: 0.42,
  layer3LineVelocityAlpha: 0.3,
  layer3LineBurstPulse: 0.32,
  layer3LineShimmer: 0.24,
  layer3LineFlickerSpeed: 1.45,
  layer3Gravity: 0,
  layer3Resistance: 0,
  layer3SpinX: 0,
  layer3SpinY: 0,
  layer3SpinZ: 0,
  layer3WindX: 0,
  layer3WindY: 0,
  layer3WindZ: 0,
  layer3AffectPos: 1.0,
  layer3NoiseScale: 1.0,
  layer3OctaveMult: 2.0,
  layer3Evolution: 1.0,
  layer3MoveWithWind: 0.0,
  layer3FluidForce: 1.0,
  layer3Viscosity: 0.1,
  layer3Fidelity: 1,
  layer3InteractionNeighbor: 0.0,
  layer3MouseForce: 0,
  layer3MouseRadius: 100,
  layer3CollisionMode: 'none',
  layer3CollisionRadius: 20,
  layer3Repulsion: 10,
  layer3BoundaryEnabled: false,
  layer3BoundaryY: 200,
  layer3BoundaryBounce: 0.5,
  layer3AuxEnabled: false,
  layer3AuxCount: 1200,
  layer3AuxLife: 50,
  layer3AuxDiffusion: 1.0,
  layer3SparkEnabled: false,
  layer3SparkCount: 900,
  layer3SparkLife: 18,
  layer3SparkDiffusion: 2.2,
  layer3SparkBurst: 1.05,

  // GPGPU Layer
  gpgpuEnabled: false,
  gpgpuCount: 65536,
  gpgpuGravity: 0.2,
  gpgpuTurbulence: 0.4,
  gpgpuBounce: 0.65,
  gpgpuBounceRadius: 150,
  gpgpuSize: 1.5,
  gpgpuSpeed: 1.0,
  gpgpuColor: '#88aaff',
  gpgpuOpacity: 0.7,
  gpgpuAudioReactive: false,
  gpgpuAudioBlast: 1.5,
  gpgpuTrailEnabled: false,
  gpgpuTrailLength: 8,
  gpgpuTrailFade: 0.75,
  gpgpuTrailVelocityScale: 1.0,
  gpgpuGeomMode: 'point' as const,
  gpgpuGeomVelocityAlign: false,
  gpgpuGeomScale: 1.0,
  gpgpuNBodyEnabled: false,
  gpgpuNBodyStrength: 1.0,
  gpgpuNBodyRepulsion: 5.0,
  gpgpuNBodySoftening: 2.0,
  gpgpuNBodySampleCount: 16,
  gpgpuVelColorEnabled: false,
  gpgpuVelColorHueMin: 200,
  gpgpuVelColorHueMax: 360,
  gpgpuVelColorSaturation: 0.9,
  gpgpuAgeEnabled: false,
  gpgpuAgeMax: 8.0,
  gpgpuAgeFadeIn: 0.1,
  gpgpuAgeFadeOut: 0.2,

  // SDF Particle Shape & Pseudo-3D Lighting
  sdfShapeEnabled: false,
  sdfShape: 'sphere' as const,
  sdfLightX: 0.5,
  sdfLightY: 0.7,
  sdfSpecularIntensity: 0.8,
  sdfSpecularShininess: 16.0,
  sdfAmbientLight: 0.3,

  // Post Processing
  postBloomEnabled: false,
  postBloomIntensity: 1.0,
  postBloomRadius: 0.4,
  postBloomThreshold: 0.15,
  postChromaticAberrationEnabled: false,
  postChromaticAberrationOffset: 0.003,
  postDofEnabled: false,
  postDofFocusDistance: 0.02,
  postDofFocalLength: 0.05,
  postDofBokehScale: 2.0,

  // Ambient Layer
  ambientEnabled: false,
  ambientColor: '#888888',
  ambientCount: 200,
  ambientSpread: 800,
  ambientSpeed: 0.003,
  ambientBaseSize: 0.5,
};

const CONFIG_ARRAY_KEYS = [
  'synthPattern',
  'layer1SourcePositions',
  'layer1Counts',
  'layer1Radii',
  'layer1Volumes',
  'layer1Jitters',
  'layer1Sizes',
  'layer1PulseSpeeds',
  'layer1PulseAmps',
  'layer2SourcePositions',
  'layer2Motions',
  'layer2Counts',
  'layer2Sizes',
  'layer2RadiusScales',
  'layer2FlowSpeeds',
  'layer2FlowAmps',
  'layer2FlowFreqs',
  'layer3SourcePositions',
  'layer3Motions',
  'layer3Counts',
  'layer3Sizes',
  'layer3RadiusScales',
  'layer3FlowSpeeds',
  'layer3FlowAmps',
  'layer3FlowFreqs',
] as const satisfies readonly (keyof ParticleConfig)[];

type ConfigArrayKey = typeof CONFIG_ARRAY_KEYS[number];

const DEFAULT_SYNTH_PATTERN = DEFAULT_CONFIG.synthPattern;

const SYNTH_SCALE_INTERVALS: Record<SynthScale, number[]> = {
  'minor-pentatonic': [0, 3, 5, 7, 10],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export const DEFAULT_SEQUENCE_EASING: SequenceTransitionEasing = 'ease-in-out';
export const DEFAULT_SEQUENCE_DRIVE_MODE: SequenceDriveMode = 'inherit';
export const DEFAULT_SEQUENCE_DRIVE_STRENGTH_MODE: SequenceDriveStrengthMode = 'inherit';
export const DEFAULT_SEQUENCE_DRIVE_MULTIPLIER = 1;

export function normalizeSynthPattern(candidate: unknown): number[] {
  if (!Array.isArray(candidate)) return [...DEFAULT_SYNTH_PATTERN];

  return Array.from({ length: DEFAULT_SYNTH_PATTERN.length }, (_, index) => {
    const value = candidate[index];
    return typeof value === 'number' ? Math.max(0, Math.min(15, Math.round(value))) : DEFAULT_SYNTH_PATTERN[index];
  });
}

export function resolveSynthSemitoneOffset(scale: SynthScale, degree: number) {
  const intervals = SYNTH_SCALE_INTERVALS[scale] ?? SYNTH_SCALE_INTERVALS['minor-pentatonic'];
  const octave = Math.floor(degree / intervals.length);
  const interval = intervals[degree % intervals.length] ?? 0;
  return interval + octave * 12;
}

export function normalizeParticleContrast<T extends Pick<ParticleConfig, 'particleColor' | 'backgroundColor'>>(config: T): T {
  if (config.particleColor !== config.backgroundColor) {
    return config;
  }

  return {
    ...config,
    backgroundColor: config.particleColor === 'black' ? 'white' : 'black',
  };
}

export function normalizeConfig(candidate: Partial<ParticleConfig> | null | undefined): ParticleConfig {
  const merged = { ...DEFAULT_CONFIG, ...(candidate ?? {}) } as ParticleConfig;
  const mergedArrayConfig = merged as unknown as Record<string, unknown>;
  const defaultArrayConfig = DEFAULT_CONFIG as ParticleConfig & Record<ConfigArrayKey, unknown[]>;
  for (const key of CONFIG_ARRAY_KEYS) {
    const value = mergedArrayConfig[key];
    mergedArrayConfig[key] = Array.isArray(value) ? [...value] : [...defaultArrayConfig[key]];
  }
  merged.synthPattern = normalizeSynthPattern(merged.synthPattern);
  return normalizeParticleContrast(merged);
}

export function normalizeSequenceTransitionEasing(value: unknown): SequenceTransitionEasing {
  return value === 'linear' || value === 'ease-in' || value === 'ease-out' || value === 'ease-in-out'
    ? value
    : DEFAULT_SEQUENCE_EASING;
}

export function normalizeSequenceDriveMode(value: unknown): SequenceDriveMode {
  return value === 'inherit' || value === 'on' || value === 'off'
    ? value
    : DEFAULT_SEQUENCE_DRIVE_MODE;
}

export function normalizeSequenceDriveStrengthMode(value: unknown): SequenceDriveStrengthMode {
  return value === 'inherit' || value === 'override'
    ? value
    : DEFAULT_SEQUENCE_DRIVE_STRENGTH_MODE;
}

export function normalizeSequenceDriveStrengthOverride(value: unknown) {
  return typeof value === 'number'
    ? Math.max(0, Math.min(1.5, value))
    : null;
}

export function normalizeSequenceDriveMultiplier(value: unknown) {
  return typeof value === 'number'
    ? Math.max(0, Math.min(2, value))
    : DEFAULT_SEQUENCE_DRIVE_MULTIPLIER;
}
