import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';

const MAX_TRAIL = 16;

// ── Shared sim quad vertex ──
const SIM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

// ── Velocity sim fragment (+ N-body) ──
const SIM_VEL_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uDelta;
  uniform float uTime;
  uniform float uGravity;
  uniform float uTurbulence;
  uniform float uBounceRadius;
  uniform float uBounce;
  uniform float uAudioBlast;
  uniform bool  uNBodyEnabled;
  uniform float uNBodyStrength;
  uniform float uNBodySoftening;
  uniform float uNBodyRepulsion;
  uniform int   uNBodySamples;
  uniform float uTexSizeF;
  uniform bool  uCurlEnabled;
  uniform float uCurlStrength;
  uniform float uCurlScale;
  uniform bool  uBoidsEnabled;
  uniform float uBoidsSeparation;
  uniform float uBoidsAlignment;
  uniform float uBoidsCohesion;
  uniform float uBoidsRadius;
  uniform bool  uAttractorEnabled;
  uniform int   uAttractorType;
  uniform float uAttractorStrength;
  uniform float uAttractorScale;
  uniform bool  uVortexEnabled;
  uniform float uVortexStrength;
  uniform float uVortexTilt;
  uniform bool  uWindEnabled;
  uniform float uWindStrength;
  uniform float uWindX;
  uniform float uWindY;
  uniform float uWindZ;
  uniform float uWindGust;
  uniform bool  uWellEnabled;
  uniform float uWellStrength;
  uniform float uWellSoftening;
  uniform float uWellOrbit;
  uniform bool  uElasticEnabled;
  uniform float uElasticStrength;
  uniform bool  uMagneticEnabled;
  uniform float uMagneticStrength;
  uniform float uMagneticBX;
  uniform float uMagneticBY;
  uniform float uMagneticBZ;
  varying vec2 vUv;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); vec3 u = f*f*(3.0-2.0*f);
    return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
                   mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
               mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
                   mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y));
  }

  // Divergence-free curl noise (12 noise evals)
  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 p1 = p + vec3(31.416, 0.0, 0.0);
    vec3 p2 = p + vec3(0.0, 43.982, 0.0);
    float dFz_dy = vnoise(p2 + vec3(0,e,0)) - vnoise(p2 - vec3(0,e,0));
    float dFy_dz = vnoise(p1 + vec3(0,0,e)) - vnoise(p1 - vec3(0,0,e));
    float dFx_dz = vnoise(p  + vec3(0,0,e)) - vnoise(p  - vec3(0,0,e));
    float dFz_dx = vnoise(p2 + vec3(e,0,0)) - vnoise(p2 - vec3(e,0,0));
    float dFy_dx = vnoise(p1 + vec3(e,0,0)) - vnoise(p1 - vec3(e,0,0));
    float dFx_dy = vnoise(p  + vec3(0,e,0)) - vnoise(p  - vec3(0,e,0));
    return vec3(dFz_dy - dFy_dz, dFx_dz - dFz_dx, dFy_dx - dFx_dy) / (2.0 * e);
  }

  void main() {
    vec4 posData = texture2D(uPosTex, vUv);
    vec4 velData = texture2D(uVelTex, vUv);
    vec3 pos = posData.xyz;
    vec3 vel = velData.xyz;

    vel.y -= uGravity * uDelta * 9.8;

    if (uTurbulence > 0.001) {
      float t = uTime * 0.25;
      vec3 np = pos * 0.007;
      vel += vec3(vnoise(np+vec3(t,0,0)),vnoise(np+vec3(0,t+13.7,0)),vnoise(np+vec3(0,0,t+27.4)))
             * uTurbulence * 18.0 * uDelta;
    }

    if (uAudioBlast > 0.001) {
      vec3 dir = length(pos) > 0.001 ? normalize(pos) : vec3(0,1,0);
      vel += dir * uAudioBlast * 14.0 * uDelta;
    }

    // N-Body gravity/repulsion
    if (uNBodyEnabled) {
      vec3 acc = vec3(0.0);
      float stride = uTexSizeF / float(uNBodySamples);
      for (int i = 0; i < 64; i++) {
        if (i >= uNBodySamples) break;
        float si = float(i) * stride;
        vec2 sUv = (vec2(mod(si, uTexSizeF), floor(si / uTexSizeF)) + 0.5) / uTexSizeF;
        vec3 oPos = texture2D(uPosTex, sUv).xyz;
        vec3 diff = oPos - pos;
        float r2 = dot(diff, diff) + uNBodySoftening * uNBodySoftening;
        float r  = sqrt(r2);
        if (r > 0.001) {
          vec3 dir2 = diff / r;
          if (r > uNBodyRepulsion) {
            acc += dir2 / r2;
          } else {
            acc -= dir2 / r2 * 0.5;
          }
        }
      }
      vel += acc * uNBodyStrength * uDelta * 500.0;
    }

    // Curl Noise
    if (uCurlEnabled) {
      vec3 curl = curlNoise(pos * uCurlScale + vec3(uTime * 0.15));
      vel += curl * uCurlStrength * 20.0 * uDelta;
    }

    // Boids
    if (uBoidsEnabled) {
      vec3 sepForce = vec3(0.0);
      vec3 aliForce = vec3(0.0);
      vec3 cohPos   = vec3(0.0);
      int  cohCount = 0;
      float stride = uTexSizeF / float(uNBodySamples);
      for (int i = 0; i < 64; i++) {
        if (i >= uNBodySamples) break;
        float si = float(i) * stride;
        vec2 sUv = (vec2(mod(si, uTexSizeF), floor(si / uTexSizeF)) + 0.5) / uTexSizeF;
        if (length(sUv - vUv) < 1.5 / uTexSizeF) continue;
        vec3 oPos = texture2D(uPosTex, sUv).xyz;
        vec3 oVel = texture2D(uVelTex, sUv).xyz;
        float d = distance(pos, oPos);
        if (d < uBoidsRadius * 0.3 && d > 0.001) sepForce -= normalize(oPos - pos) / max(d, 0.5);
        if (d < uBoidsRadius) { aliForce += oVel; cohPos += oPos; cohCount++; }
      }
      if (cohCount > 0) {
        float inv = 1.0 / float(cohCount);
        vel += normalize(sepForce + vec3(0.0001)) * uBoidsSeparation * uDelta * 150.0;
        vel += normalize(aliForce * inv - vel + vec3(0.0001)) * uBoidsAlignment * uDelta * 60.0;
        vel += normalize(cohPos * inv - pos + vec3(0.0001)) * uBoidsCohesion * uDelta * 60.0;
      }
    }

    // Strange Attractor
    if (uAttractorEnabled) {
      vec3 ap = pos / max(0.1, uAttractorScale);
      vec3 dv;
      if (uAttractorType == 0) { // Lorenz
        dv = vec3(10.0*(ap.y-ap.x), ap.x*(28.0-ap.z)-ap.y, ap.x*ap.y-2.667*ap.z);
      } else if (uAttractorType == 1) { // Rossler
        dv = vec3(-(ap.y+ap.z), ap.x+0.2*ap.y, 0.2+ap.z*(ap.x-5.7));
      } else { // Thomas
        dv = vec3(sin(ap.y)-0.208*ap.x, sin(ap.z)-0.208*ap.y, sin(ap.x)-0.208*ap.z);
      }
      vel += normalize(dv + vec3(0.0001)) * uAttractorStrength * uDelta * 40.0;
    }

    // Vortex
    if (uVortexEnabled) {
      vec3 axis = normalize(vec3(sin(uVortexTilt), cos(uVortexTilt), 0.0));
      vec3 tangent = cross(axis, pos);
      float tLen = length(tangent);
      if (tLen > 0.001) vel += (tangent / tLen) * uVortexStrength * uDelta * 80.0;
    }

    // Wind
    if (uWindEnabled) {
      vec3 gust = vec3(
        vnoise(pos * 0.01 + vec3(uTime * 0.3, 0.0, 0.0)),
        vnoise(pos * 0.01 + vec3(1.7, uTime * 0.25, 0.0)),
        vnoise(pos * 0.01 + vec3(0.0, 3.1, uTime * 0.2))
      ) * uWindGust;
      vel += (normalize(vec3(uWindX, uWindY, uWindZ) + vec3(0.0001)) * uWindStrength + gust) * uDelta * 30.0;
    }

    // Gravity Well
    if (uWellEnabled) {
      vec3 toCenter = -pos;
      float d = length(toCenter) + uWellSoftening;
      vel += (toCenter / (d * d)) * uWellStrength * uDelta * 2000.0;
      vec3 tangent2 = cross(normalize(toCenter + vec3(0.001, 0.0, 0.0)), vec3(0.0, 1.0, 0.0));
      vel += tangent2 * uWellOrbit * uDelta * 50.0;
    }

    // Elastic Spring
    if (uElasticEnabled) {
      vel -= pos * uElasticStrength * uDelta * 2.0;
    }

    // Magnetic / Lorentz
    if (uMagneticEnabled) {
      vec3 B = normalize(vec3(uMagneticBX, uMagneticBY, uMagneticBZ) + vec3(0.0001));
      vel += cross(vel, B) * uMagneticStrength * uDelta * 0.8;
    }

    float spd = length(vel);
    if (spd > 350.0) vel *= 350.0 / spd;
    vel *= (1.0 - 1.1 * uDelta);

    float dist = length(pos);
    if (dist > uBounceRadius) {
      vec3 n = pos / dist;
      float vn = dot(vel, n);
      if (vn > 0.0) vel -= n * vn * (1.0 + uBounce);
    }

    gl_FragColor = vec4(vel, 0.0);
  }
