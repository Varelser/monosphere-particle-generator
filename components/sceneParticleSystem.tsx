import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';
import { getInterLayerCollidersForLayer, MAX_INTER_LAYER_COLLIDERS } from '../lib/appState';
import { generateParticleData } from './particleData';
import type { AuxMode, ParticleData } from './particleData';
import ParticleDataWorker from '../workers/particleDataWorker?worker';

// Worker instance + request ID counter (shared across component instances)
let _workerInstance: Worker | null = null;
let _workerReqId = 0;
const _workerCallbacks = new Map<number, (data: ParticleData | null) => void>();

function getSharedWorker(): Worker {
  if (!_workerInstance) {
    _workerInstance = new ParticleDataWorker();
    _workerInstance.onmessage = (e: MessageEvent<{ id: number; data: ParticleData | null }>) => {
      const cb = _workerCallbacks.get(e.data.id);
      if (cb) { _workerCallbacks.delete(e.data.id); cb(e.data.data); }
    };
  }
  return _workerInstance;
}

function generateParticleDataAsync(
  config: ParticleConfig,
  layerIndex: 1 | 2 | 3 | 4,
  isAux: boolean,
  auxMode: AuxMode,
): Promise<ParticleData | null> {
  return new Promise((resolve) => {
    const id = ++_workerReqId;
    _workerCallbacks.set(id, resolve);
    try {
      getSharedWorker().postMessage({ id, config, layerIndex, isAux, auxMode });
    } catch {
      // Worker unavailable (e.g., SharedArrayBuffer policy) — fall back to sync
      _workerCallbacks.delete(id);
      resolve(generateParticleData(config, layerIndex, isAux, auxMode));
    }
  });
}
import { FRAGMENT_SHADER, PARTICLE_VERTEX_SHADER } from './sceneShaders';
import { LineSystem } from './sceneLineSystem';
import { getParticleBlendMode } from './sceneShared';

function getSpriteModeValue(mode: ParticleConfig['layer2SpriteMode']) {
  if (mode === 'ring') return 1;
  if (mode === 'spark') return 2;
  return 0;
}

function getBurstModeValue(mode: ParticleConfig['layer2BurstMode']) {
  if (mode === 'cone') return 1;
  if (mode === 'sweep') return 2;
  return 0;
}

function getBurstWaveformValue(mode: ParticleConfig['layer2BurstWaveform']) {
  if (mode === 'loop') return 1;
  if (mode === 'stutter') return 2;
  if (mode === 'heartbeat') return 3;
  return 0;
}

type LayerParams = {
  speed: number;
  amp: number;
  freq: number;
  noise: number;
  complexity: number;
  evol: number;
  fid: number;
  oct: number;
  rad: number;
  size: number;
  grav: number;
  resistance: number;
  vis: number;
  fluid: number;
  affectPos: number;
  moveWithWind: number;
  neighborForce: number;
  collisionMode: number;
  collisionRadius: number;
  repulsion: number;
  trail: number;
  life: number;
  lifeSpread: number;
  lifeSizeBoost: number;
  lifeSizeTaper: number;
  burst: number;
  burstPhase: number;
  burstMode: number;
  burstWaveform: number;
  burstSweepSpeed: number;
  burstSweepTilt: number;
  burstConeWidth: number;
  emitterOrbitSpeed: number;
  emitterOrbitRadius: number;
  emitterPulseAmount: number;
  trailDrag: number;
  trailTurbulence: number;
  trailDrift: number;
  velocityGlow: number;
  velocityAlpha: number;
  flickerAmount: number;
  flickerSpeed: number;
  streak: number;
  spriteMode: number;
  auxLife: number;
  mouseForce: number;
  mouseRadius: number;
  windX: number;
  windY: number;
  windZ: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  boundaryY: number;
  boundaryEnabled: number;
  boundaryBounce: number;
};

