import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';
import { ParticleData, getSpatialCellKey } from './particleData';
import { estimateLayerPositionApprox } from './sceneMotionEstimator';
import { LINE_FRAGMENT_SHADER, LINE_VERTEX_SHADER } from './sceneShaders';
import { getLineBlendMode, ShaderUniformMap } from './sceneShared';

function getLineRefreshInterval(quality: ParticleConfig['renderQuality'], particleCount: number) {
  if (quality === 'draft') return particleCount > 12000 ? 0.4 : 0.3;
  if (quality === 'cinematic') return particleCount > 18000 ? 0.2 : 0.14;
  return particleCount > 12000 ? 0.28 : 0.2;
}

function getLineBudget(quality: ParticleConfig['renderQuality'], particleCount: number) {
  if (quality === 'draft') return Math.min(2200, Math.floor(particleCount * 0.45));
  if (quality === 'cinematic') return Math.min(10000, Math.floor(particleCount * 1.4));
  return Math.min(6000, Math.floor(particleCount * 0.9));
}

function getLineSampleLimit(quality: ParticleConfig['renderQuality']) {
  if (quality === 'draft') return 900;
  if (quality === 'cinematic') return 2600;
  return 1600;
}

function getLineNeighborLimit(quality: ParticleConfig['renderQuality']) {
  if (quality === 'draft') return 3;
  if (quality === 'cinematic') return 5;
  return 4;
}

