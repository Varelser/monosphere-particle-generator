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

  mat3 lookRot(vec3 dir) {
    vec3 up = abs(dir.y) < 0.99 ? vec3(0,1,0) : vec3(1,0,0);
    vec3 r  = normalize(cross(dir, up));
    vec3 u  = cross(r, dir);
    return mat3(r, u, dir);
  }

  void main() {
    vec3 instancePos = texture2D(uPosTex, aTexCoord).xyz;
    vec3 vel         = texture2D(uVelTex, aTexCoord).xyz;
    vec3 local       = position * uGeomScale;
    if (uVelocityAlign > 0.5) {
      float spd = length(vel);
      if (spd > 0.01) local = lookRot(vel / spd) * local;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(instancePos + local, 1.0);
  }
`;

// ── Instanced geometry fragment ──
const GEOM_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  void main() { gl_FragColor = vec4(uColor, uOpacity); }
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
      uGeomScale:    { value: config.gpgpuSize * 0.5 },
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
      geomMat.uniforms.uGeomScale.value     = config.gpgpuSize * 0.5 * config.gpgpuGeomScale;
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
