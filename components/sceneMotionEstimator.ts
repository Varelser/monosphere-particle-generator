import * as THREE from 'three';
import type { ParticleConfig } from '../types';
import { getMotionGroupIndexByValue } from './motionCatalog';
import { MOTION_MAP } from './sceneMotionMap';
import type { ParticleData } from './particleData';

function fract(value: number) {
  return value - Math.floor(value);
}

function pseudoNoise3(x: number, y: number, z: number) {
  return fract(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453);
}

function signedNoise3(x: number, y: number, z: number) {
  return pseudoNoise3(x, y, z) * 2 - 1;
}

function noiseVec3(target: THREE.Vector3, seed: THREE.Vector3) {
  target.set(
    signedNoise3(seed.x + 13.4, seed.y + 7.1, seed.z + 3.7),
    signedNoise3(seed.x + 2.8, seed.y + 17.5, seed.z + 11.9),
    signedNoise3(seed.x + 19.2, seed.y + 5.3, seed.z + 23.1),
  );
  return target;
}

type LayerEstimateArgs = {
  config: ParticleConfig;
  layerIndex: 2 | 3;
  particleData: ParticleData;
  index: number;
  globalRadius: number;
  time: number;
};

const tempSeed = new THREE.Vector3();
const tempNoise = new THREE.Vector3();
const tempDir = new THREE.Vector3();
const tempMotion = new THREE.Vector3();
const tempWindDir = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);
const xAxis = new THREE.Vector3(1, 0, 0);
const yAxis = new THREE.Vector3(0, 1, 0);
const zAxis = new THREE.Vector3(0, 0, 1);