`;

// ── Position sim fragment (+ Life/Age in .w) ──
const SIM_POS_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uDelta;
  uniform float uSpeed;
  uniform float uBounceRadius;
  uniform bool  uAgeEnabled;
  uniform float uAgeMax;
  varying vec2 vUv;

  float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec4 posData = texture2D(uPosTex, vUv);
    vec3 pos = posData.xyz;
    float age = posData.w;
    vec3 vel = texture2D(uVelTex, vUv).xyz;

    pos += vel * uDelta * uSpeed * 60.0;
    float dist = length(pos);
    if (dist > uBounceRadius * 1.05) pos = normalize(pos) * uBounceRadius * 1.05;

    if (uAgeEnabled) {
      age += uDelta;
      if (age > uAgeMax) {
        // Respawn at random position inside sphere
        float r   = uBounceRadius * (0.05 + hash1(vUv + vec2(age)) * 0.9);
        float th  = hash1(vUv + vec2(1.3)) * 6.2832;
        float phi = acos(2.0 * hash1(vUv + vec2(2.7)) - 1.0);
        pos = vec3(r * sin(phi) * cos(th), r * sin(phi) * sin(th), r * cos(phi));
        age = 0.0;
      }
    }

    gl_FragColor = vec4(pos, age);
  }
`;