function resolveLayerParams(
  config: ParticleConfig,
  layerIndex: 2 | 3,
  isAux: boolean,
  auxMode: AuxMode,
): LayerParams {
  const L = layerIndex;

  const baseSize = L === 2 ? config.layer2BaseSize : config.layer3BaseSize;
  const size = isAux
    ? (auxMode === 'spark' ? baseSize * (L === 2 ? 0.42 : 0.36) : baseSize * 0.6)
    : baseSize;

  const baseTrail = L === 2 ? config.layer2Trail : config.layer3Trail;
  const sparkTrailMin = L === 2 ? 0.85 : 0.9;
  const trail = isAux && auxMode === 'spark' ? Math.max(baseTrail, sparkTrailMin) : baseTrail;

  const baseBurst = L === 2 ? config.layer2Burst : config.layer3Burst;
  const sparkBurst = L === 2 ? config.layer2SparkBurst : config.layer3SparkBurst;
  const burst = isAux && auxMode === 'spark' ? Math.max(baseBurst, sparkBurst) : baseBurst;

  const baseStreak = L === 2 ? config.layer2Streak : config.layer3Streak;
  const sparkStreakMin = L === 2 ? 1.2 : 1.25;
  const streak = isAux && auxMode === 'spark' ? Math.max(baseStreak, sparkStreakMin) : baseStreak;

  const baseSpriteMode = L === 2 ? config.layer2SpriteMode : config.layer3SpriteMode;
  const spriteMode = isAux && auxMode === 'spark'
    ? getSpriteModeValue('spark')
    : getSpriteModeValue(baseSpriteMode);

  const baseAuxLife = L === 2 ? config.layer2AuxLife : config.layer3AuxLife;
  const baseSparkLife = L === 2 ? config.layer2SparkLife : config.layer3SparkLife;
  const auxLife = auxMode === 'spark' ? baseSparkLife : baseAuxLife;

  return {
    speed: L === 2 ? config.layer2FlowSpeed : config.layer3FlowSpeed,
    amp: L === 2 ? config.layer2FlowAmplitude : config.layer3FlowAmplitude,
    freq: L === 2 ? config.layer2FlowFrequency : config.layer3FlowFrequency,
    noise: L === 2 ? config.layer2NoiseScale : config.layer3NoiseScale,
    complexity: L === 2 ? config.layer2Complexity : config.layer3Complexity,
    evol: L === 2 ? config.layer2Evolution : config.layer3Evolution,
    fid: L === 2 ? config.layer2Fidelity : config.layer3Fidelity,
    oct: L === 2 ? config.layer2OctaveMult : config.layer3OctaveMult,
    rad: config.sphereRadius * (L === 2 ? config.layer2RadiusScale : config.layer3RadiusScale),
    size,
    grav: L === 2 ? config.layer2Gravity : config.layer3Gravity,
    resistance: L === 2 ? config.layer2Resistance : config.layer3Resistance,
    vis: L === 2 ? config.layer2Viscosity : config.layer3Viscosity,
    fluid: L === 2 ? config.layer2FluidForce : config.layer3FluidForce,
    affectPos: L === 2 ? config.layer2AffectPos : config.layer3AffectPos,
    moveWithWind: L === 2 ? config.layer2MoveWithWind : config.layer3MoveWithWind,
    neighborForce: L === 2 ? config.layer2InteractionNeighbor : config.layer3InteractionNeighbor,
    collisionMode: (L === 2 ? config.layer2CollisionMode : config.layer3CollisionMode) === 'world' ? 1 : 0,
    collisionRadius: L === 2 ? config.layer2CollisionRadius : config.layer3CollisionRadius,
    repulsion: L === 2 ? config.layer2Repulsion : config.layer3Repulsion,
    trail,
    life: L === 2 ? config.layer2Life : config.layer3Life,
    lifeSpread: L === 2 ? config.layer2LifeSpread : config.layer3LifeSpread,
    lifeSizeBoost: L === 2 ? config.layer2LifeSizeBoost : config.layer3LifeSizeBoost,
    lifeSizeTaper: L === 2 ? config.layer2LifeSizeTaper : config.layer3LifeSizeTaper,
    burst,
    burstPhase: L === 2 ? config.layer2BurstPhase : config.layer3BurstPhase,
    burstMode: getBurstModeValue(L === 2 ? config.layer2BurstMode : config.layer3BurstMode),
    burstWaveform: getBurstWaveformValue(L === 2 ? config.layer2BurstWaveform : config.layer3BurstWaveform),
    burstSweepSpeed: L === 2 ? config.layer2BurstSweepSpeed : config.layer3BurstSweepSpeed,
    burstSweepTilt: L === 2 ? config.layer2BurstSweepTilt : config.layer3BurstSweepTilt,
    burstConeWidth: L === 2 ? config.layer2BurstConeWidth : config.layer3BurstConeWidth,
    emitterOrbitSpeed: L === 2 ? config.layer2EmitterOrbitSpeed : config.layer3EmitterOrbitSpeed,
    emitterOrbitRadius: L === 2 ? config.layer2EmitterOrbitRadius : config.layer3EmitterOrbitRadius,
    emitterPulseAmount: L === 2 ? config.layer2EmitterPulseAmount : config.layer3EmitterPulseAmount,
    trailDrag: L === 2 ? config.layer2TrailDrag : config.layer3TrailDrag,
    trailTurbulence: L === 2 ? config.layer2TrailTurbulence : config.layer3TrailTurbulence,
    trailDrift: L === 2 ? config.layer2TrailDrift : config.layer3TrailDrift,
    velocityGlow: L === 2 ? config.layer2VelocityGlow : config.layer3VelocityGlow,
    velocityAlpha: L === 2 ? config.layer2VelocityAlpha : config.layer3VelocityAlpha,
    flickerAmount: L === 2 ? config.layer2FlickerAmount : config.layer3FlickerAmount,
    flickerSpeed: L === 2 ? config.layer2FlickerSpeed : config.layer3FlickerSpeed,
    streak,
    spriteMode,
    auxLife,
    mouseForce: L === 2 ? config.layer2MouseForce : config.layer3MouseForce,
    mouseRadius: L === 2 ? config.layer2MouseRadius : config.layer3MouseRadius,
    windX: L === 2 ? config.layer2WindX : config.layer3WindX,
    windY: L === 2 ? config.layer2WindY : config.layer3WindY,
    windZ: L === 2 ? config.layer2WindZ : config.layer3WindZ,
    spinX: L === 2 ? config.layer2SpinX : config.layer3SpinX,
    spinY: L === 2 ? config.layer2SpinY : config.layer3SpinY,
    spinZ: L === 2 ? config.layer2SpinZ : config.layer3SpinZ,
    boundaryY: L === 2 ? config.layer2BoundaryY : config.layer3BoundaryY,
    boundaryEnabled: (L === 2 ? config.layer2BoundaryEnabled : config.layer3BoundaryEnabled) ? 1 : 0,
    boundaryBounce: L === 2 ? config.layer2BoundaryBounce : config.layer3BoundaryBounce,
  };
}