function applySpecificMotionEstimate(
  target: THREE.Vector3,
  source: THREE.Vector3,
  motionType: number,
  timePhase: number,
  amp: number,
  freq: number,
  phase: number,
  rnd: number,
  variant: number,
) {
  if (motionType === MOTION_MAP.orbit) {
    const radial = Math.max(1, Math.hypot(source.x, source.z));
    const angle = Math.atan2(source.z, source.x) + timePhase * 0.35;
    target.set(
      Math.cos(angle) * radial,
      source.y,
      Math.sin(angle) * radial,
    );
    return true;
  }
  if (motionType === MOTION_MAP.spiral_motion) {
    const spiralAngle = Math.atan2(source.z, source.x) + timePhase * 0.75;
    const spiralRadius = Math.max(1, Math.hypot(source.x, source.z)) + Math.sin(timePhase + source.y * 0.02) * amp * 0.12;
    target.set(
      Math.cos(spiralAngle) * spiralRadius,
      source.y,
      Math.sin(spiralAngle) * spiralRadius,
    );
    return true;
  }
  if (motionType === MOTION_MAP.helix) {
    target.copy(source).applyAxisAngle(new THREE.Vector3(1, 1, 0).normalize(), timePhase * 0.55 + phase);
    return true;
  }
  if (motionType === MOTION_MAP.lorenz) {
    const x = source.x * 0.01;
    const y = source.y * 0.01;
    const z = source.z * 0.01;
    target.set(
      source.x + 10 * (y - x) * amp * 0.002,
      source.y + (x * (28 - z) - y) * amp * 0.002,
      source.z + (x * y - (8 / 3) * z) * amp * 0.002,
    );
    return true;
  }
  if (motionType === MOTION_MAP.aizawa) {
    const x = source.x * 0.01;
    const y = source.y * 0.01;
    const z = source.z * 0.01;
    target.set(
      source.x + (((z - 0.7) * x - 3.5 * y) * amp * 0.002),
      source.y + ((3.5 * x + (z - 0.7) * y) * amp * 0.002),
      source.z + ((0.6 + 0.95 * z - (Math.pow(z, 3) / 3) - (x * x + y * y) * (1 + 0.25 * z)) * amp * 0.002),
    );
    return true;
  }
  if (motionType === MOTION_MAP.rossler) {
    const x = source.x * 0.01;
    const y = source.y * 0.01;
    const z = source.z * 0.01;
    target.set(
      source.x + (-y - z) * amp * 0.003,
      source.y + (x + 0.2 * y) * amp * 0.003,
      source.z + (0.2 + z * (x - 5.7)) * amp * 0.003,
    );
    return true;
  }
  if (motionType === MOTION_MAP.thomas) {
    target.set(
      source.x + (Math.sin(source.y * 0.01) - 0.2 * source.x * 0.01) * amp * 0.3,
      source.y + (Math.sin(source.z * 0.01) - 0.2 * source.y * 0.01) * amp * 0.3,
      source.z + (Math.sin(source.x * 0.01) - 0.2 * source.z * 0.01) * amp * 0.3,
    );
    return true;
  }
  if (motionType === MOTION_MAP.lissajous) {
    target.set(
      Math.sin(timePhase * 1.7 + phase + source.y * 0.02) * amp * 0.55 + source.x * 0.35,
      Math.sin(timePhase * 2.3 + phase * 1.3 + source.z * 0.02) * amp * 0.45 + source.y * 0.2,
      Math.sin(timePhase * 2.9 + phase * 0.7 + source.x * 0.02) * amp * 0.55 + source.z * 0.35,
    );
    return true;
  }
  if (motionType === MOTION_MAP.toroidal) {
    const torusAngle = Math.atan2(source.z, source.x) + timePhase * 0.55;
    const torusMinor = Math.sin(timePhase * 1.4 + phase + source.y * 0.03) * amp * 0.18;
    const torusMajor = Math.max(10, Math.hypot(source.x, source.z) + amp * 0.12);
    target.set(
      Math.cos(torusAngle) * (torusMajor + Math.cos(timePhase + phase) * torusMinor),
      source.y + Math.sin(torusAngle * 2 + timePhase * 1.2) * amp * 0.22,
      Math.sin(torusAngle) * (torusMajor + Math.sin(timePhase + phase) * torusMinor),
    );
    return true;
  }
  if (motionType === MOTION_MAP.pendulum) {
    target.set(
      source.x + Math.sin(timePhase * 1.5 + phase) * amp * 0.3,
      source.y + Math.cos(timePhase * 2.1 + phase + source.x * 0.015) * amp * 0.42,
      source.z + Math.sin(timePhase * 1.1 + phase * 0.6) * amp * 0.18,
    );
    return true;
  }
  if (motionType === MOTION_MAP.lattice) {
    const cell = Math.max(6, amp * 0.14);
    target.set(
      Math.round(source.x / cell) * cell,
      Math.round(source.y / cell) * cell,
      Math.round(source.z / cell) * cell,
    ).lerp(source, 0.72);
    return true;
  }
  if (motionType === MOTION_MAP.epicycle) {
    const baseAngle = Math.atan2(source.z, source.x);
    const majorRadius = Math.hypot(source.x, source.z) * 0.75 + amp * 0.22;
    const minorRadius = amp * 0.18 + 8;
    const epicycleAngle = timePhase * 1.4 + phase * 1.7;
    target.set(
      Math.cos(baseAngle + timePhase * 0.55) * majorRadius + Math.cos(epicycleAngle) * minorRadius,
      source.y + Math.sin(timePhase * 1.9 + phase + baseAngle * 2) * amp * 0.2,
      Math.sin(baseAngle + timePhase * 0.55) * majorRadius + Math.sin(epicycleAngle) * minorRadius,
    );
    return true;
  }
  if (motionType === MOTION_MAP.ripple_ring) {
    const radial = Math.hypot(source.x, source.z);
    const ring = Math.sin(radial * Math.max(0.02, freq * 0.08) - timePhase * 3.2 + phase);
    target.copy(source);
    tempDir.set(source.x, 0, source.z).normalize();
    target.addScaledVector(tempDir, ring * amp * 0.26);
    target.y += Math.cos(radial * 0.04 - timePhase * 2.2 + phase) * amp * 0.18;
    return true;
  }
  if (motionType === MOTION_MAP.kaleidoscope) {
    const sectorCount = 6;
    const sectorAngle = (Math.PI * 2) / sectorCount;
    const angle = Math.atan2(source.z, source.x) + timePhase * 0.45;
    const mirrored = Math.abs(((angle % sectorAngle) + sectorAngle) % sectorAngle - sectorAngle * 0.5);
    const radius = Math.hypot(source.x, source.z) + Math.sin(timePhase + phase) * amp * 0.14;
    target.set(
      Math.cos(mirrored) * radius,
      source.y,
      Math.sin(mirrored) * radius * Math.sign(Math.cos(angle * sectorCount) || 1),
    );
    return true;
  }
  if (motionType === MOTION_MAP.braid) {
    const braidPhase = timePhase * 1.25 + source.y * 0.035 + phase;
    target.set(
      Math.sin(braidPhase) * amp * 0.32 + Math.sin(braidPhase * 2) * amp * 0.08,
      source.y + Math.sin(timePhase * 0.9 + phase) * amp * 0.08,
      Math.cos(braidPhase) * amp * 0.32 - Math.cos(braidPhase * 2) * amp * 0.08,
    );
    return true;
  }
  if (motionType === MOTION_MAP.web) {
    target.copy(source);
    tempDir.set(Math.sign(source.x || 1), Math.sign(source.y || 1), Math.sign(source.z || 1)).normalize();
    target.lerp(tempDir.multiplyScalar(source.length() * 0.85), 0.24);
    return true;
  }
  if (motionType === MOTION_MAP.pulse_shell) {
    const shellRadius = source.length() + Math.sin(source.length() * 0.05 - timePhase * 2.4 + phase) * amp * 0.22;
    target.copy(source).normalize().multiplyScalar(shellRadius);
    return true;
  }
  if (motionType === MOTION_MAP.mandala) {
    const angle = Math.atan2(source.z, source.x) + timePhase * 0.38;
    const radius = Math.hypot(source.x, source.z) + Math.cos(angle * 8) * amp * 0.16;
    target.set(
      Math.cos(angle) * radius,
      source.y + Math.sin(angle * 4 + timePhase) * amp * 0.18,
      Math.sin(angle) * radius,
    );
    return true;
  }
  if (motionType === MOTION_MAP.ribbon) {
    const ribbonPhase = timePhase * 1.35 + phase + source.y * 0.02;
    target.set(
      Math.sin(ribbonPhase) * amp * 0.28,
      source.y + Math.sin(ribbonPhase * 1.8) * amp * 0.14,
      Math.cos(ribbonPhase * 0.7) * amp * 0.34,
    );
    return true;
  }
  if (motionType === MOTION_MAP.spokes) {
    const spokeAngle = Math.atan2(source.z, source.x);
    const snapped = Math.round(spokeAngle / 0.52359877559) * 0.52359877559;
    const spokeRadius = Math.hypot(source.x, source.z) + Math.sin(timePhase * 1.4 + phase) * amp * 0.12;
    target.set(
      Math.cos(snapped) * spokeRadius,
      source.y,
      Math.sin(snapped) * spokeRadius,
    );
    return true;
  }
  if (motionType === MOTION_MAP.breathing) {
    const breathe = 1 + Math.sin(timePhase * 1.6 + phase + source.length() * 0.02) * 0.22;
    target.copy(source).multiplyScalar(breathe);
    return true;
  }
  if (motionType === MOTION_MAP.torus_knot) {
    const knotAngle = Math.atan2(source.z, source.x) + timePhase * 0.65;
    const knotRadius = Math.hypot(source.x, source.z) * 0.55 + amp * 0.12;
    const knotWave = Math.cos(knotAngle * 3 - timePhase * 1.1 + phase) * amp * 0.18;
    target.set(
      Math.cos(knotAngle * 2) * (knotRadius + knotWave),
      source.y + Math.sin(knotAngle * 3 + timePhase * 1.3) * amp * 0.2,
      Math.sin(knotAngle * 2) * (knotRadius - knotWave),
    );
    return true;
  }
  if (motionType === MOTION_MAP.cellular) {
    const cell = Math.max(10, amp * 0.12);
    const x = (source.x) / cell;
    const y = (source.y) / cell;
    const z = (source.z) / cell;
    target.set(
      Math.floor(x) * cell + Math.sign((x % 1) - 0.5 || 1) * Math.max(2, amp * 0.04),
      Math.floor(y) * cell + Math.sign((y % 1) - 0.5 || 1) * Math.max(2, amp * 0.04),
      Math.floor(z) * cell + Math.sign((z % 1) - 0.5 || 1) * Math.max(2, amp * 0.04),
    );
    return true;
  }
  if (motionType === MOTION_MAP.cyclone) {
    target.copy(source).applyAxisAngle(new THREE.Vector3(0.2, 1, 0.15).normalize(), timePhase * 0.9 + Math.hypot(source.x, source.z) * 0.002);
    target.y += Math.sin(Math.hypot(source.x, source.z) * 0.04 - timePhase * 2 + phase) * amp * 0.18;
    return true;
  }
  if (motionType === MOTION_MAP.nebula) {
    target.copy(source);
    tempNoise.set(
      Math.sin(timePhase * 0.8 + phase + source.z * 0.01),
      Math.cos(timePhase * 0.6 + rnd * 5 + source.x * 0.01),
      Math.sin(timePhase * 1.1 + variant * 7 + source.y * 0.01),
    );
    target.addScaledVector(tempNoise, amp * 0.24);
    return true;
  }
  if (motionType === MOTION_MAP.monolith) {
    const cell = Math.max(14, amp * 0.18);
    target.set(
      Math.round(source.x / cell) * cell,
      Math.round(source.y / (cell * 1.6)) * (cell * 1.6),
      Math.round(source.z / cell) * cell,
    ).lerp(source, 0.35);
    return true;
  }

  return false;
}

