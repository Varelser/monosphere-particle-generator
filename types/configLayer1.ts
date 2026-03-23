import { Position3D } from './scene';

export interface ParticleConfigLayer1 {
  layer1Enabled: boolean;
  layer1Count: number;
  layer1SourceCount: number;
  layer1SourceSpread: number;
  layer1SourcePositions: Position3D[];

  layer1Counts: number[];
  layer1Radii: number[];
  layer1Volumes: number[];
  layer1Jitters: number[];
  layer1Sizes: number[];
  layer1PulseSpeeds: number[];
  layer1PulseAmps: number[];

  layer1Color: string;
  baseSize: number;
  sphereRadius: number;
  layer1Volume: number;
  jitter: number;
  pulseSpeed: number;
  pulseAmplitude: number;
}