export const LineSystem: React.FC<{
  config: ParticleConfig;
  layerIndex: 2 | 3;
  particleData: ParticleData;
  uniforms: ShaderUniformMap;
  globalRadius: number;
  connectionDistance: number;
  connectionOpacity: number;
  contactAmount: number;
  isPlaying: boolean;
}> = ({ config, layerIndex, particleData, uniforms, globalRadius, connectionDistance, connectionOpacity, contactAmount, isPlaying }) => {
  const meshRef = useRef<THREE.LineSegments>(null);
  const layerVelocityGlow = layerIndex === 2 ? config.layer2LineVelocityGlow : config.layer3LineVelocityGlow;
  const layerVelocityAlpha = layerIndex === 2 ? config.layer2LineVelocityAlpha : config.layer3LineVelocityAlpha;
  const layerBurstPulse = layerIndex === 2 ? config.layer2LineBurstPulse : config.layer3LineBurstPulse;
  const layerLineShimmer = layerIndex === 2 ? config.layer2LineShimmer : config.layer3LineShimmer;
  const layerLineFlickerSpeed = layerIndex === 2 ? config.layer2LineFlickerSpeed : config.layer3LineFlickerSpeed;
  const refreshAccumulatorRef = useRef(0);
  const sampleTimeRef = useRef(0);
  const [lineRefreshTick, setLineRefreshTick] = useState(0);

  const getEstimatedLinePosition = (index: number) => {
    return estimateLayerPositionApprox({
      config,
      layerIndex,
      particleData,
      index,
      globalRadius,
      time: sampleTimeRef.current,
    });
  };

  const lineData = useMemo(() => {
    if (!particleData || particleData.count === 0) return null;
    const maxLines = getLineBudget(config.renderQuality, particleData.count);
    const searchDistance = Math.max(1, connectionDistance);
    const cellSize = Math.max(searchDistance, 1);
    const cells = new Map<string, number[]>();
    const sampleStep = Math.max(1, Math.ceil(particleData.count / getLineSampleLimit(config.renderQuality)));
    const maxNeighborsPerParticle = getLineNeighborLimit(config.renderQuality);
    const sampledPoints: Array<{ particleIndex: number; point: ReturnType<typeof getEstimatedLinePosition> }> = [];

    for (let particleIndex = 0; particleIndex < particleData.count; particleIndex += sampleStep) {
      const point = getEstimatedLinePosition(particleIndex);
      const key = getSpatialCellKey(point.x, point.y, point.z, cellSize);
      const bucket = cells.get(key) || [];
      bucket.push(sampledPoints.length);
      cells.set(key, bucket);
      sampledPoints.push({ particleIndex, point });
    }

    if (sampledPoints.length < 2) return null;

    const points = sampledPoints.map(({ point }) => point);

    const pairs: Array<[number, number]> = [];
    const seen = new Set<string>();
    for (let index = 0; index < sampledPoints.length && pairs.length < maxLines; index += 1) {
      const point = points[index];
      if (!point) continue;
      const sourceParticleIndex = sampledPoints[index]?.particleIndex;
      if (sourceParticleIndex === undefined) continue;
      const baseCellX = Math.floor(point.x / cellSize);
      const baseCellY = Math.floor(point.y / cellSize);
      const baseCellZ = Math.floor(point.z / cellSize);
      const candidates: Array<{ index: number; distSq: number }> = [];

      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            const bucket = cells.get(`${baseCellX + dx}:${baseCellY + dy}:${baseCellZ + dz}`);
            if (!bucket) continue;
            for (const candidateIndex of bucket) {
              if (candidateIndex <= index) continue;
              const candidate = points[candidateIndex];
              if (!candidate) continue;
              const distSq = (point.x - candidate.x) ** 2 + (point.y - candidate.y) ** 2 + (point.z - candidate.z) ** 2;
              if (distSq <= searchDistance * searchDistance) candidates.push({ index: candidateIndex, distSq });
            }
          }
        }
      }

      candidates.sort((left, right) => left.distSq - right.distSq).slice(0, maxNeighborsPerParticle).forEach((candidate) => {
        if (pairs.length >= maxLines) return;
        const targetParticleIndex = sampledPoints[candidate.index]?.particleIndex;
        if (targetParticleIndex === undefined) return;
        const pairKey = `${sourceParticleIndex}:${targetParticleIndex}`;
        if (seen.has(pairKey)) return;
        seen.add(pairKey);
        pairs.push([sourceParticleIndex, targetParticleIndex]);
      });
    }

    const lineCount = pairs.length;
    if (lineCount === 0) return null;
    const aPosA = new Float32Array(lineCount * 2 * 3);
    const aOffA = new Float32Array(lineCount * 2 * 3);
    const aData1A = new Float32Array(lineCount * 2 * 4);
    const aData2A = new Float32Array(lineCount * 2 * 4);
    const aData3A = new Float32Array(lineCount * 2 * 4);
    const aPosB = new Float32Array(lineCount * 2 * 3);
    const aOffB = new Float32Array(lineCount * 2 * 3);
    const aData1B = new Float32Array(lineCount * 2 * 4);
    const aData2B = new Float32Array(lineCount * 2 * 4);
    const aData3B = new Float32Array(lineCount * 2 * 4);
    const aMix = new Float32Array(lineCount * 2);

    for (let index = 0; index < lineCount; index += 1) {
      const pair = pairs[index];
      if (!pair) continue;
      const [idxA, idxB] = pair;
      aMix[index * 2 + 0] = 0.0;
      aMix[index * 2 + 1] = 1.0;
      for (let v = 0; v < 2; v += 1) {
        const vi = index * 2 + v;
        aPosA.set(particleData.pos.subarray(idxA * 3, idxA * 3 + 3), vi * 3);
        aOffA.set(particleData.off.subarray(idxA * 3, idxA * 3 + 3), vi * 3);
        aData1A.set(particleData.d1.subarray(idxA * 4, idxA * 4 + 4), vi * 4);
        aData2A.set(particleData.d2.subarray(idxA * 4, idxA * 4 + 4), vi * 4);
        aData3A.set(particleData.d3.subarray(idxA * 4, idxA * 4 + 4), vi * 4);
        aPosB.set(particleData.pos.subarray(idxB * 3, idxB * 3 + 3), vi * 3);
        aOffB.set(particleData.off.subarray(idxB * 3, idxB * 3 + 3), vi * 3);
        aData1B.set(particleData.d1.subarray(idxB * 4, idxB * 4 + 4), vi * 4);
        aData2B.set(particleData.d2.subarray(idxB * 4, idxB * 4 + 4), vi * 4);
        aData3B.set(particleData.d3.subarray(idxB * 4, idxB * 4 + 4), vi * 4);
      }
    }
    return { aPosA, aOffA, aData1A, aData2A, aData3A, aPosB, aOffB, aData1B, aData2B, aData3B, aMix, count: lineCount };
  }, [particleData, connectionDistance, config.renderQuality, globalRadius, lineRefreshTick]);

  useFrame((_state, delta) => {
    if (isPlaying) {
      refreshAccumulatorRef.current += delta;
      if (refreshAccumulatorRef.current >= getLineRefreshInterval(config.renderQuality, particleData.count)) {
        refreshAccumulatorRef.current = 0;
        sampleTimeRef.current = uniforms.uTime.value;
        setLineRefreshTick((value) => value + 1);
      }
    }
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    const lineImpactBoost = config.interLayerContactFxEnabled && config.interLayerCollisionEnabled
      ? 1 + contactAmount * config.interLayerContactLineBoost
      : 1;
    mat.uniforms.uTime.value = uniforms.uTime.value;
    mat.uniforms.uAudioBass.value = uniforms.uAudioBass.value;
    mat.uniforms.uAudioTreble.value = uniforms.uAudioTreble.value;
    mat.uniforms.uConnectDistance.value = connectionDistance;
    mat.uniforms.uOpacity.value = Math.min(1, connectionOpacity * lineImpactBoost);
    mat.uniforms.uLineVelocityGlow.value = layerVelocityGlow;
    mat.uniforms.uLineVelocityAlpha.value = layerVelocityAlpha;
    mat.uniforms.uLineBurstPulse.value = layerBurstPulse;
    mat.uniforms.uLineShimmer.value = layerLineShimmer;
    mat.uniforms.uLineFlickerSpeed.value = layerLineFlickerSpeed;
    mat.uniforms.uGlobalSpeed.value = uniforms.uGlobalSpeed.value;
    mat.uniforms.uGlobalAmp.value = uniforms.uGlobalAmp.value;
    mat.uniforms.uGlobalNoiseScale.value = uniforms.uGlobalNoiseScale.value;
    mat.uniforms.uGlobalComplexity.value = uniforms.uGlobalComplexity.value;
    mat.uniforms.uGlobalEvolution.value = uniforms.uGlobalEvolution.value;
    mat.uniforms.uGlobalFidelity.value = uniforms.uGlobalFidelity.value;
    mat.uniforms.uGlobalOctaveMult.value = uniforms.uGlobalOctaveMult.value;
    mat.uniforms.uGlobalFreq.value = uniforms.uGlobalFreq.value;
    mat.uniforms.uGlobalRadius.value = uniforms.uGlobalRadius.value;
    mat.uniforms.uGravity.value = uniforms.uGravity.value;
    mat.uniforms.uViscosity.value = uniforms.uViscosity.value;
    mat.uniforms.uFluidForce.value = uniforms.uFluidForce.value;
    mat.uniforms.uResistance.value = uniforms.uResistance.value;
    mat.uniforms.uMoveWithWind.value = uniforms.uMoveWithWind.value;
    mat.uniforms.uNeighborForce.value = uniforms.uNeighborForce.value;
    mat.uniforms.uCollisionMode.value = uniforms.uCollisionMode.value;
    mat.uniforms.uCollisionRadius.value = uniforms.uCollisionRadius.value;
    mat.uniforms.uRepulsion.value = uniforms.uRepulsion.value;
    mat.uniforms.uAffectPos.value = uniforms.uAffectPos.value;
    mat.uniforms.uWind.value = uniforms.uWind.value;
    mat.uniforms.uSpin.value = uniforms.uSpin.value;
    mat.uniforms.uBoundaryY.value = uniforms.uBoundaryY.value;
    mat.uniforms.uBoundaryEnabled.value = uniforms.uBoundaryEnabled.value;
    mat.uniforms.uBoundaryBounce.value = uniforms.uBoundaryBounce.value;
    mat.uniforms.uMouse.value = uniforms.uMouse.value;
    mat.uniforms.uMouseForce.value = uniforms.uMouseForce.value;
    mat.uniforms.uMouseRadius.value = uniforms.uMouseRadius.value;
    mat.uniforms.uInterLayerEnabled.value = uniforms.uInterLayerEnabled.value;
    mat.uniforms.uInterLayerColliderCount.value = uniforms.uInterLayerColliderCount.value;
    mat.uniforms.uInterLayerColliders.value = uniforms.uInterLayerColliders.value;
    mat.uniforms.uInterLayerStrength.value = uniforms.uInterLayerStrength.value;
    mat.uniforms.uInterLayerPadding.value = uniforms.uInterLayerPadding.value;
  });

  if (!lineData) return null;

  return (
    <lineSegments ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={lineData.count * 2} array={lineData.aPosA} itemSize={3} />
        <bufferAttribute attach="attributes-aPosA" count={lineData.count * 2} array={lineData.aPosA} itemSize={3} />
        <bufferAttribute attach="attributes-aOffA" count={lineData.count * 2} array={lineData.aOffA} itemSize={3} />
        <bufferAttribute attach="attributes-aData1A" count={lineData.count * 2} array={lineData.aData1A} itemSize={4} />
        <bufferAttribute attach="attributes-aData2A" count={lineData.count * 2} array={lineData.aData2A} itemSize={4} />
        <bufferAttribute attach="attributes-aData3A" count={lineData.count * 2} array={lineData.aData3A} itemSize={4} />
        <bufferAttribute attach="attributes-aPosB" count={lineData.count * 2} array={lineData.aPosB} itemSize={3} />
        <bufferAttribute attach="attributes-aOffB" count={lineData.count * 2} array={lineData.aOffB} itemSize={3} />
        <bufferAttribute attach="attributes-aData1B" count={lineData.count * 2} array={lineData.aData1B} itemSize={4} />
        <bufferAttribute attach="attributes-aData2B" count={lineData.count * 2} array={lineData.aData2B} itemSize={4} />
        <bufferAttribute attach="attributes-aData3B" count={lineData.count * 2} array={lineData.aData3B} itemSize={4} />
        <bufferAttribute attach="attributes-aMix" count={lineData.count * 2} array={lineData.aMix} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={LINE_VERTEX_SHADER}
        fragmentShader={LINE_FRAGMENT_SHADER}
        uniforms={{
          ...uniforms,
          uConnectDistance: { value: 50 },
          uOpacity: { value: 0.2 },
          uAudioBass: { value: 0 },
          uAudioTreble: { value: 0 },
          uLineVelocityGlow: { value: 0 },
          uLineVelocityAlpha: { value: 0 },
          uLineBurstPulse: { value: 0 },
          uLineShimmer: { value: 0 },
          uLineFlickerSpeed: { value: 1 },
        }}
        transparent={true}
        depthWrite={false}
        blending={getLineBlendMode(config.particleColor)}
      />
    </lineSegments>
  );
};
