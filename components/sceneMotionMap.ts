import type { Layer2Type } from '../types';

export const MOTION_MAP: Record<Layer2Type, number> = {
  flow: 0, smoke: 1, liquid: 2, wind: 3, gravity: 4, explosion: 5, linear: 6, field: 7,
  morph: 8, attractor: 9, swirl: 10, wave: 11, curl: 12, noise: 13, euler: 14, lorenz: 15,
  aizawa: 16, rossler: 17, thomas: 18, spring: 19, vortex: 20, aero: 21, aux: 22, orbit: 23,
  spiral_motion: 24, helix: 25, uniform: 26, gaussian: 27, brownian: 28, phyllotaxis: 29,
  rose_curve: 30, ridged_mf: 31, lissajous: 32, toroidal: 33, pendulum: 34, lattice: 35,
  epicycle: 36, gyre: 37, crystal: 38, ripple_ring: 39, fold: 40,
  kaleidoscope: 41, braid: 42, arc_wave: 43, web: 44, pulse_shell: 45,
  mandala: 46, ribbon: 47, shear: 48, spokes: 49, breathing: 50,
  torus_knot: 51, clifford: 52, hopalong: 53, cellular: 54, cyclone: 55, petals: 56, sheet: 57, flare: 58,
  moebius: 59, harmonic: 60, starburst: 61, grid_wave: 62, helio: 63, zigzag: 64, shockwave: 65,
  filament: 66, mirror_fold: 67, radial_steps: 68, coil: 69, labyrinth: 70, gyro: 71, echo_ring: 72,
  braidshell: 73, crosscurrent: 74, prism: 75, tessellate: 76, pulse_grid: 77, tidal: 78, beacon: 79,
  caustic: 80, pinwheel: 81, nebula: 82, fronds: 83, gyroflower: 84, monolith: 85, runes: 86,
  fanout: 87, eddy: 88, nova: 89,
};
