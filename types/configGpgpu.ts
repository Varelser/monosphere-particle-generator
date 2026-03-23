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
}