// ── Blit fragment (texture copy) ──
const BLIT_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  varying vec2 vUv;
  void main() { gl_FragColor = texture2D(uTex, vUv); }
`;

// ── Draw vertex (main points) ──
const DRAW_VERT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uSize;
  uniform bool  uAgeEnabled;
  uniform float uAgeMax;
  attribute vec2 aTexCoord;
  varying float vSpeed;
  varying float vNormAge;
  void main() {
    vec4 posData  = texture2D(uPosTex, aTexCoord);
    vec3 worldPos = posData.xyz;
    vec3 vel      = texture2D(uVelTex, aTexCoord).xyz;
    vSpeed   = clamp(length(vel) / 80.0, 0.0, 1.0);
    vNormAge = uAgeEnabled ? clamp(posData.w / max(uAgeMax, 0.001), 0.0, 1.0) : 0.5;
    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    float dist = -mvPos.z;
    gl_PointSize = max(0.5, uSize * (dist > 0.5 ? min(4.0, 500.0 / dist) : 1.0));
    gl_Position  = projectionMatrix * mvPos;
  }
`;

// ── Draw fragment ──
const DRAW_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform bool  uVelColorEnabled;
  uniform float uVelColorHueMin;
  uniform float uVelColorHueMax;
  uniform float uVelColorSaturation;
  uniform bool  uAgeEnabled;
  uniform float uAgeFadeIn;
  uniform float uAgeFadeOut;
  varying float vSpeed;
  varying float vNormAge;

  vec3 hsv2rgb(float h, float s, float v) {
    vec3 p = abs(fract(vec3(h) + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
  }

  void main() {
    vec2 pc = gl_PointCoord - 0.5;
    float d = length(pc);
    if (d > 0.5) discard;

    vec3 col = uColor;
    if (uVelColorEnabled) {
      float hue = mix(uVelColorHueMin, uVelColorHueMax, vSpeed) / 360.0;
      col = hsv2rgb(hue, uVelColorSaturation, 1.0);
    }

    float ageFade = 1.0;
    if (uAgeEnabled) {
      ageFade  = smoothstep(0.0, uAgeFadeIn, vNormAge);
      ageFade *= smoothstep(1.0, 1.0 - uAgeFadeOut, vNormAge);
    }

    gl_FragColor = vec4(col, smoothstep(0.5, 0.12, d) * uOpacity * ageFade);
  }
`;

// ── Trail vertex (samples velocity for speed-based alpha) ──
const TRAIL_VERT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uSize;
  attribute vec2 aTexCoord;
  varying float vSpeed;
  void main() {
    vec3 worldPos = texture2D(uPosTex, aTexCoord).xyz;
    vec3 vel      = texture2D(uVelTex, aTexCoord).xyz;
    vSpeed = clamp(length(vel) / 80.0, 0.0, 1.0);
    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    float dist = -mvPos.z;
    gl_PointSize = max(0.3, uSize * (dist > 0.5 ? min(4.0, 500.0 / dist) : 1.0));
    gl_Position  = projectionMatrix * mvPos;
  }
`;

// ── Trail fragment ──
const TRAIL_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uAlpha;
  uniform float uVelocityScale;
  varying float vSpeed;
  void main() {
    vec2 pc = gl_PointCoord - 0.5;
    float d = length(pc);
    if (d > 0.5) discard;
    float speedMul = mix(1.0, vSpeed, uVelocityScale);
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.15, d) * uAlpha * speedMul);
  }
