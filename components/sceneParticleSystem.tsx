import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';
import { getInterLayerCollidersForLayer, MAX_INTER_LAYER_COLLIDERS } from '../lib/appState';
import { generateParticleData } from './particleData';
import type { AuxMode } from './particleData';
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

export const ParticleSystem: React.FC<{
  config: ParticleConfig;
  layerIndex: 1 | 2 | 3 | 4;
  isAux?: boolean;
  auxMode?: AuxMode;
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number }>;
  isPlaying: boolean;
  contactAmount: number;
}> = ({ config, layerIndex, isAux = false, auxMode = 'aux', audioRef, isPlaying, contactAmount }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const windRef = useRef(new THREE.Vector3());
  const spinRef = useRef(new THREE.Vector3());
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

  const data = useMemo(() => generateParticleData(config, layerIndex, isAux, auxMode), [geometryKey]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uOpacity: { value: config.opacity },
    uColor: { value: new THREE.Color(config.particleColor) },
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
  }), [config.opacity, config.particleColor, config.contrast, config.particleSoftness, config.particleGlow, isAux]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    if (isPlaying) mat.uniforms.uTime.value += delta;
    const bassInput = config.audioEnabled ? audioRef.current.bass * config.audioBeatScale : 0;
    const trebleInput = config.audioEnabled ? audioRef.current.treble * config.audioJitterScale : 0;
    const pulseInput = config.audioEnabled ? audioRef.current.pulse * config.audioPulseScale : 0;
    const morphInput = config.audioEnabled ? audioRef.current.pulse * config.audioMorphScale : 0;
    const shatterInput = config.audioEnabled ? (trebleInput * 0.75 + pulseInput * 0.35) * config.audioShatterScale : 0;
    const twistInput = config.audioEnabled ? (bassInput * 0.6 + pulseInput * 0.9) * config.audioTwistScale : 0;
    const bendInput = config.audioEnabled ? (trebleInput * 0.55 + pulseInput * 0.7) * config.audioBendScale : 0;
    const warpInput = config.audioEnabled ? (bassInput * 0.35 + trebleInput * 0.35 + pulseInput) * config.audioWarpScale : 0;
    if (config.audioEnabled) {
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
      mat.uniforms.uAudioPulse.value = pulseInput;
      mat.uniforms.uAudioMorph.value = morphInput;
      mat.uniforms.uAudioShatter.value = shatterInput;
      mat.uniforms.uAudioTwist.value = twistInput;
      mat.uniforms.uAudioBend.value = bendInput;
      mat.uniforms.uAudioWarp.value = warpInput;
    } else {
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
      mat.uniforms.uAudioPulse.value = 0;
      mat.uniforms.uAudioMorph.value = 0;
      mat.uniforms.uAudioShatter.value = 0;
      mat.uniforms.uAudioTwist.value = 0;
      mat.uniforms.uAudioBend.value = 0;
      mat.uniforms.uAudioWarp.value = 0;
    }

    mat.uniforms.uMouse.value.set(state.pointer.x, state.pointer.y);
    mat.uniforms.uOpacity.value = config.opacity * (isAux ? (auxMode === 'spark' ? 0.85 : 0.7) : 1.0);
    mat.uniforms.uColor.value.set(config.particleColor);
    mat.uniforms.uContrast.value = config.contrast;
    mat.uniforms.uInkMode.value = config.particleColor === 'black' ? 1 : 0;
    mat.uniforms.uSoftness.value = config.particleSoftness;
    const impactGlowBoost = config.interLayerContactFxEnabled && config.interLayerCollisionEnabled ? contactAmount * config.interLayerContactGlowBoost : 0;
    mat.uniforms.uGlow.value = Math.min(3, config.particleGlow + impactGlowBoost);
    mat.uniforms.uIsOrthographic.value = config.viewMode === 'orthographic' ? 1 : 0;

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
    let aff = 1;
    let mf = 0;
    let mr = 100;
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
    let boundY = 0;
    let boundEn = 0;
    let boundBn = 0;

    if (layerIndex === 1) {
      speed = config.pulseSpeed; amp = config.pulseAmplitude; noise = config.jitter; complexity = Math.max(1, config.jitter * 2); freq = config.jitter; rad = config.sphereRadius; size = config.baseSize;
    } else if (layerIndex === 2) {
      speed = config.layer2FlowSpeed; amp = config.layer2FlowAmplitude; freq = config.layer2FlowFrequency; noise = config.layer2NoiseScale; complexity = config.layer2Complexity; evol = config.layer2Evolution; fid = config.layer2Fidelity; oct = config.layer2OctaveMult; rad = config.sphereRadius * config.layer2RadiusScale; size = isAux ? (auxMode === 'spark' ? config.layer2BaseSize * 0.42 : config.layer2BaseSize * 0.6) : config.layer2BaseSize; grav = config.layer2Gravity; resistance = config.layer2Resistance; vis = config.layer2Viscosity; fluid = config.layer2FluidForce; aff = config.layer2AffectPos; moveWithWind = config.layer2MoveWithWind; neighborForce = config.layer2InteractionNeighbor; collisionMode = config.layer2CollisionMode === 'world' ? 1 : 0; collisionRadius = config.layer2CollisionRadius; repulsion = config.layer2Repulsion; trail = isAux && auxMode === 'spark' ? Math.max(config.layer2Trail, 0.85) : config.layer2Trail; life = config.layer2Life; lifeSpread = config.layer2LifeSpread; lifeSizeBoost = config.layer2LifeSizeBoost; lifeSizeTaper = config.layer2LifeSizeTaper; burst = isAux && auxMode === 'spark' ? Math.max(config.layer2Burst, config.layer2SparkBurst) : config.layer2Burst; burstPhase = config.layer2BurstPhase; burstMode = getBurstModeValue(config.layer2BurstMode); burstWaveform = getBurstWaveformValue(config.layer2BurstWaveform); burstSweepSpeed = config.layer2BurstSweepSpeed; burstSweepTilt = config.layer2BurstSweepTilt; burstConeWidth = config.layer2BurstConeWidth; emitterOrbitSpeed = config.layer2EmitterOrbitSpeed; emitterOrbitRadius = config.layer2EmitterOrbitRadius; emitterPulseAmount = config.layer2EmitterPulseAmount; trailDrag = config.layer2TrailDrag; trailTurbulence = config.layer2TrailTurbulence; trailDrift = config.layer2TrailDrift; velocityGlow = config.layer2VelocityGlow; velocityAlpha = config.layer2VelocityAlpha; flickerAmount = config.layer2FlickerAmount; flickerSpeed = config.layer2FlickerSpeed; streak = isAux && auxMode === 'spark' ? Math.max(config.layer2Streak, 1.2) : config.layer2Streak; spriteMode = isAux && auxMode === 'spark' ? getSpriteModeValue('spark') : getSpriteModeValue(config.layer2SpriteMode); auxLife = auxMode === 'spark' ? config.layer2SparkLife : config.layer2AuxLife; mf = config.layer2MouseForce; mr = config.layer2MouseRadius; wind.set(config.layer2WindX, config.layer2WindY, config.layer2WindZ); spin.set(config.layer2SpinX, config.layer2SpinY, config.layer2SpinZ); boundY = config.layer2BoundaryY; boundEn = config.layer2BoundaryEnabled ? 1 : 0; boundBn = config.layer2BoundaryBounce;
    } else if (layerIndex === 3) {
      speed = config.layer3FlowSpeed; amp = config.layer3FlowAmplitude; freq = config.layer3FlowFrequency; noise = config.layer3NoiseScale; complexity = config.layer3Complexity; evol = config.layer3Evolution; fid = config.layer3Fidelity; oct = config.layer3OctaveMult; rad = config.sphereRadius * config.layer3RadiusScale; size = isAux ? (auxMode === 'spark' ? config.layer3BaseSize * 0.36 : config.layer3BaseSize * 0.6) : config.layer3BaseSize; grav = config.layer3Gravity; resistance = config.layer3Resistance; vis = config.layer3Viscosity; fluid = config.layer3FluidForce; aff = config.layer3AffectPos; moveWithWind = config.layer3MoveWithWind; neighborForce = config.layer3InteractionNeighbor; collisionMode = config.layer3CollisionMode === 'world' ? 1 : 0; collisionRadius = config.layer3CollisionRadius; repulsion = config.layer3Repulsion; trail = isAux && auxMode === 'spark' ? Math.max(config.layer3Trail, 0.9) : config.layer3Trail; life = config.layer3Life; lifeSpread = config.layer3LifeSpread; lifeSizeBoost = config.layer3LifeSizeBoost; lifeSizeTaper = config.layer3LifeSizeTaper; burst = isAux && auxMode === 'spark' ? Math.max(config.layer3Burst, config.layer3SparkBurst) : config.layer3Burst; burstPhase = config.layer3BurstPhase; burstMode = getBurstModeValue(config.layer3BurstMode); burstWaveform = getBurstWaveformValue(config.layer3BurstWaveform); burstSweepSpeed = config.layer3BurstSweepSpeed; burstSweepTilt = config.layer3BurstSweepTilt; burstConeWidth = config.layer3BurstConeWidth; emitterOrbitSpeed = config.layer3EmitterOrbitSpeed; emitterOrbitRadius = config.layer3EmitterOrbitRadius; emitterPulseAmount = config.layer3EmitterPulseAmount; trailDrag = config.layer3TrailDrag; trailTurbulence = config.layer3TrailTurbulence; trailDrift = config.layer3TrailDrift; velocityGlow = config.layer3VelocityGlow; velocityAlpha = config.layer3VelocityAlpha; flickerAmount = config.layer3FlickerAmount; flickerSpeed = config.layer3FlickerSpeed; streak = isAux && auxMode === 'spark' ? Math.max(config.layer3Streak, 1.25) : config.layer3Streak; spriteMode = isAux && auxMode === 'spark' ? getSpriteModeValue('spark') : getSpriteModeValue(config.layer3SpriteMode); auxLife = auxMode === 'spark' ? config.layer3SparkLife : config.layer3AuxLife; mf = config.layer3MouseForce; mr = config.layer3MouseRadius; wind.set(config.layer3WindX, config.layer3WindY, config.layer3WindZ); spin.set(config.layer3SpinX, config.layer3SpinY, config.layer3SpinZ); boundY = config.layer3BoundaryY; boundEn = config.layer3BoundaryEnabled ? 1 : 0; boundBn = config.layer3BoundaryBounce;
    } else {
      speed = config.ambientSpeed; amp = config.ambientSpread; size = config.ambientBaseSize; rad = config.ambientSpread;
    }

    mat.uniforms.uGlobalSpeed.value = speed; mat.uniforms.uGlobalAmp.value = amp; mat.uniforms.uGlobalFreq.value = freq; mat.uniforms.uGlobalNoiseScale.value = noise; mat.uniforms.uGlobalComplexity.value = complexity; mat.uniforms.uGlobalEvolution.value = evol; mat.uniforms.uGlobalFidelity.value = fid; mat.uniforms.uGlobalOctaveMult.value = oct; mat.uniforms.uGlobalRadius.value = rad;
    const impactSizeBoost = config.interLayerContactFxEnabled && config.interLayerCollisionEnabled ? 1 + contactAmount * config.interLayerContactSizeBoost : 1;
    mat.uniforms.uGlobalSize.value = size * impactSizeBoost;
    mat.uniforms.uGravity.value = grav; mat.uniforms.uViscosity.value = vis; mat.uniforms.uFluidForce.value = fluid; mat.uniforms.uResistance.value = resistance; mat.uniforms.uMoveWithWind.value = moveWithWind; mat.uniforms.uNeighborForce.value = neighborForce; mat.uniforms.uCollisionMode.value = collisionMode; mat.uniforms.uCollisionRadius.value = collisionRadius; mat.uniforms.uRepulsion.value = repulsion; mat.uniforms.uTrail.value = trail; mat.uniforms.uLife.value = life; mat.uniforms.uLifeSpread.value = lifeSpread; mat.uniforms.uLifeSizeBoost.value = lifeSizeBoost; mat.uniforms.uLifeSizeTaper.value = lifeSizeTaper; mat.uniforms.uBurst.value = burst; mat.uniforms.uBurstPhase.value = burstPhase; mat.uniforms.uBurstMode.value = burstMode; mat.uniforms.uBurstWaveform.value = burstWaveform; mat.uniforms.uBurstSweepSpeed.value = burstSweepSpeed; mat.uniforms.uBurstSweepTilt.value = burstSweepTilt; mat.uniforms.uBurstConeWidth.value = burstConeWidth; mat.uniforms.uEmitterOrbitSpeed.value = emitterOrbitSpeed; mat.uniforms.uEmitterOrbitRadius.value = emitterOrbitRadius; mat.uniforms.uEmitterPulseAmount.value = emitterPulseAmount; mat.uniforms.uTrailDrag.value = trailDrag; mat.uniforms.uTrailTurbulence.value = trailTurbulence; mat.uniforms.uTrailDrift.value = trailDrift; mat.uniforms.uVelocityGlow.value = velocityGlow; mat.uniforms.uVelocityAlpha.value = velocityAlpha; mat.uniforms.uFlickerAmount.value = flickerAmount; mat.uniforms.uFlickerSpeed.value = flickerSpeed; mat.uniforms.uStreak.value = streak; mat.uniforms.uSpriteMode.value = spriteMode; mat.uniforms.uAuxLife.value = auxLife; mat.uniforms.uIsAux.value = isAux ? 1 : 0; mat.uniforms.uAffectPos.value = aff; mat.uniforms.uMouseForce.value = mf; mat.uniforms.uMouseRadius.value = mr; mat.uniforms.uWind.value.copy(wind); mat.uniforms.uSpin.value.copy(spin); mat.uniforms.uBoundaryY.value = boundY; mat.uniforms.uBoundaryEnabled.value = boundEn; mat.uniforms.uBoundaryBounce.value = boundBn;
    const collisionAudioBoost = config.interLayerAudioReactive && config.audioEnabled ? 1 + (bassInput * config.interLayerAudioBoost) : 1;
    mat.uniforms.uInterLayerEnabled.value = config.interLayerCollisionEnabled && layerIndex <= 3 && !isAux ? 1 : 0;
    mat.uniforms.uInterLayerColliderCount.value = activeInterLayerColliderCount;
    interLayerColliders.forEach((collider, colliderIndex) => {
      const uniformCollider = mat.uniforms.uInterLayerColliders.value[colliderIndex] as THREE.Vector4;
      uniformCollider.set(collider.center.x, collider.center.y, collider.center.z, collider.radius);
    });
    mat.uniforms.uInterLayerStrength.value = config.interLayerCollisionStrength * collisionAudioBoost;
    mat.uniforms.uInterLayerPadding.value = config.interLayerCollisionPadding;
  });

  if (!data) return null;
  const showLines = !isAux && ((layerIndex === 2 && config.layer2ConnectionEnabled) || (layerIndex === 3 && config.layer3ConnectionEnabled));
  const lineRadius = layerIndex === 2 ? config.sphereRadius * config.layer2RadiusScale : layerIndex === 3 ? config.sphereRadius * config.layer3RadiusScale : config.sphereRadius;
  const connDist = layerIndex === 2 ? config.layer2ConnectionDistance : layerIndex === 3 ? config.layer3ConnectionDistance : 50;
  const connOp = layerIndex === 2 ? config.layer2ConnectionOpacity : layerIndex === 3 ? config.layer3ConnectionOpacity : 0.2;

  return (
    <group>
      <instancedMesh key={geometryKey} ref={meshRef} args={[undefined, undefined, data.count]}>
        <planeGeometry args={[1, 1]}>
          <instancedBufferAttribute attach="attributes-aPosition" args={[data.pos, 3]} />
          <instancedBufferAttribute attach="attributes-aOffset" args={[data.off, 3]} />
          <instancedBufferAttribute attach="attributes-aData1" args={[data.d1, 4]} />
          <instancedBufferAttribute attach="attributes-aData2" args={[data.d2, 4]} />
          <instancedBufferAttribute attach="attributes-aData3" args={[data.d3, 4]} />
        </planeGeometry>
        <shaderMaterial
          key={`mat-${config.particleColor}`}
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={getParticleBlendMode(config.particleColor)}
        />
      </instancedMesh>
      {showLines && <LineSystem config={config} layerIndex={layerIndex as 2 | 3} particleData={data} uniforms={uniforms} globalRadius={lineRadius} connectionDistance={connDist} connectionOpacity={connOp} contactAmount={contactAmount} isPlaying={isPlaying} />}
    </group>
  );
};