export function estimateLayerPositionApprox({
  config,
  layerIndex,
  particleData,
  index,
  globalRadius,
  time,
}: LayerEstimateArgs) {
  const phase = particleData.d1[index * 4 + 0] ?? 0;
  const rnd = particleData.d1[index * 4 + 1] ?? 0;
  const motionType = Math.round(particleData.d1[index * 4 + 2] ?? 0);
  const radiusScale = particleData.d1[index * 4 + 3] ?? 1;
  const speedMult = particleData.d2[index * 4 + 0] ?? 1;
  const ampMult = particleData.d2[index * 4 + 1] ?? 1;
  const freqMult = particleData.d2[index * 4 + 2] ?? 1;
  const lifeJitter = particleData.d3[index * 4 + 1] ?? 0;
  const variant = particleData.d3[index * 4 + 2] ?? 0;
  const spawnOffset = particleData.d3[index * 4 + 0] ?? 0;

  const base = new THREE.Vector3(
    particleData.pos[index * 3 + 0] * radiusScale * globalRadius,
    particleData.pos[index * 3 + 1] * radiusScale * globalRadius,
    particleData.pos[index * 3 + 2] * radiusScale * globalRadius,
  );
  const offset = new THREE.Vector3(
    particleData.off[index * 3 + 0],
    particleData.off[index * 3 + 1],
    particleData.off[index * 3 + 2],
  );

  const isLayer2 = layerIndex === 2;
  const speed = (isLayer2 ? config.layer2FlowSpeed : config.layer3FlowSpeed) * speedMult;
  const amp = (isLayer2 ? config.layer2FlowAmplitude : config.layer3FlowAmplitude) * ampMult;
  const freq = (isLayer2 ? config.layer2FlowFrequency : config.layer3FlowFrequency) * freqMult;
  const noiseScale = isLayer2 ? config.layer2NoiseScale : config.layer3NoiseScale;
  const evolution = isLayer2 ? config.layer2Evolution : config.layer3Evolution;
  const complexity = isLayer2 ? config.layer2Complexity : config.layer3Complexity;
  const fluidForce = isLayer2 ? config.layer2FluidForce : config.layer3FluidForce;
  const viscosity = isLayer2 ? config.layer2Viscosity : config.layer3Viscosity;
  const fidelity = isLayer2 ? config.layer2Fidelity : config.layer3Fidelity;
  const octaveMult = isLayer2 ? config.layer2OctaveMult : config.layer3OctaveMult;
  const affectPos = isLayer2 ? config.layer2AffectPos : config.layer3AffectPos;
  const resistance = isLayer2 ? config.layer2Resistance : config.layer3Resistance;
  const moveWithWind = isLayer2 ? config.layer2MoveWithWind : config.layer3MoveWithWind;
  const neighborForce = isLayer2 ? config.layer2InteractionNeighbor : config.layer3InteractionNeighbor;
  const collisionMode = isLayer2 ? config.layer2CollisionMode : config.layer3CollisionMode;
  const collisionRadius = isLayer2 ? config.layer2CollisionRadius : config.layer3CollisionRadius;
  const repulsion = isLayer2 ? config.layer2Repulsion : config.layer3Repulsion;
  const gravity = isLayer2 ? config.layer2Gravity : config.layer3Gravity;
  const boundaryY = isLayer2 ? config.layer2BoundaryY : config.layer3BoundaryY;
  const boundaryEnabled = isLayer2 ? config.layer2BoundaryEnabled : config.layer3BoundaryEnabled;
  const boundaryBounce = isLayer2 ? config.layer2BoundaryBounce : config.layer3BoundaryBounce;
  const burst = isLayer2 ? config.layer2Burst : config.layer3Burst;
  const burstPhase = isLayer2 ? config.layer2BurstPhase : config.layer3BurstPhase;
  const life = isLayer2 ? config.layer2Life : config.layer3Life;
  const lifeSpread = isLayer2 ? config.layer2LifeSpread : config.layer3LifeSpread;
  const trailDrag = isLayer2 ? config.layer2TrailDrag : config.layer3TrailDrag;
  const trailTurbulence = isLayer2 ? config.layer2TrailTurbulence : config.layer3TrailTurbulence;
  const trailDrift = isLayer2 ? config.layer2TrailDrift : config.layer3TrailDrift;
  const orbitSpeed = isLayer2 ? config.layer2EmitterOrbitSpeed : config.layer3EmitterOrbitSpeed;
  const orbitRadius = isLayer2 ? config.layer2EmitterOrbitRadius : config.layer3EmitterOrbitRadius;
  const emitterPulseAmount = isLayer2 ? config.layer2EmitterPulseAmount : config.layer3EmitterPulseAmount;
  const spinX = isLayer2 ? config.layer2SpinX : config.layer3SpinX;
  const spinY = isLayer2 ? config.layer2SpinY : config.layer3SpinY;
  const spinZ = isLayer2 ? config.layer2SpinZ : config.layer3SpinZ;
  const wind = new THREE.Vector3(
    isLayer2 ? config.layer2WindX : config.layer3WindX,
    isLayer2 ? config.layer2WindY : config.layer3WindY,
    isLayer2 ? config.layer2WindZ : config.layer3WindZ,
  );

  const orbitPhase = time * Math.max(0, orbitSpeed);
  const emitterPulse = 1 + Math.sin(time * Math.max(0.05, orbitSpeed || 0.5) * 1.6 + phase) * emitterPulseAmount;
  const animatedOffset = offset.clone().multiplyScalar(emitterPulse).applyAxisAngle(upAxis, orbitPhase);
  animatedOffset.add(new THREE.Vector3(
    Math.cos(orbitPhase) * orbitRadius,
    Math.sin(orbitPhase * 0.5) * orbitRadius * 0.25,
    Math.sin(orbitPhase) * orbitRadius,
  ));

  const position = base.clone().add(animatedOffset);
  const group = getMotionGroupIndexByValue(motionType);
  const timePhase = time * (0.4 + speed * 18) + phase * 0.5 + spawnOffset * Math.PI * 2;

  tempMotion.copy(position);
  tempSeed.set(
    position.x * 0.012 * noiseScale + timePhase * 0.3 * evolution,
    position.y * 0.012 * noiseScale + phase,
    position.z * 0.012 * noiseScale + rnd * 9 + timePhase * 0.23,
  );

  if (applySpecificMotionEstimate(tempMotion, position, motionType, timePhase, amp, freq, phase, rnd, variant)) {
    // motion-specific override applied
  } else if (group === 0) {
    noiseVec3(tempNoise, tempSeed);
    tempDir.copy(wind).multiplyScalar(0.08);
    tempMotion.addScaledVector(tempNoise, amp * 0.22 * (0.35 + fluidForce * 0.08));
    tempMotion.addScaledVector(tempDir, amp * 0.08);
    tempMotion.applyAxisAngle(upAxis, tempNoise.x * 0.35 + timePhase * 0.08);
  } else if (group === 1) {
    const x = position.x * 0.01;
    const y = position.y * 0.01;
    const z = position.z * 0.01;
    tempMotion.set(
      Math.sin((y - z) * (0.7 + complexity * 0.05) + timePhase),
      Math.sin((z - x) * (0.9 + fidelity * 0.08) + timePhase * 0.9),
      Math.sin((x - y) * (0.8 + octaveMult * 0.04) + timePhase * 1.1),
    );
    tempMotion.multiplyScalar(amp * 0.3);
    tempMotion.add(position);
  } else if (group === 2) {
    const radial = Math.max(1, Math.hypot(position.x, position.z));
    const angle = Math.atan2(position.z, position.x) + timePhase * (0.35 + freq * 0.02);
    const helixY = Math.sin(timePhase * 0.7 + rnd * 6) * amp * 0.18;
    tempMotion.set(
      Math.cos(angle) * radial,
      position.y + helixY,
      Math.sin(angle) * radial,
    );
    tempMotion.addScaledVector(position.clone().normalize(), amp * 0.08 * Math.sin(timePhase * 1.3 + variant * 4));
  } else if (group === 3) {
    const sx = Math.sin(timePhase * (1.0 + rnd) + position.y * 0.01 * freq);
    const sy = Math.sin(timePhase * (1.3 + variant) + position.z * 0.01 * octaveMult);
    const sz = Math.cos(timePhase * (0.8 + lifeJitter) + position.x * 0.01 * complexity);
    tempMotion.set(sx, sy, sz).multiplyScalar(amp * 0.26).add(position);
  } else if (group === 4) {
    const cell = Math.max(10, 80 - freq * 0.3);
    tempMotion.set(
      Math.round(position.x / cell) * cell,
      Math.round(position.y / cell) * cell,
      Math.round(position.z / cell) * cell,
    );
    tempMotion.lerp(position, 0.55 + Math.sin(timePhase + variant * 5) * 0.1);
  } else if (group === 5) {
    tempDir.copy(position).normalize();
    const pulse = Math.sin(timePhase * (0.9 + speed * 4)) * amp * 0.32;
    tempMotion.addScaledVector(tempDir, pulse);
    tempMotion.y += Math.cos(timePhase * 0.7 + phase) * amp * 0.09;
  } else {
    const shear = Math.sin(timePhase * 0.8 + rnd * 4) * amp * 0.12;
    tempMotion.set(
      position.x + position.y * 0.08 * shear,
      position.y + Math.sin(position.x * 0.01 * freq + timePhase) * amp * 0.08,
      position.z + position.x * 0.08 * shear,
    );
  }

  position.lerp(tempMotion, THREE.MathUtils.clamp(affectPos, 0, 1));
  position.addScaledVector(wind, moveWithWind * time * 0.025);
  position.y -= gravity * 0.01 * time;

  if (neighborForce !== 0) {
    noiseVec3(tempNoise, tempSeed.multiplyScalar(1.7));
    tempNoise.normalize();
    position.addScaledVector(tempNoise, neighborForce * 0.12);
  }

  if (collisionMode === 'world') {
    const worldRadius = Math.max(1, collisionRadius);
    const len = position.length();
    if (len > worldRadius) {
      tempDir.copy(position).normalize();
      position.copy(tempDir.multiplyScalar(worldRadius).addScaledVector(tempDir, -repulsion * 0.01));
    }
  }

  if (boundaryEnabled && position.y < boundaryY) {
    position.y = THREE.MathUtils.lerp(boundaryY, boundaryY + Math.abs(position.y - boundaryY) * Math.max(0, boundaryBounce), 0.75);
  }

  const particleLife = Math.max(4, life * (1 + lifeSpread * (lifeJitter * 2 - 1)));
  const lifeProgress = (((time * 60) / particleLife) + spawnOffset + burstPhase) % 1;
  const burstEnvelope = 1 - THREE.MathUtils.smoothstep(lifeProgress, 0, 0.32);
  tempDir.copy(position).normalize();
  position.addScaledVector(tempDir, burst * burstEnvelope * globalRadius * 0.08 * (0.5 + variant));
  noiseVec3(tempNoise, tempSeed.set(position.x * 0.01, position.y * 0.01, position.z * 0.01 + timePhase));
  position.addScaledVector(tempNoise, trailTurbulence * 6 * burstEnvelope);
  tempWindDir.copy(wind);
  if (tempWindDir.lengthSq() > 0.000001) {
    tempWindDir.normalize();
    position.addScaledVector(tempWindDir, trailDrift * 18 * burstEnvelope);
  }
  position.lerp(base.clone().add(animatedOffset), THREE.MathUtils.clamp(trailDrag * 0.16, 0, 0.65));

  if (spinX !== 0) position.applyAxisAngle(xAxis, spinX * time);
  if (spinY !== 0) position.applyAxisAngle(yAxis, spinY * time);
  if (spinZ !== 0) position.applyAxisAngle(zAxis, spinZ * time);

  position.multiplyScalar(Math.max(0, 1 - resistance * 0.025));
  return position;
}
