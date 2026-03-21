import * as THREE from 'three';
import type { ParticleConfig } from '../types';

export type ShaderUniformMap = Record<string, THREE.IUniform>;

export const getParticleBlendMode = (particleColor: ParticleConfig['particleColor']) => (
  particleColor === 'black' ? THREE.NormalBlending : THREE.AdditiveBlending
);

export const getLineBlendMode = (particleColor: ParticleConfig['particleColor']) => (
  particleColor === 'black' ? THREE.NormalBlending : THREE.AdditiveBlending
);