`;

// ── Instanced geometry vertex ──
const GEOM_VERT = /* glsl */ `
  precision highp float;
  attribute vec2 aTexCoord;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uGeomScale;
  uniform float uVelocityAlign;
  varying vec3 vNormal;

  mat3 lookRot(vec3 dir) {
    vec3 up = abs(dir.y) < 0.99 ? vec3(0,1,0) : vec3(1,0,0);
    vec3 r  = normalize(cross(dir, up));
    vec3 u  = cross(r, dir);
    return mat3(r, u, dir);
  }

  void main() {
    vec3 instancePos = texture2D(uPosTex, aTexCoord).xyz;
    vec3 vel         = texture2D(uVelTex, aTexCoord).xyz;
    mat3 rot = mat3(1.0);
    if (uVelocityAlign > 0.5) {
      float spd = length(vel);
      if (spd > 0.01) rot = lookRot(vel / spd);
    }
    vec3 local = rot * (position * uGeomScale);
    vNormal = normalize(normalMatrix * rot * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(instancePos + local, 1.0);
  }
`;

// ── Instanced geometry fragment (Lambert + specular) ──
const GEOM_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(0.0, dot(N, L)) * 0.7 + 0.3;
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(0.0, dot(N, H)), 24.0) * 0.35;
    gl_FragColor = vec4(uColor * diff + spec, uOpacity);
  }
`;

// ── Helpers ──
function getTexSize(count: number): number {
  const side = Math.ceil(Math.sqrt(count));
  let s = 1;
  while (s < side) s <<= 1;
  return Math.max(s, 2);
}
function makeRT(size: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

// ── Component ──
type GpgpuSystemProps = {
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number }>;
  config: ParticleConfig;
  isPlaying: boolean;
};

export const GpgpuSystem: React.FC<GpgpuSystemProps> = React.memo(({ audioRef, config, isPlaying }) => {
  const { gl } = useThree();

  const texSize = useMemo(() => getTexSize(config.gpgpuCount), [config.gpgpuCount]);

  // ── Sim scene ──
  const simScene  = useMemo(() => new THREE.Scene(), []);
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const simGeo    = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  // ── Sim materials ──
  const velSimMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:         { value: null },
      uVelTex:         { value: null },
      uDelta:          { value: 0.016 },
      uTime:           { value: 0 },
      uGravity:        { value: config.gpgpuGravity },
      uTurbulence:     { value: config.gpgpuTurbulence },
      uBounceRadius:   { value: config.gpgpuBounceRadius },
      uBounce:         { value: config.gpgpuBounce },
      uAudioBlast:     { value: 0 },
      uNBodyEnabled:   { value: false },
      uNBodyStrength:  { value: 1.0 },
      uNBodySoftening: { value: 2.0 },
      uNBodyRepulsion: { value: 5.0 },
      uNBodySamples:   { value: 16 },
      uTexSizeF:       { value: texSize },
      uCurlEnabled:       { value: false },
      uCurlStrength:      { value: 1.0 },
      uCurlScale:         { value: 0.008 },
      uBoidsEnabled:      { value: false },
      uBoidsSeparation:   { value: 1.0 },
      uBoidsAlignment:    { value: 0.5 },
      uBoidsCohesion:     { value: 0.3 },
      uBoidsRadius:       { value: 30.0 },
      uAttractorEnabled:  { value: false },
      uAttractorType:     { value: 0 },
      uAttractorStrength: { value: 1.0 },
      uAttractorScale:    { value: 8.0 },
      uVortexEnabled:    { value: false },
      uVortexStrength:   { value: 1.0 },
      uVortexTilt:       { value: 0.0 },
      uWindEnabled:      { value: false },
      uWindStrength:     { value: 1.0 },
      uWindX:            { value: 1.0 },
      uWindY:            { value: 0.0 },
      uWindZ:            { value: 0.0 },
      uWindGust:         { value: 0.3 },
      uWellEnabled:      { value: false },
      uWellStrength:     { value: 1.0 },
      uWellSoftening:    { value: 10.0 },
      uWellOrbit:        { value: 0.5 },
      uElasticEnabled:   { value: false },
      uElasticStrength:  { value: 0.5 },
      uMagneticEnabled:  { value: false },
      uMagneticStrength: { value: 1.0 },
      uMagneticBX:       { value: 0.0 },
      uMagneticBY:       { value: 1.0 },
      uMagneticBZ:       { value: 0.0 },
    },
    vertexShader: SIM_VERT, fragmentShader: SIM_VEL_FRAG,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const posSimMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:       { value: null },
      uVelTex:       { value: null },
      uDelta:        { value: 0.016 },
      uSpeed:        { value: config.gpgpuSpeed },
      uBounceRadius: { value: config.gpgpuBounceRadius },
      uAgeEnabled:   { value: false },
      uAgeMax:       { value: 8.0 },
    },
    vertexShader: SIM_VERT, fragmentShader: SIM_POS_FRAG,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const blitMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null } },
    vertexShader: SIM_VERT, fragmentShader: BLIT_FRAG,
  }), []);

  const simMeshRef = useRef<THREE.Mesh | null>(null);
  useEffect(() => {
    const mesh = new THREE.Mesh(simGeo, velSimMat);
    simScene.add(mesh);
    simMeshRef.current = mesh;
    return () => { simScene.remove(mesh); simMeshRef.current = null; };
  }, [simGeo, velSimMat, simScene]);

  // ── Draw material + geometry ──
  const drawMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:            { value: null },
      uVelTex:            { value: null },
      uColor:             { value: new THREE.Color(config.gpgpuColor) },
      uSize:              { value: config.gpgpuSize },
      uOpacity:           { value: config.gpgpuOpacity },
      uVelColorEnabled:   { value: false },
      uVelColorHueMin:    { value: 200 },
      uVelColorHueMax:    { value: 360 },
      uVelColorSaturation:{ value: 0.9 },
      uAgeEnabled:        { value: false },
      uAgeMax:            { value: 8.0 },
      uAgeFadeIn:         { value: 0.1 },
      uAgeFadeOut:        { value: 0.2 },
    },
    vertexShader: DRAW_VERT, fragmentShader: DRAW_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const drawGeo = useMemo(() => {
    const count = texSize * texSize;
    const geo = new THREE.BufferGeometry();
    const coords = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      coords[i * 2]     = ((i % texSize) + 0.5) / texSize;
      coords[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize;
    }
    geo.setAttribute('position',  new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aTexCoord', new THREE.BufferAttribute(coords, 2));
    return geo;
  }, [texSize]);

  // ── Trail RTs + materials ──
  const trailRTs = useMemo(() => Array.from({ length: MAX_TRAIL }, () => makeRT(texSize)), [texSize]);

  const trailMats = useMemo(() => Array.from({ length: MAX_TRAIL }, () => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:       { value: null },
      uVelTex:       { value: null },
      uColor:        { value: new THREE.Color(config.gpgpuColor) },
      uSize:         { value: config.gpgpuSize },
      uAlpha:        { value: 0 },
      uVelocityScale:{ value: config.gpgpuTrailVelocityScale },
    },
    vertexShader: TRAIL_VERT, fragmentShader: TRAIL_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), []);

  const trailHead = useRef(0);

  // ── Instanced geometry ──
  const instGeo = useMemo(() => {
    if (config.gpgpuGeomMode === 'point') return null;
    const count = texSize * texSize;
    const geo = new THREE.InstancedBufferGeometry();
    let baseGeo: THREE.BufferGeometry;
    if      (config.gpgpuGeomMode === 'cube')  baseGeo = new THREE.BoxGeometry(1, 1, 1);
    else if (config.gpgpuGeomMode === 'tetra') baseGeo = new THREE.TetrahedronGeometry(0.8);
    else                                        baseGeo = new THREE.OctahedronGeometry(0.7);
    if (baseGeo.index) geo.setIndex(baseGeo.index);
    geo.setAttribute('position', baseGeo.attributes.position);
    if (baseGeo.attributes.normal) geo.setAttribute('normal', baseGeo.attributes.normal);
    const coords = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      coords[i * 2]     = ((i % texSize) + 0.5) / texSize;
      coords[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize;
    }
    geo.setAttribute('aTexCoord', new THREE.InstancedBufferAttribute(coords, 2));
    geo.instanceCount = count;
    baseGeo.dispose();
    return geo;
  }, [texSize, config.gpgpuGeomMode]);

  const geomMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:       { value: null },
      uVelTex:       { value: null },
      uColor:        { value: new THREE.Color(config.gpgpuColor) },
      uOpacity:      { value: config.gpgpuOpacity },
      uGeomScale:    { value: config.gpgpuBounceRadius * 0.02 },
      uVelocityAlign:{ value: 0 },
    },
    vertexShader: GEOM_VERT, fragmentShader: GEOM_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const geomMeshObj = useMemo(() => {
    if (!instGeo) return null;
    return new THREE.Mesh(instGeo, geomMat);
  }, [instGeo, geomMat]);

  // ── Ping-pong RTs ──
  const rtRef = useRef<{
    posA: THREE.WebGLRenderTarget; posB: THREE.WebGLRenderTarget;
    velA: THREE.WebGLRenderTarget; velB: THREE.WebGLRenderTarget;
  } | null>(null);
  const pingIsA = useRef(true);

  useEffect(() => {
    if (rtRef.current) {
      rtRef.current.posA.dispose(); rtRef.current.posB.dispose();
      rtRef.current.velA.dispose(); rtRef.current.velB.dispose();
    }
    const posA = makeRT(texSize), posB = makeRT(texSize);
    const velA = makeRT(texSize), velB = makeRT(texSize);
    rtRef.current = { posA, posB, velA, velB };
    pingIsA.current = true;

    const count = texSize * texSize;
    const posData = new Float32Array(count * 4);
    const velData = new Float32Array(count * 4);
    const r = config.gpgpuBounceRadius;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const rad   = r * (0.1 + Math.random() * 0.9);
      const sp = Math.sin(phi), cp = Math.cos(phi);
      posData[i*4]   = rad * sp * Math.cos(theta);
      posData[i*4+1] = rad * sp * Math.sin(theta);
      posData[i*4+2] = rad * cp;
      posData[i*4+3] = 1;
      velData[i*4]   = (Math.random() - 0.5) * 4;
      velData[i*4+1] = (Math.random() - 0.5) * 4;
      velData[i*4+2] = (Math.random() - 0.5) * 4;
    }

    const copyScene = new THREE.Scene();
    const copyCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const copyGeo   = new THREE.PlaneGeometry(2, 2);
    const posTex = new THREE.DataTexture(posData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    const velTex = new THREE.DataTexture(velData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    posTex.needsUpdate = true; velTex.needsUpdate = true;
    const copyMat  = new THREE.MeshBasicMaterial({ map: posTex });
    const copyMesh = new THREE.Mesh(copyGeo, copyMat);
    copyScene.add(copyMesh);
    gl.setRenderTarget(posA); gl.render(copyScene, copyCam);
    copyMat.map = velTex; copyMat.needsUpdate = true;
    gl.setRenderTarget(velA); gl.render(copyScene, copyCam);
    gl.setRenderTarget(null);
    posTex.dispose(); velTex.dispose(); copyMat.dispose(); copyGeo.dispose();

    return () => {
      rtRef.current?.posA.dispose(); rtRef.current?.posB.dispose();
      rtRef.current?.velA.dispose(); rtRef.current?.velB.dispose();
      rtRef.current = null;
    };
  }, [texSize, gl]);

  const timeRef = useRef(0);

  useFrame(({ gl: glCtx }, delta) => {
    if (!isPlaying || !rtRef.current || !simMeshRef.current) return;

    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;

    const { posA, posB, velA, velB } = rtRef.current;
    const isA   = pingIsA.current;
    const posIn  = isA ? posA : posB;
    const posOut = isA ? posB : posA;
    const velIn  = isA ? velA : velB;
    const velOut = isA ? velB : velA;

    const blast = config.gpgpuAudioReactive && config.audioEnabled
      ? (audioRef.current.bass * 0.55 + audioRef.current.pulse * 0.9) * config.gpgpuAudioBlast
      : 0;

    // Pass 1: velocity
    velSimMat.uniforms.uPosTex.value       = posIn.texture;
    velSimMat.uniforms.uVelTex.value       = velIn.texture;
    velSimMat.uniforms.uDelta.value        = dt;
    velSimMat.uniforms.uTime.value         = timeRef.current;
    velSimMat.uniforms.uGravity.value      = config.gpgpuGravity;
    velSimMat.uniforms.uTurbulence.value   = config.gpgpuTurbulence;
    velSimMat.uniforms.uBounceRadius.value = config.gpgpuBounceRadius;
    velSimMat.uniforms.uBounce.value       = config.gpgpuBounce;
    velSimMat.uniforms.uAudioBlast.value   = blast;
    velSimMat.uniforms.uNBodyEnabled.value = config.gpgpuNBodyEnabled;
    velSimMat.uniforms.uNBodyStrength.value  = config.gpgpuNBodyStrength;
    velSimMat.uniforms.uNBodySoftening.value = config.gpgpuNBodySoftening;
    velSimMat.uniforms.uNBodyRepulsion.value = config.gpgpuNBodyRepulsion;
    velSimMat.uniforms.uNBodySamples.value   = Math.max(2, Math.min(64, config.gpgpuNBodySampleCount));
    velSimMat.uniforms.uTexSizeF.value       = texSize;
    velSimMat.uniforms.uCurlEnabled.value       = config.gpgpuCurlEnabled;
    velSimMat.uniforms.uCurlStrength.value      = config.gpgpuCurlStrength;
    velSimMat.uniforms.uCurlScale.value         = config.gpgpuCurlScale;
    velSimMat.uniforms.uBoidsEnabled.value      = config.gpgpuBoidsEnabled;
    velSimMat.uniforms.uBoidsSeparation.value   = config.gpgpuBoidsSeparation;
    velSimMat.uniforms.uBoidsAlignment.value    = config.gpgpuBoidsAlignment;
    velSimMat.uniforms.uBoidsCohesion.value     = config.gpgpuBoidsCohesion;
    velSimMat.uniforms.uBoidsRadius.value       = config.gpgpuBoidsRadius;
    velSimMat.uniforms.uAttractorEnabled.value  = config.gpgpuAttractorEnabled;
    velSimMat.uniforms.uAttractorType.value     = config.gpgpuAttractorType === 'lorenz' ? 0 : config.gpgpuAttractorType === 'rossler' ? 1 : 2;
    velSimMat.uniforms.uAttractorStrength.value = config.gpgpuAttractorStrength;
    velSimMat.uniforms.uAttractorScale.value    = config.gpgpuAttractorScale;
    velSimMat.uniforms.uVortexEnabled.value    = config.gpgpuVortexEnabled;
    velSimMat.uniforms.uVortexStrength.value   = config.gpgpuVortexStrength;
    velSimMat.uniforms.uVortexTilt.value       = config.gpgpuVortexTilt;
    velSimMat.uniforms.uWindEnabled.value      = config.gpgpuWindEnabled;
    velSimMat.uniforms.uWindStrength.value     = config.gpgpuWindStrength;
    velSimMat.uniforms.uWindX.value            = config.gpgpuWindX;
    velSimMat.uniforms.uWindY.value            = config.gpgpuWindY;
    velSimMat.uniforms.uWindZ.value            = config.gpgpuWindZ;
    velSimMat.uniforms.uWindGust.value         = config.gpgpuWindGust;
    velSimMat.uniforms.uWellEnabled.value      = config.gpgpuWellEnabled;
    velSimMat.uniforms.uWellStrength.value     = config.gpgpuWellStrength;
    velSimMat.uniforms.uWellSoftening.value    = config.gpgpuWellSoftening;
    velSimMat.uniforms.uWellOrbit.value        = config.gpgpuWellOrbit;
    velSimMat.uniforms.uElasticEnabled.value   = config.gpgpuElasticEnabled;
    velSimMat.uniforms.uElasticStrength.value  = config.gpgpuElasticStrength;
    velSimMat.uniforms.uMagneticEnabled.value  = config.gpgpuMagneticEnabled;
    velSimMat.uniforms.uMagneticStrength.value = config.gpgpuMagneticStrength;
    velSimMat.uniforms.uMagneticBX.value       = config.gpgpuMagneticBX;
    velSimMat.uniforms.uMagneticBY.value       = config.gpgpuMagneticBY;
    velSimMat.uniforms.uMagneticBZ.value       = config.gpgpuMagneticBZ;
    simMeshRef.current.material = velSimMat;
    glCtx.setRenderTarget(velOut); glCtx.render(simScene, simCamera);

    // Pass 2: position
    posSimMat.uniforms.uPosTex.value       = posIn.texture;
    posSimMat.uniforms.uVelTex.value       = velOut.texture;
    posSimMat.uniforms.uDelta.value        = dt;
    posSimMat.uniforms.uSpeed.value        = config.gpgpuSpeed;
    posSimMat.uniforms.uBounceRadius.value = config.gpgpuBounceRadius;
    posSimMat.uniforms.uAgeEnabled.value   = config.gpgpuAgeEnabled;
    posSimMat.uniforms.uAgeMax.value       = config.gpgpuAgeMax;
    simMeshRef.current.material = posSimMat;
    glCtx.setRenderTarget(posOut); glCtx.render(simScene, simCamera);

    // Pass 3: trail blit
    if (config.gpgpuTrailEnabled) {
      blitMat.uniforms.uTex.value = posOut.texture;
      simMeshRef.current.material = blitMat;
      glCtx.setRenderTarget(trailRTs[trailHead.current]);
      glCtx.render(simScene, simCamera);
      trailHead.current = (trailHead.current + 1) % MAX_TRAIL;
    }

    glCtx.setRenderTarget(null);
    pingIsA.current = !isA;

    // Update draw uniforms
    drawMat.uniforms.uPosTex.value             = posOut.texture;
    drawMat.uniforms.uVelTex.value             = velOut.texture;
    drawMat.uniforms.uColor.value.setStyle(config.gpgpuColor);
    drawMat.uniforms.uSize.value               = config.gpgpuSize;
    drawMat.uniforms.uOpacity.value            = config.gpgpuOpacity;
    drawMat.uniforms.uVelColorEnabled.value    = config.gpgpuVelColorEnabled;
    drawMat.uniforms.uVelColorHueMin.value     = config.gpgpuVelColorHueMin;
    drawMat.uniforms.uVelColorHueMax.value     = config.gpgpuVelColorHueMax;
    drawMat.uniforms.uVelColorSaturation.value = config.gpgpuVelColorSaturation;
    drawMat.uniforms.uAgeEnabled.value         = config.gpgpuAgeEnabled;
    drawMat.uniforms.uAgeMax.value             = config.gpgpuAgeMax;
    drawMat.uniforms.uAgeFadeIn.value          = config.gpgpuAgeFadeIn;
    drawMat.uniforms.uAgeFadeOut.value         = config.gpgpuAgeFadeOut;

    // Update trail uniforms
    if (config.gpgpuTrailEnabled) {
      const tLen = Math.min(MAX_TRAIL, Math.max(2, config.gpgpuTrailLength));
      for (let i = 0; i < MAX_TRAIL; i++) {
        const rtIdx = ((trailHead.current - 1 - i) + MAX_TRAIL * 2) % MAX_TRAIL;
        const alpha = i < tLen
          ? Math.pow(config.gpgpuTrailFade, i + 1) * config.gpgpuOpacity
          : 0;
        trailMats[i].uniforms.uPosTex.value        = trailRTs[rtIdx].texture;
        trailMats[i].uniforms.uVelTex.value        = velOut.texture;
        trailMats[i].uniforms.uColor.value.setStyle(config.gpgpuColor);
        trailMats[i].uniforms.uSize.value          = config.gpgpuSize;
        trailMats[i].uniforms.uAlpha.value         = alpha;
        trailMats[i].uniforms.uVelocityScale.value = config.gpgpuTrailVelocityScale;
      }
    }

    // Update geom uniforms
    if (config.gpgpuGeomMode !== 'point') {
      geomMat.uniforms.uPosTex.value        = posOut.texture;
      geomMat.uniforms.uVelTex.value        = velOut.texture;
      geomMat.uniforms.uColor.value.setStyle(config.gpgpuColor);
      geomMat.uniforms.uOpacity.value       = config.gpgpuOpacity;
      geomMat.uniforms.uGeomScale.value     = config.gpgpuBounceRadius * 0.02 * config.gpgpuGeomScale;
      geomMat.uniforms.uVelocityAlign.value = config.gpgpuGeomVelocityAlign ? 1 : 0;
    }
  });

  return (
    <>
      {config.gpgpuGeomMode === 'point' && (
        <points geometry={drawGeo} material={drawMat} />
      )}
      {geomMeshObj && config.gpgpuGeomMode !== 'point' && (
        <primitive object={geomMeshObj} />
      )}
      {config.gpgpuTrailEnabled && trailMats.map((mat, i) => (
        <points key={i} geometry={drawGeo} material={mat} />
      ))}
    </>
  );
});
GpgpuSystem.displayName = 'GpgpuSystem';
