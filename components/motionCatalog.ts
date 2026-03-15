import type { Layer2Type } from '../types';
import { MOTION_MAP } from './sceneMotionMap';

export type MotionGroupName = 'Fluid' | 'Chaos' | 'Orbit' | 'Pattern' | 'Structure' | 'Pulse' | 'Transform';

export const MOTION_GROUPS: { label: MotionGroupName; ids: Layer2Type[] }[] = [
  {
    label: 'Fluid',
    ids: ['flow', 'curl', 'liquid', 'smoke', 'noise', 'ridged_mf', 'crosscurrent', 'tidal', 'caustic', 'eddy', 'nebula', 'cyclone', 'aero', 'wind'],
  },
  {
    label: 'Chaos',
    ids: ['lorenz', 'aizawa', 'rossler', 'thomas', 'euler', 'clifford', 'hopalong'],
  },
  {
    label: 'Orbit',
    ids: ['orbit', 'spiral_motion', 'helix', 'epicycle', 'toroidal', 'torus_knot', 'helio', 'coil', 'gyro', 'braidshell', 'pinwheel'],
  },
  {
    label: 'Pattern',
    ids: ['lissajous', 'rose_curve', 'mandala', 'petals', 'kaleidoscope', 'prism', 'starburst', 'radial_steps', 'fronds', 'gyroflower', 'runes', 'phyllotaxis', 'gyre', 'crystal'],
  },
  {
    label: 'Structure',
    ids: ['lattice', 'cellular', 'tessellate', 'web', 'grid_wave', 'pulse_grid', 'sheet', 'filament', 'labyrinth', 'monolith'],
  },
  {
    label: 'Pulse',
    ids: ['ripple_ring', 'shockwave', 'pulse_shell', 'beacon', 'breathing', 'wave', 'arc_wave', 'nova', 'echo_ring', 'flare'],
  },
  {
    label: 'Transform',
    ids: ['morph', 'fold', 'mirror_fold', 'shear', 'spokes', 'uniform', 'gaussian', 'brownian', 'gravity', 'spring', 'explosion', 'linear', 'aux', 'attractor', 'swirl', 'vortex', 'ribbon', 'fanout', 'zigzag', 'harmonic', 'moebius'],
  },
];

export const MOTION_GROUP_INDEX: Record<MotionGroupName, number> = {
  Fluid: 0,
  Chaos: 1,
  Orbit: 2,
  Pattern: 3,
  Structure: 4,
  Pulse: 5,
  Transform: 6,
};

const MOTION_CATEGORY_MAP = new Map<Layer2Type, MotionGroupName>();
for (const group of MOTION_GROUPS) {
  for (const id of group.ids) {
    MOTION_CATEGORY_MAP.set(id, group.label);
  }
}

const MOTION_NUMERIC_GROUP_MAP = new Map<number, MotionGroupName>();
for (const [key, value] of Object.entries(MOTION_MAP)) {
  const category = MOTION_CATEGORY_MAP.get(key as Layer2Type);
  if (category) {
    MOTION_NUMERIC_GROUP_MAP.set(value, category);
  }
}

export function getMotionGroupName(motion: Layer2Type): MotionGroupName {
  return MOTION_CATEGORY_MAP.get(motion) ?? 'Transform';
}

export function getMotionGroupNameByValue(motionType: number): MotionGroupName {
  return MOTION_NUMERIC_GROUP_MAP.get(motionType) ?? 'Transform';
}

export function getMotionGroupIndexByValue(motionType: number) {
  return MOTION_GROUP_INDEX[getMotionGroupNameByValue(motionType)];
}

export function buildMotionFamilyGlsl() {
  const branches = MOTION_GROUPS.map((group) => {
    const checks = group.ids
      .map((id) => {
        const value = MOTION_MAP[id];
        return `abs(motionType - ${value.toFixed(1)}) < 0.5`;
      })
      .join(' || ');
    return `    if (${checks}) return ${MOTION_GROUP_INDEX[group.label].toFixed(1)};`;
  }).join('\n');

  return `
  float getMotionFamily(float motionType) {
${branches}
    return ${MOTION_GROUP_INDEX.Transform.toFixed(1)};
  }
`;
}