export const ParticleSystem: React.FC<{
  config: ParticleConfig;
  layerIndex: 1 | 2 | 3 | 4;
  isAux?: boolean;
  auxMode?: AuxMode;
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number; bandA: number; bandB: number }>;
  isPlaying: boolean;
  contactAmount: number;
}> = React.memo(({ config, layerIndex, isAux = false, auxMode = 'aux', audioRef, isPlaying, contactAmount }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windRef = useRef(new THREE.Vector3());
  const spinRef = useRef(new THREE.Vector3());
  const prevAudioEnabledRef = useRef<boolean>(config.audioEnabled);
  // Fix B: layerParamsのキャッシュ —— config変化時のみ再計算する
  const prevLayerKeyRef = useRef<string>('');

  const interLayerColliders = useMemo(() => {
    if (layerIndex === 4 || isAux) {
      return Array.from({ length: MAX_INTER_LAYER_COLLIDERS }, () => ({ center: new THREE.Vector3(), radius: 0 }));
    }
    const colliders = getInterLayerCollidersForLayer(config, layerIndex);
    return Array.from({ length: MAX_INTER_LAYER_COLLIDERS }, (_, index) => colliders[index] ?? { center: new THREE.Vector3(), radius: 0 });
  }, [config, isAux, layerIndex]);
  const activeInterLayerColliderCount = useMemo(
    () => interLayerColliders.reduce((count, collider) => count + (collider.radius > 0 ? 1 : 0), 0),
    [interLayerColliders],
  );

  const geometryKey = useMemo(() => JSON.stringify([
    layerIndex, isAux,
    layerIndex === 1 ? [
      config.layer1Count, config.layer1SourceCount, config.layer1SourceSpread,
      config.layer1SourcePositions, config.layer1Counts, config.layer1Radii, config.layer1Sizes,
      config.layer1Volume, config.layer1Volumes,
      config.layer1PulseSpeeds, config.layer1PulseAmps, config.layer1Jitters,
    ] : layerIndex === 2 ? [
      config.layer2Count, config.layer2SourceCount, config.layer2SourceSpread,
      config.layer2Source, config.layer2SourcePositions, config.layer2Type,
      config.layer2MotionMix, config.layer2Motions, config.layer2Counts, config.layer2RadiusScales,
      config.layer2Sizes, config.layer2FlowSpeeds, config.layer2FlowAmps, config.layer2FlowFreqs,
      config.layer2AuxCount, config.layer2AuxDiffusion, config.layer2SparkCount, config.layer2SparkDiffusion, auxMode,
    ] : layerIndex === 3 ? [
      config.layer3Count, config.layer3SourceCount, config.layer3SourceSpread,
      config.layer3Source, config.layer3SourcePositions, config.layer3Type,
      config.layer3MotionMix, config.layer3Motions, config.layer3Counts, config.layer3RadiusScales,
      config.layer3Sizes, config.layer3FlowSpeeds, config.layer3FlowAmps, config.layer3FlowFreqs,
      config.layer3AuxCount, config.layer3AuxDiffusion, config.layer3SparkCount, config.layer3SparkDiffusion, auxMode,
    ] : [config.ambientCount, config.ambientSpread],
  ]), [config, layerIndex, isAux, auxMode]);

  const [data, setData] = useState<ParticleData | null>(null);
  useEffect(() => {
    setData(null);
    let cancelled = false;
    generateParticleDataAsync(config, layerIndex, isAux, auxMode).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometryKey]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: config.opacity },
    uColor: { value: new THREE.Color('#ffffff') },
    uHueShift: { value: 0 },
    uContrast: { value: config.contrast },
    uInkMode: { value: config.particleColor === 'black' ? 1 : 0 },
    uSoftness: { value: config.particleSoftness },
    uGlow: { value: config.particleGlow },
    uAudioBass: { value: 0 },
    uAudioTreble: { value: 0 },
    uAudioBassMotion: { value: 0 },
    uAudioTrebleMotion: { value: 0 },
    uAudioBassSize: { value: 0 },
    uAudioTrebleSize: { value: 0 },
    uAudioBassAlpha: { value: 0 },
    uAudioTrebleAlpha: { value: 0 },
    uAudioBassLine: { value: 0 },
    uAudioTrebleLine: { value: 0 },
    // Custom frequency band uniforms
    uAudioBandAMotion: { value: 0 },
    uAudioBandASize: { value: 0 },
    uAudioBandAAlpha: { value: 0 },
    uAudioBandBMotion: { value: 0 },
    uAudioBandBSize: { value: 0 },
    uAudioBandBAlpha: { value: 0 },
    uAudioPulse: { value: 0 },
    uAudioMorph: { value: 0 },
    uAudioShatter: { value: 0 },
    uAudioTwist: { value: 0 },
    uAudioBend: { value: 0 },
    uAudioWarp: { value: 0 },
    uGlobalSpeed: { value: 1.0 },
    uGlobalAmp: { value: 1.0 },
    uGlobalNoiseScale: { value: 1.0 },
    uGlobalComplexity: { value: 1.0 },
    uGlobalEvolution: { value: 1.0 },
    uGlobalFidelity: { value: 1.0 },
    uGlobalOctaveMult: { value: 1.0 },
    uGlobalFreq: { value: 1.0 },
    uGlobalRadius: { value: 100.0 },
    uGlobalSize: { value: 1.0 },
    uGravity: { value: 0 },
    uWind: { value: new THREE.Vector3(0, 0, 0) },
    uSpin: { value: new THREE.Vector3(0, 0, 0) },
    uBoundaryY: { value: 0 },
    uBoundaryEnabled: { value: 0 },
    uBoundaryBounce: { value: 0 },
    uViscosity: { value: 0 },
    uFluidForce: { value: 0 },
    uResistance: { value: 0 },
    uMoveWithWind: { value: 0 },
    uNeighborForce: { value: 0 },
    uCollisionMode: { value: 0 },
    uCollisionRadius: { value: 20 },
    uRepulsion: { value: 10 },
    uTrail: { value: 0 },
    uLife: { value: 0 },
    uLifeSpread: { value: 0 },
    uLifeSizeBoost: { value: 0 },
    uLifeSizeTaper: { value: 0 },
    uBurst: { value: 0 },
    uBurstPhase: { value: 0 },
    uBurstMode: { value: 0 },
    uBurstWaveform: { value: 0 },
    uBurstSweepSpeed: { value: 1 },
    uBurstSweepTilt: { value: 0.35 },
    uBurstConeWidth: { value: 0.4 },
    uEmitterOrbitSpeed: { value: 0 },
    uEmitterOrbitRadius: { value: 0 },
    uEmitterPulseAmount: { value: 0 },
    uTrailDrag: { value: 0 },
    uTrailTurbulence: { value: 0 },
    uTrailDrift: { value: 0 },
    uVelocityGlow: { value: 0 },
    uVelocityAlpha: { value: 0 },
    uFlickerAmount: { value: 0 },
    uFlickerSpeed: { value: 1 },
    uStreak: { value: 0 },
    uSpriteMode: { value: 0 },
    uAuxLife: { value: 100 },
    uIsAux: { value: isAux ? 1 : 0 },
    uAffectPos: { value: 1.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uMouseForce: { value: 0 },
    uMouseRadius: { value: 100 },
    uIsOrthographic: { value: 0 },
    uInterLayerEnabled: { value: 0 },
    uInterLayerColliderCount: { value: 0 },
    uInterLayerColliders: { value: Array.from({ length: MAX_INTER_LAYER_COLLIDERS }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uInterLayerStrength: { value: 0 },
    uInterLayerPadding: { value: 0 },
    uSdfEnabled: { value: 0 },
    uSdfShape: { value: 0 },
    uSdfLight: { value: new THREE.Vector2(0.5, 0.7) },
    uSdfSpecular: { value: 0.8 },
    uSdfShininess: { value: 16.0 },
    uSdfAmbient: { value: 0.3 },
    uInstanced3D: { value: 0 },
    uInstanced3DScale: { value: 1.0 },
  }), [config.opacity, config.contrast, config.particleSoftness, config.particleGlow, isAux]);

  // ── Ghost trail materials (L2/L3 non-aux only) ──
  const MAX_GHOST = 8;
  const ghostMats = useMemo(() => {
    if ((layerIndex !== 2 && layerIndex !== 3) || isAux) return [] as THREE.ShaderMaterial[];
    return Array.from({ length: MAX_GHOST }, () => {
      const cloned: Record<string, { value: unknown }> = {};
      for (const [k, u] of Object.entries(uniforms)) {
        const v = u.value;
        if (v instanceof THREE.Color)        cloned[k] = { value: v.clone() };
        else if (v instanceof THREE.Vector2) cloned[k] = { value: v.clone() };
        else if (v instanceof THREE.Vector3) cloned[k] = { value: v.clone() };
        else if (v instanceof THREE.Vector4) cloned[k] = { value: v.clone() };
        else if (Array.isArray(v))           cloned[k] = { value: (v as { clone?: () => unknown }[]).map(x => x?.clone?.() ?? x) };
        else cloned[k] = { value: v };
      }
      return new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        uniforms: cloned,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: getParticleBlendMode(config.backgroundColor),
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerIndex, isAux]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    if (isPlaying) mat.uniforms.uTime.value += delta;

    // Audio uniform updates
    const audioEnabledChanged = prevAudioEnabledRef.current !== config.audioEnabled;
    prevAudioEnabledRef.current = config.audioEnabled;

    if (config.audioEnabled) {
      const bassInput = audioRef.current.bass * config.audioBeatScale;
      const trebleInput = audioRef.current.treble * config.audioJitterScale;
      const pulseInput = audioRef.current.pulse * config.audioPulseScale;
      const morphInput = audioRef.current.pulse * config.audioMorphScale;
      const shatterInput = (trebleInput * 0.75 + pulseInput * 0.35) * config.audioShatterScale;
      const twistInput = (bassInput * 0.6 + pulseInput * 0.9) * config.audioTwistScale;
      const bendInput = (trebleInput * 0.55 + pulseInput * 0.7) * config.audioBendScale;
      const warpInput = (bassInput * 0.35 + trebleInput * 0.35 + pulseInput) * config.audioWarpScale;

      mat.uniforms.uAudioBass.value = bassInput;
      mat.uniforms.uAudioTreble.value = trebleInput;
      mat.uniforms.uAudioBassMotion.value = bassInput * config.audioBassMotionScale;
      mat.uniforms.uAudioTrebleMotion.value = trebleInput * config.audioTrebleMotionScale;
      mat.uniforms.uAudioBassSize.value = bassInput * config.audioBassSizeScale;
      mat.uniforms.uAudioTrebleSize.value = trebleInput * config.audioTrebleSizeScale;
      mat.uniforms.uAudioBassAlpha.value = bassInput * config.audioBassAlphaScale;
      mat.uniforms.uAudioTrebleAlpha.value = trebleInput * config.audioTrebleAlphaScale;
      mat.uniforms.uAudioBassLine.value = bassInput * config.audioLineScale;
      mat.uniforms.uAudioTrebleLine.value = trebleInput * config.audioLineScale;
      // Custom frequency bands
      const bandAInput = audioRef.current.bandA;
      const bandBInput = audioRef.current.bandB;
      mat.uniforms.uAudioBandAMotion.value = bandAInput * config.audioBandAMotionScale;
      mat.uniforms.uAudioBandASize.value = bandAInput * config.audioBandASizeScale;
      mat.uniforms.uAudioBandAAlpha.value = bandAInput * config.audioBandAAlphaScale;
      mat.uniforms.uAudioBandBMotion.value = bandBInput * config.audioBandBMotionScale;
      mat.uniforms.uAudioBandBSize.value = bandBInput * config.audioBandBSizeScale;
      mat.uniforms.uAudioBandBAlpha.value = bandBInput * config.audioBandBAlphaScale;
      mat.uniforms.uAudioPulse.value = pulseInput;
      mat.uniforms.uAudioMorph.value = morphInput;
      mat.uniforms.uAudioShatter.value = shatterInput;
      mat.uniforms.uAudioTwist.value = twistInput;
      mat.uniforms.uAudioBend.value = bendInput;
      mat.uniforms.uAudioWarp.value = warpInput;
    } else if (audioEnabledChanged) {
      // audio が無効になった最初のフレームのみゼロリセット（初期値はすでに0なのでそれ以降は不要）
      mat.uniforms.uAudioBass.value = 0;
      mat.uniforms.uAudioTreble.value = 0;
      mat.uniforms.uAudioBassMotion.value = 0;
      mat.uniforms.uAudioTrebleMotion.value = 0;
      mat.uniforms.uAudioBassSize.value = 0;
      mat.uniforms.uAudioTrebleSize.value = 0;
      mat.uniforms.uAudioBassAlpha.value = 0;
      mat.uniforms.uAudioTrebleAlpha.value = 0;
      mat.uniforms.uAudioBassLine.value = 0;
      mat.uniforms.uAudioTrebleLine.value = 0;
      mat.uniforms.uAudioBandAMotion.value = 0;
      mat.uniforms.uAudioBandASize.value = 0;
      mat.uniforms.uAudioBandAAlpha.value = 0;
      mat.uniforms.uAudioBandBMotion.value = 0;
      mat.uniforms.uAudioBandBSize.value = 0;
      mat.uniforms.uAudioBandBAlpha.value = 0;
      mat.uniforms.uAudioPulse.value = 0;
      mat.uniforms.uAudioMorph.value = 0;
      mat.uniforms.uAudioShatter.value = 0;
      mat.uniforms.uAudioTwist.value = 0;
      mat.uniforms.uAudioBend.value = 0;
      mat.uniforms.uAudioWarp.value = 0;
    }

    mat.uniforms.uMouse.value.set(state.pointer.x, state.pointer.y);
    mat.uniforms.uOpacity.value = config.opacity * (isAux ? (auxMode === 'spark' ? 0.85 : 0.7) : 1.0);
    const layerHex = layerIndex === 1 ? config.layer1Color : layerIndex === 2 ? config.layer2Color : layerIndex === 3 ? config.layer3Color : (config.ambientColor ?? '#888888');
    mat.uniforms.uColor.value.setStyle(layerHex);
    mat.uniforms.uContrast.value = config.contrast;
    mat.uniforms.uInkMode.value = config.particleColor === 'black' ? 1 : 0;
    if (config.audioEnabled && config.audioHueShiftScale > 0.001) {
      const hueShift = (audioRef.current.bass * 0.35 + audioRef.current.treble * 0.2 + audioRef.current.pulse * 0.45) * config.audioHueShiftScale * 0.3;
      mat.uniforms.uHueShift.value = hueShift;
    } else {
      mat.uniforms.uHueShift.value = 0;
    }
    mat.uniforms.uSoftness.value = config.particleSoftness;
    const impactGlowBoost = config.interLayerContactFxEnabled && config.interLayerCollisionEnabled
      ? contactAmount * config.interLayerContactGlowBoost
      : 0;
    mat.uniforms.uGlow.value = Math.min(3, config.particleGlow + impactGlowBoost);
    mat.uniforms.uIsOrthographic.value = config.viewMode === 'orthographic' ? 1 : 0;

    // Layer parameter resolution
    let speed = 0;
    let amp = 0;
    let noise = 1;
    let evol = 1;
    let fid = 1;
    let oct = 1;
    let freq = 1;
    let rad = 100;
    let size = 1;
    let grav = 0;
    let vis = 0;
    let fluid = 0;
    let affectPos = 1;
    let mouseForce = 0;
    let mouseRadius = 100;
    let complexity = 1;
    let resistance = 0;
    let moveWithWind = 0;
    let neighborForce = 0;
    let collisionMode = 0;
    let collisionRadius = 20;
    let repulsion = 10;
    let trail = 0;
    let life = 0;
    let lifeSpread = 0;
    let lifeSizeBoost = 0;
    let lifeSizeTaper = 0;
    let burst = 0;
    let burstPhase = 0;
    let burstMode = 0;
    let burstWaveform = 0;
    let burstSweepSpeed = 1;
    let burstSweepTilt = 0.35;
    let burstConeWidth = 0.4;
    let emitterOrbitSpeed = 0;
    let emitterOrbitRadius = 0;
    let emitterPulseAmount = 0;
    let trailDrag = 0;
    let trailTurbulence = 0;
    let trailDrift = 0;
    let velocityGlow = 0;
    let velocityAlpha = 0;
    let flickerAmount = 0;
    let flickerSpeed = 1;
    let streak = 0;
    let spriteMode = 0;
    let auxLife = 100;
    const wind = windRef.current;
    const spin = spinRef.current;
    let boundaryY = 0;
    let boundaryEnabled = 0;
    let boundaryBounce = 0;

    if (layerIndex === 1) {
      speed = config.pulseSpeed;
      amp = config.pulseAmplitude;
      noise = config.jitter;
      complexity = Math.max(1, config.jitter * 2);
      freq = config.jitter;
      rad = config.sphereRadius;
      size = config.baseSize;
    } else if (layerIndex === 2 || layerIndex === 3) {
      const p = resolveLayerParams(config, layerIndex, isAux, auxMode);
      speed = p.speed;
      amp = p.amp;
      freq = p.freq;
      noise = p.noise;
      complexity = p.complexity;
      evol = p.evol;
      fid = p.fid;
      oct = p.oct;
      rad = p.rad;
      size = p.size;
      grav = p.grav;
      resistance = p.resistance;
      vis = p.vis;
      fluid = p.fluid;
      affectPos = p.affectPos;
      moveWithWind = p.moveWithWind;
      neighborForce = p.neighborForce;
      collisionMode = p.collisionMode;
      collisionRadius = p.collisionRadius;
      repulsion = p.repulsion;
      trail = p.trail;
      life = p.life;
      lifeSpread = p.lifeSpread;
      lifeSizeBoost = p.lifeSizeBoost;
      lifeSizeTaper = p.lifeSizeTaper;
      burst = p.burst;
      burstPhase = p.burstPhase;
      burstMode = p.burstMode;
      burstWaveform = p.burstWaveform;
      burstSweepSpeed = p.burstSweepSpeed;
      burstSweepTilt = p.burstSweepTilt;
      burstConeWidth = p.burstConeWidth;
      emitterOrbitSpeed = p.emitterOrbitSpeed;
      emitterOrbitRadius = p.emitterOrbitRadius;
      emitterPulseAmount = p.emitterPulseAmount;
      trailDrag = p.trailDrag;
      trailTurbulence = p.trailTurbulence;
      trailDrift = p.trailDrift;
      velocityGlow = p.velocityGlow;
      velocityAlpha = p.velocityAlpha;
      flickerAmount = p.flickerAmount;
      flickerSpeed = p.flickerSpeed;
      streak = p.streak;
      spriteMode = p.spriteMode;
      auxLife = p.auxLife;
      mouseForce = p.mouseForce;
      mouseRadius = p.mouseRadius;
      wind.set(p.windX, p.windY, p.windZ);
      spin.set(p.spinX, p.spinY, p.spinZ);
      boundaryY = p.boundaryY;
      boundaryEnabled = p.boundaryEnabled;
      boundaryBounce = p.boundaryBounce;
    } else {
      // layerIndex === 4 (ambient)
      speed = config.ambientSpeed;
      amp = config.ambientSpread;
      size = config.ambientBaseSize;
      rad = config.ambientSpread;
    }

    // Apply layer params to uniforms — config変化時のみ更新（Fix B）
    // 単純な値の組み合わせでキーを作り、変化検出する
    const layerKey = `${speed},${amp},${freq},${noise},${complexity},${evol},${fid},${oct},${rad},${size},${grav},${vis},${fluid},${affectPos},${resistance},${moveWithWind},${neighborForce},${collisionMode},${collisionRadius},${repulsion},${trail},${life},${lifeSpread},${lifeSizeBoost},${lifeSizeTaper},${burst},${burstPhase},${burstMode},${burstWaveform},${burstSweepSpeed},${burstSweepTilt},${burstConeWidth},${emitterOrbitSpeed},${emitterOrbitRadius},${emitterPulseAmount},${trailDrag},${trailTurbulence},${trailDrift},${velocityGlow},${velocityAlpha},${flickerAmount},${flickerSpeed},${streak},${spriteMode},${auxLife},${mouseForce},${mouseRadius},${wind.x},${wind.y},${wind.z},${spin.x},${spin.y},${spin.z},${boundaryY},${boundaryEnabled},${boundaryBounce}`;
    const layerParamsChanged = layerKey !== prevLayerKeyRef.current;
    if (layerParamsChanged) {
      prevLayerKeyRef.current = layerKey;
      mat.uniforms.uGlobalSpeed.value = speed;
      mat.uniforms.uGlobalAmp.value = amp;
      mat.uniforms.uGlobalFreq.value = freq;
      mat.uniforms.uGlobalNoiseScale.value = noise;
      mat.uniforms.uGlobalComplexity.value = complexity;
      mat.uniforms.uGlobalEvolution.value = evol;
      mat.uniforms.uGlobalFidelity.value = fid;
      mat.uniforms.uGlobalOctaveMult.value = oct;
      mat.uniforms.uGlobalRadius.value = rad;

      const impactSizeBoost = config.interLayerContactFxEnabled && config.interLayerCollisionEnabled
        ? 1 + contactAmount * config.interLayerContactSizeBoost
        : 1;
      mat.uniforms.uGlobalSize.value = size * impactSizeBoost;

      mat.uniforms.uGravity.value = grav;
      mat.uniforms.uViscosity.value = vis;
      mat.uniforms.uFluidForce.value = fluid;
      mat.uniforms.uResistance.value = resistance;
      mat.uniforms.uMoveWithWind.value = moveWithWind;
      mat.uniforms.uNeighborForce.value = neighborForce;
      mat.uniforms.uCollisionMode.value = collisionMode;
      mat.uniforms.uCollisionRadius.value = collisionRadius;
      mat.uniforms.uRepulsion.value = repulsion;
      mat.uniforms.uTrail.value = trail;
      mat.uniforms.uLife.value = life;
      mat.uniforms.uLifeSpread.value = lifeSpread;
      mat.uniforms.uLifeSizeBoost.value = lifeSizeBoost;
      mat.uniforms.uLifeSizeTaper.value = lifeSizeTaper;
      mat.uniforms.uBurst.value = burst;
      mat.uniforms.uBurstPhase.value = burstPhase;
      mat.uniforms.uBurstMode.value = burstMode;
      mat.uniforms.uBurstWaveform.value = burstWaveform;
      mat.uniforms.uBurstSweepSpeed.value = burstSweepSpeed;
      mat.uniforms.uBurstSweepTilt.value = burstSweepTilt;
      mat.uniforms.uBurstConeWidth.value = burstConeWidth;
      mat.uniforms.uEmitterOrbitSpeed.value = emitterOrbitSpeed;
      mat.uniforms.uEmitterOrbitRadius.value = emitterOrbitRadius;
      mat.uniforms.uEmitterPulseAmount.value = emitterPulseAmount;
      mat.uniforms.uTrailDrag.value = trailDrag;
      mat.uniforms.uTrailTurbulence.value = trailTurbulence;
      mat.uniforms.uTrailDrift.value = trailDrift;
      mat.uniforms.uVelocityGlow.value = velocityGlow;
      mat.uniforms.uVelocityAlpha.value = velocityAlpha;
      mat.uniforms.uFlickerAmount.value = flickerAmount;
      mat.uniforms.uFlickerSpeed.value = flickerSpeed;
      mat.uniforms.uStreak.value = streak;
      mat.uniforms.uSpriteMode.value = spriteMode;
      mat.uniforms.uAuxLife.value = auxLife;
      mat.uniforms.uIsAux.value = isAux ? 1 : 0;
      mat.uniforms.uAffectPos.value = affectPos;
      mat.uniforms.uMouseForce.value = mouseForce;
      mat.uniforms.uMouseRadius.value = mouseRadius;
      mat.uniforms.uWind.value.copy(wind);
      mat.uniforms.uSpin.value.copy(spin);
      mat.uniforms.uBoundaryY.value = boundaryY;
      mat.uniforms.uBoundaryEnabled.value = boundaryEnabled;
      mat.uniforms.uBoundaryBounce.value = boundaryBounce;
    } // end layerParamsChanged


    // Inter-layer collision（毎フレーム更新: audioや接触量が変化するため）
    const bassInputForCollision = config.audioEnabled ? audioRef.current.bass * config.audioBeatScale : 0;
    const collisionAudioBoost = config.interLayerAudioReactive && config.audioEnabled
      ? 1 + (bassInputForCollision * config.interLayerAudioBoost)
      : 1;
    mat.uniforms.uInterLayerEnabled.value = config.interLayerCollisionEnabled && layerIndex <= 3 && !isAux ? 1 : 0;
    mat.uniforms.uInterLayerColliderCount.value = activeInterLayerColliderCount;

    if (activeInterLayerColliderCount > 0) {
      for (let i = 0; i < activeInterLayerColliderCount; i++) {
        const collider = interLayerColliders[i];
        if (!collider) continue;
        const uniformCollider = mat.uniforms.uInterLayerColliders.value[i] as THREE.Vector4;
        uniformCollider.set(collider.center.x, collider.center.y, collider.center.z, collider.radius);
      }
    }

    mat.uniforms.uInterLayerStrength.value = config.interLayerCollisionStrength * collisionAudioBoost;
    mat.uniforms.uInterLayerPadding.value = config.interLayerCollisionPadding;

    // SDF shape + lighting uniforms (per-layer, fallback to global)
    const sdfOn    = layerIndex === 1 ? config.layer1SdfEnabled
                   : layerIndex === 2 ? config.layer2SdfEnabled
                   : layerIndex === 3 ? config.layer3SdfEnabled
                   : config.sdfShapeEnabled;
    const sdfShape = layerIndex === 1 ? config.layer1SdfShape
                   : layerIndex === 2 ? config.layer2SdfShape
                   : layerIndex === 3 ? config.layer3SdfShape
                   : config.sdfShape;
    const sdfLX    = layerIndex === 1 ? config.layer1SdfLightX
                   : layerIndex === 2 ? config.layer2SdfLightX
                   : layerIndex === 3 ? config.layer3SdfLightX
                   : config.sdfLightX;
    const sdfLY    = layerIndex === 1 ? config.layer1SdfLightY
                   : layerIndex === 2 ? config.layer2SdfLightY
                   : layerIndex === 3 ? config.layer3SdfLightY
                   : config.sdfLightY;
    const sdfSpec  = layerIndex === 1 ? config.layer1SdfSpecular
                   : layerIndex === 2 ? config.layer2SdfSpecular
                   : layerIndex === 3 ? config.layer3SdfSpecular
                   : config.sdfSpecularIntensity;
    const sdfShin  = layerIndex === 1 ? config.layer1SdfShininess
                   : layerIndex === 2 ? config.layer2SdfShininess
                   : layerIndex === 3 ? config.layer3SdfShininess
                   : config.sdfSpecularShininess;
    const sdfAmb   = layerIndex === 1 ? config.layer1SdfAmbient
                   : layerIndex === 2 ? config.layer2SdfAmbient
                   : layerIndex === 3 ? config.layer3SdfAmbient
                   : config.sdfAmbientLight;
    mat.uniforms.uSdfEnabled.value = sdfOn ? 1 : 0;
    mat.uniforms.uSdfShape.value   = sdfShape === 'ring' ? 1 : sdfShape === 'star' ? 2 : sdfShape === 'hexagon' ? 3 : 0;
    mat.uniforms.uSdfLight.value.set(sdfLX, sdfLY);
    mat.uniforms.uSdfSpecular.value  = sdfSpec;
    mat.uniforms.uSdfShininess.value = sdfShin;
    mat.uniforms.uSdfAmbient.value   = sdfAmb;

    // Instanced 3D geometry uniforms
    const geomMode3D = layerIndex === 2 ? config.layer2GeomMode3D : layerIndex === 3 ? config.layer3GeomMode3D : 'billboard';
    const geomScale3D = layerIndex === 2 ? config.layer2GeomScale3D : layerIndex === 3 ? config.layer3GeomScale3D : 1.0;
    mat.uniforms.uInstanced3D.value = geomMode3D !== 'billboard' ? 1 : 0;
    mat.uniforms.uInstanced3DScale.value = geomScale3D;

    // Ghost trail uniform sync (L2/L3)
    if (!isAux && ghostMats.length > 0) {
      const ghostEnabled = layerIndex === 2 ? config.layer2GhostTrailEnabled : config.layer3GhostTrailEnabled;
      const ghostCount   = layerIndex === 2 ? config.layer2GhostTrailCount   : config.layer3GhostTrailCount;
      const ghostDt      = layerIndex === 2 ? config.layer2GhostTrailDt      : config.layer3GhostTrailDt;
      const ghostFade    = layerIndex === 2 ? config.layer2GhostTrailFade    : config.layer3GhostTrailFade;
      const mainTime     = mat.uniforms.uTime.value;
      const mainOpacity  = mat.uniforms.uOpacity.value;
      for (let i = 0; i < MAX_GHOST; i++) {
        const gm = ghostMats[i];
        if (ghostEnabled && i < ghostCount) {
          gm.uniforms.uAudioBass.value         = mat.uniforms.uAudioBass.value;
          gm.uniforms.uAudioTreble.value       = mat.uniforms.uAudioTreble.value;
          gm.uniforms.uAudioPulse.value        = mat.uniforms.uAudioPulse.value;
          gm.uniforms.uAudioBassMotion.value   = mat.uniforms.uAudioBassMotion.value;
          gm.uniforms.uAudioTrebleMotion.value = mat.uniforms.uAudioTrebleMotion.value;
          gm.uniforms.uTime.value    = mainTime - (i + 1) * ghostDt;
          gm.uniforms.uOpacity.value = mainOpacity * Math.pow(ghostFade, i + 1);
        } else {
          gm.uniforms.uOpacity.value = 0;
        }
      }
    }
  });

  if (!data) return null;

  const geomMode3D = layerIndex === 2 ? config.layer2GeomMode3D : layerIndex === 3 ? config.layer3GeomMode3D : 'billboard';

  const showLines = !isAux && ((layerIndex === 2 && config.layer2ConnectionEnabled) || (layerIndex === 3 && config.layer3ConnectionEnabled));
  const lineRadius = layerIndex === 2 ? config.sphereRadius * config.layer2RadiusScale : layerIndex === 3 ? config.sphereRadius * config.layer3RadiusScale : config.sphereRadius;
  const connDist = layerIndex === 2 ? config.layer2ConnectionDistance : layerIndex === 3 ? config.layer3ConnectionDistance : 50;
  const connOp = layerIndex === 2 ? config.layer2ConnectionOpacity : layerIndex === 3 ? config.layer3ConnectionOpacity : 0.2;

  return (
    <group>
      <instancedMesh key={geometryKey} ref={meshRef} args={[undefined, undefined, data.count]}>
        {geomMode3D === 'cube' ? (
          <boxGeometry args={[1, 1, 1]}>
            <instancedBufferAttribute attach="attributes-aPosition" args={[data.pos, 3]} />
            <instancedBufferAttribute attach="attributes-aOffset" args={[data.off, 3]} />
            <instancedBufferAttribute attach="attributes-aData1" args={[data.d1, 4]} />
            <instancedBufferAttribute attach="attributes-aData2" args={[data.d2, 4]} />
            <instancedBufferAttribute attach="attributes-aData3" args={[data.d3, 4]} />
          </boxGeometry>
        ) : geomMode3D === 'tetra' ? (
          <tetrahedronGeometry args={[0.7]}>
            <instancedBufferAttribute attach="attributes-aPosition" args={[data.pos, 3]} />
            <instancedBufferAttribute attach="attributes-aOffset" args={[data.off, 3]} />
            <instancedBufferAttribute attach="attributes-aData1" args={[data.d1, 4]} />
            <instancedBufferAttribute attach="attributes-aData2" args={[data.d2, 4]} />
            <instancedBufferAttribute attach="attributes-aData3" args={[data.d3, 4]} />
          </tetrahedronGeometry>
        ) : (
          <planeGeometry args={[1, 1]}>
            <instancedBufferAttribute attach="attributes-aPosition" args={[data.pos, 3]} />
            <instancedBufferAttribute attach="attributes-aOffset" args={[data.off, 3]} />
            <instancedBufferAttribute attach="attributes-aData1" args={[data.d1, 4]} />
            <instancedBufferAttribute attach="attributes-aData2" args={[data.d2, 4]} />
            <instancedBufferAttribute attach="attributes-aData3" args={[data.d3, 4]} />
          </planeGeometry>
        )}
        <shaderMaterial
          key={`mat-${config.backgroundColor}`}
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={getParticleBlendMode(config.backgroundColor)}
        />
      </instancedMesh>
      {showLines && <LineSystem config={config} layerIndex={layerIndex as 2 | 3} particleData={data} uniforms={uniforms} globalRadius={lineRadius} connectionDistance={connDist} connectionOpacity={connOp} contactAmount={contactAmount} isPlaying={isPlaying} />}
      {ghostMats.map((gmat, i) => (
        <instancedMesh key={`ghost-${i}-${geometryKey}`} args={[undefined, undefined, data.count]}>
          <planeGeometry args={[1, 1]}>
            <instancedBufferAttribute attach="attributes-aPosition" args={[data.pos, 3]} />
            <instancedBufferAttribute attach="attributes-aOffset"   args={[data.off, 3]} />
            <instancedBufferAttribute attach="attributes-aData1"    args={[data.d1,  4]} />
            <instancedBufferAttribute attach="attributes-aData2"    args={[data.d2,  4]} />
            <instancedBufferAttribute attach="attributes-aData3"    args={[data.d3,  4]} />
          </planeGeometry>
          <primitive object={gmat} attach="material" />
        </instancedMesh>
      ))}
    </group>
  );
});
ParticleSystem.displayName = 'ParticleSystem';
