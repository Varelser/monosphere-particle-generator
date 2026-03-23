export interface ParticleConfigGpgpu {
  gpgpuEnabled: boolean;
  gpgpuCount: number;
  gpgpuGravity: number;
  gpgpuTurbulence: number;
  gpgpuBounce: number;
  gpgpuBounceRadius: number;
  gpgpuSize: number;
  gpgpuSpeed: number;
  gpgpuColor: string;
  gpgpuOpacity: number;
  gpgpuAudioReactive: boolean;
  gpgpuAudioBlast: number;
  // Trail
  gpgpuTrailEnabled: boolean;
  gpgpuTrailLength: number;
  gpgpuTrailFade: number;
  gpgpuTrailVelocityScale: number;
  // Instanced Geometry
  gpgpuGeomMode: 'point' | 'cube' | 'tetra' | 'octa';
  gpgpuGeomVelocityAlign: boolean;
  gpgpuGeomScale: number;
  // N-Body
  gpgpuNBodyEnabled: boolean;
  gpgpuNBodyStrength: number;
  gpgpuNBodyRepulsion: number;
  gpgpuNBodySoftening: number;
  gpgpuNBodySampleCount: number;
  // Velocity color gradient
  gpgpuVelColorEnabled: boolean;
  gpgpuVelColorHueMin: number;
  gpgpuVelColorHueMax: number;
  gpgpuVelColorSaturation: number;
  // Life/Age
  gpgpuAgeEnabled: boolean;
  gpgpuAgeMax: number;
  gpgpuAgeFadeIn: number;
  gpgpuAgeFadeOut: number;
  // Curl Noise
  gpgpuCurlEnabled: boolean;
  gpgpuCurlStrength: number;
  gpgpuCurlScale: number;
  // Boids
  gpgpuBoidsEnabled: boolean;
  gpgpuBoidsSeparation: number;
  gpgpuBoidsAlignment: number;
  gpgpuBoidsCohesion: number;
  gpgpuBoidsRadius: number;
  // Strange Attractor
  gpgpuAttractorEnabled: boolean;
  gpgpuAttractorType: 'lorenz' | 'rossler' | 'thomas';
  gpgpuAttractorStrength: number;
  gpgpuAttractorScale: number;
  // Vortex
  gpgpuVortexEnabled: boolean;
  gpgpuVortexStrength: number;
  gpgpuVortexTilt: number;
  // Wind
  gpgpuWindEnabled: boolean;
  gpgpuWindStrength: number;
  gpgpuWindX: number;
  gpgpuWindY: number;
  gpgpuWindZ: number;
  gpgpuWindGust: number;
  // Gravity Well
  gpgpuWellEnabled: boolean;
  gpgpuWellStrength: number;
  gpgpuWellSoftening: number;
  gpgpuWellOrbit: number;
  // Elastic Spring
  gpgpuElasticEnabled: boolean;
  gpgpuElasticStrength: number;
  // Magnetic (Lorentz)
  gpgpuMagneticEnabled: boolean;
  gpgpuMagneticStrength: number;
  gpgpuMagneticBX: number;
  gpgpuMagneticBY: number;
  gpgpuMagneticBZ: number;
  // SPH Fluid
  gpgpuSphEnabled: boolean;
  gpgpuSphPressure: number;
  gpgpuSphViscosity: number;
  gpgpuSphRadius: number;
  gpgpuSphRestDensity: number;
  // Vector Field
  gpgpuVFieldEnabled: boolean;
  gpgpuVFieldType: 'dipole' | 'saddle' | 'spiral' | 'source';
  gpgpuVFieldStrength: number;
  gpgpuVFieldScale: number;
  // Spring (to spawn pos)
  gpgpuSpringEnabled: boolean;
  gpgpuSpringStrength: number;
  // Verlet Integration
  gpgpuVerletEnabled: boolean;
  // SDF Collider
  gpgpuSdfEnabled: boolean;
  gpgpuSdfShape: 'sphere' | 'box' | 'torus' | 'capsule';
  gpgpuSdfX: number;
  gpgpuSdfY: number;
  gpgpuSdfZ: number;
  gpgpuSdfSize: number;
  gpgpuSdfBounce: number;
  // Emission Shape
  gpgpuEmitShape: 'sphere' | 'disc' | 'ring' | 'box' | 'shell' | 'cone';
  // Color over Lifetime
  gpgpuAgeColorEnabled: boolean;
  gpgpuAgeColorYoung: string;
  gpgpuAgeColorOld: string;
  // Size over Lifetime
  gpgpuAgeSizeEnabled: boolean;
  gpgpuAgeSizeStart: number;
  gpgpuAgeSizeEnd: number;
  // Mouse Force
  gpgpuMouseEnabled: boolean;
  gpgpuMouseStrength: number;
  gpgpuMouseRadius: number;
  gpgpuMouseMode: 'attract' | 'repel' | 'swirl';
  // Streak Rendering
  gpgpuStreakEnabled: boolean;
  gpgpuStreakLength: number;
  gpgpuStreakOpacity: number;
  // Sort-based Transparency (GPU Bitonic Sort)
  gpgpuSortEnabled: boolean;
  // Fluid Advection (Navier-Stokes simplified)
  gpgpuFluidEnabled: boolean;
  gpgpuFluidDiffuse: number;
  gpgpuFluidDecay: number;
  gpgpuFluidStrength: number;
  gpgpuFluidInfluence: number;
  gpgpuFluidScale: number;
  gpgpuFluidExtForce: boolean;
  // WebGPU Compute Backend
  gpgpuWebGPUEnabled: boolean;
  // Metaballs (Marching Cubes isosurface)
  gpgpuMetaballEnabled: boolean;
  gpgpuMetaballResolution: number;
  gpgpuMetaballStrength: number;
  gpgpuMetaballIsoLevel: number;
  gpgpuMetaballColor: string;
  gpgpuMetaballOpacity: number;
  gpgpuMetaballWireframe: boolean;
  gpgpuMetaballParticleLimit: number;
}
