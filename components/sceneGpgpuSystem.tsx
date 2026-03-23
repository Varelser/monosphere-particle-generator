import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';

// ────────────────────────────────────────────
// GLSL: Fullscreen quad vertex (shared by all sim passes)
// ────────────────────────────────────────────
const SIM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// ────────────────────────────────────────────
// GLSL: Velocity simulation fragment
// Reads (posIn, velIn) → writes velOut
// ────────────────────────────────────────────
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
  varying vec2 vUv;

  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dot(hash3(i),              f),
              dot(hash3(i+vec3(1,0,0)),  f-vec3(1,0,0)), u.x),
          mix(dot(hash3(i+vec3(0,1,0)),  f-vec3(0,1,0)),
              dot(hash3(i+vec3(1,1,0)),  f-vec3(1,1,0)), u.x), u.y),
      mix(mix(dot(hash3(i+vec3(0,0,1)),  f-vec3(0,0,1)),
              dot(hash3(i+vec3(1,0,1)),  f-vec3(1,0,1)), u.x),
          mix(dot(hash3(i+vec3(0,1,1)),  f-vec3(0,1,1)),
              dot(hash3(i+vec3(1,1,1)),  f-vec3(1,1,1)), u.x), u.y)
    );
  }

  void main() {
    vec4 posData = texture2D(uPosTex, vUv);
    vec4 velData = texture2D(uVelTex, vUv);
    vec3 pos = posData.xyz;
    vec3 vel = velData.xyz;

    // Gravity
    vel.y -= uGravity * uDelta * 9.8;

    // Turbulence
    if (uTurbulence > 0.001) {
      float t = uTime * 0.25;
      vec3 np = pos * 0.007;
      vec3 turbForce = vec3(
        vnoise(np + vec3(t,      0.0,  0.0)),
        vnoise(np + vec3(0.0,  t + 13.7,  0.0)),
        vnoise(np + vec3(0.0,  0.0,  t + 27.4))
      ) * uTurbulence * 18.0;
      vel += turbForce * uDelta;
    }

    // Audio blast (radial explosion)
    if (uAudioBlast > 0.001) {
      vec3 dir = length(pos) > 0.001 ? normalize(pos) : vec3(0.0, 1.0, 0.0);
      vel += dir * uAudioBlast * 14.0 * uDelta;
    }

    // Speed cap
    float spd = length(vel);
    float maxSpd = 350.0;
    if (spd > maxSpd) vel *= maxSpd / spd;

    // Damping
    vel *= (1.0 - 1.1 * uDelta);

    // Boundary: velocity reflection
    float dist = length(pos);
    if (dist > uBounceRadius) {
      vec3 n = pos / dist;
      float vn = dot(vel, n);
      if (vn > 0.0) vel -= n * vn * (1.0 + uBounce);
    }

    gl_FragColor = vec4(vel, 0.0);
  }
`;

// ────────────────────────────────────────────
// GLSL: Position simulation fragment
// Reads (posIn, velIn_updated) → writes posOut
// ────────────────────────────────────────────
const SIM_POS_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uDelta;
  uniform float uSpeed;
  uniform float uBounceRadius;
  varying vec2 vUv;

  void main() {
    vec4 posData = texture2D(uPosTex, vUv);
    vec4 velData = texture2D(uVelTex, vUv);
    vec3 pos = posData.xyz;
    vec3 vel = velData.xyz;

    pos += vel * uDelta * uSpeed * 60.0;

    // Hard clamp: keep inside boundary sphere
    float dist = length(pos);
    if (dist > uBounceRadius * 1.05) {
      pos = normalize(pos) * uBounceRadius * 1.05;
    }

    gl_FragColor = vec4(pos, 1.0);
  }
`;

// ────────────────────────────────────────────
// GLSL: Draw vertex — reads position from texture
// ────────────────────────────────────────────
const DRAW_VERT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform float uSize;
  attribute vec2 aTexCoord;
  varying float vAlpha;

  void main() {
    vec4 posData = texture2D(uPosTex, aTexCoord);
    vec3 worldPos = posData.xyz;

    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    float dist = -mvPos.z;
    float sizeScale = dist > 0.5 ? min(4.0, 500.0 / dist) : 1.0;
    gl_PointSize = max(0.5, uSize * sizeScale);
    gl_Position = projectionMatrix * mvPos;
    vAlpha = 1.0;
  }
`;

// ────────────────────────────────────────────
// GLSL: Draw fragment — soft additive circle
// ────────────────────────────────────────────
const DRAW_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    vec2 pc = gl_PointCoord - 0.5;
    float d = length(pc);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.12, d) * vAlpha * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
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

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
type GpgpuSystemProps = {
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number }>;
  config: ParticleConfig;
  isPlaying: boolean;
};

export const GpgpuSystem: React.FC<GpgpuSystemProps> = React.memo(({ audioRef, config, isPlaying }) => {
  const { gl } = useThree();

  const texSize = useMemo(() => getTexSize(config.gpgpuCount), [config.gpgpuCount]);

  // ── Offscreen sim scene + camera (stable refs) ──
  const simScene = useMemo(() => new THREE.Scene(), []);
  const simCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const simGeo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  // ── Simulation materials ──
  const velSimMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:       { value: null },
      uVelTex:       { value: null },
      uDelta:        { value: 0.016 },
      uTime:         { value: 0 },
      uGravity:      { value: config.gpgpuGravity },
      uTurbulence:   { value: config.gpgpuTurbulence },
      uBounceRadius: { value: config.gpgpuBounceRadius },
      uBounce:       { value: config.gpgpuBounce },
      uAudioBlast:   { value: 0 },
    },
    vertexShader:   SIM_VERT,
    fragmentShader: SIM_VEL_FRAG,
  }), []);

  const posSimMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:       { value: null },
      uVelTex:       { value: null },
      uDelta:        { value: 0.016 },
      uSpeed:        { value: config.gpgpuSpeed },
      uBounceRadius: { value: config.gpgpuBounceRadius },
    },
    vertexShader:   SIM_VERT,
    fragmentShader: SIM_POS_FRAG,
  }), []);

  // Sim mesh (material is swapped each pass)
  const simMeshRef = useRef<THREE.Mesh | null>(null);
  useEffect(() => {
    const mesh = new THREE.Mesh(simGeo, velSimMat);
    simScene.add(mesh);
    simMeshRef.current = mesh;
    return () => {
      simScene.remove(mesh);
      simMeshRef.current = null;
    };
  }, [simGeo, velSimMat, simScene]);

  // ── Draw material ──
  const drawMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:  { value: null },
      uColor:   { value: new THREE.Color(config.gpgpuColor) },
      uSize:    { value: config.gpgpuSize },
      uOpacity: { value: config.gpgpuOpacity },
    },
    vertexShader:   DRAW_VERT,
    fragmentShader: DRAW_FRAG,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  }), []);

  // ── Draw geometry ──
  const drawGeo = useMemo(() => {
    const count = texSize * texSize;
    const geo = new THREE.BufferGeometry();
    const coords = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      coords[i * 2]     = ((i % texSize) + 0.5) / texSize;
      coords[i * 2 + 1] = (Math.floor(i / texSize) + 0.5) / texSize;
    }
    // Three.js requires a 'position' attribute on BufferGeometry used with Points
    geo.setAttribute('position',   new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aTexCoord',  new THREE.BufferAttribute(coords, 2));
    return geo;
  }, [texSize]);

  // ── Render targets (4 RTs: posPing, posPong, velPing, velPong) ──
  const rtRef = useRef<{
    posA: THREE.WebGLRenderTarget;
    posB: THREE.WebGLRenderTarget;
    velA: THREE.WebGLRenderTarget;
    velB: THREE.WebGLRenderTarget;
  } | null>(null);
  const pingIsA = useRef(true);

  useEffect(() => {
    // Dispose old
    if (rtRef.current) {
      rtRef.current.posA.dispose();
      rtRef.current.posB.dispose();
      rtRef.current.velA.dispose();
      rtRef.current.velB.dispose();
    }

    // Create new
    const posA = makeRT(texSize);
    const posB = makeRT(texSize);
    const velA = makeRT(texSize);
    const velB = makeRT(texSize);
    rtRef.current = { posA, posB, velA, velB };
    pingIsA.current = true;

    // Build initial data textures
    const count = texSize * texSize;
    const posData = new Float32Array(count * 4);
    const velData = new Float32Array(count * 4);
    const r = config.gpgpuBounceRadius;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const rad   = r * (0.1 + Math.random() * 0.9);
      const sp = Math.sin(phi), cp = Math.cos(phi);
      const st = Math.sin(theta), ct = Math.cos(theta);
      posData[i * 4]     = rad * sp * ct;
      posData[i * 4 + 1] = rad * sp * st;
      posData[i * 4 + 2] = rad * cp;
      posData[i * 4 + 3] = 1;
      velData[i * 4]     = (Math.random() - 0.5) * 4;
      velData[i * 4 + 1] = (Math.random() - 0.5) * 4;
      velData[i * 4 + 2] = (Math.random() - 0.5) * 4;
      velData[i * 4 + 3] = 0;
    }

    // Upload DataTexture → blit into RenderTarget A via copy render
    const copyScene  = new THREE.Scene();
    const copyCam    = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const copyGeo    = new THREE.PlaneGeometry(2, 2);

    const posTex = new THREE.DataTexture(posData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    posTex.needsUpdate = true;
    const velTex = new THREE.DataTexture(velData, texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    velTex.needsUpdate = true;

    const copyMat  = new THREE.MeshBasicMaterial({ map: posTex });
    const copyMesh = new THREE.Mesh(copyGeo, copyMat);
    copyScene.add(copyMesh);

    gl.setRenderTarget(posA);
    gl.render(copyScene, copyCam);

    copyMat.map = velTex;
    copyMat.needsUpdate = true;
    gl.setRenderTarget(velA);
    gl.render(copyScene, copyCam);

    gl.setRenderTarget(null);

    // Cleanup temp objects
    posTex.dispose();
    velTex.dispose();
    copyMat.dispose();
    copyGeo.dispose();

    return () => {
      rtRef.current?.posA.dispose();
      rtRef.current?.posB.dispose();
      rtRef.current?.velA.dispose();
      rtRef.current?.velB.dispose();
      rtRef.current = null;
    };
  }, [texSize, gl]);

  const timeRef = useRef(0);

  useFrame(({ gl: glCtx }, delta) => {
    if (!isPlaying || !rtRef.current || !simMeshRef.current) return;

    const clampedDelta = Math.min(delta, 0.05);
    timeRef.current += clampedDelta;

    const { posA, posB, velA, velB } = rtRef.current;
    const isA   = pingIsA.current;
    const posIn  = isA ? posA : posB;
    const posOut = isA ? posB : posA;
    const velIn  = isA ? velA : velB;
    const velOut = isA ? velB : velA;

    // Audio
    const blast = config.gpgpuAudioReactive && config.audioEnabled
      ? (audioRef.current.bass * 0.55 + audioRef.current.pulse * 0.9) * config.gpgpuAudioBlast
      : 0;

    // ── Pass 1: velocity update ──
    velSimMat.uniforms.uPosTex.value       = posIn.texture;
    velSimMat.uniforms.uVelTex.value       = velIn.texture;
    velSimMat.uniforms.uDelta.value        = clampedDelta;
    velSimMat.uniforms.uTime.value         = timeRef.current;
    velSimMat.uniforms.uGravity.value      = config.gpgpuGravity;
    velSimMat.uniforms.uTurbulence.value   = config.gpgpuTurbulence;
    velSimMat.uniforms.uBounceRadius.value = config.gpgpuBounceRadius;
    velSimMat.uniforms.uBounce.value       = config.gpgpuBounce;
    velSimMat.uniforms.uAudioBlast.value   = blast;

    simMeshRef.current.material = velSimMat;
    glCtx.setRenderTarget(velOut);
    glCtx.render(simScene, simCamera);

    // ── Pass 2: position update ──
    posSimMat.uniforms.uPosTex.value       = posIn.texture;
    posSimMat.uniforms.uVelTex.value       = velOut.texture;
    posSimMat.uniforms.uDelta.value        = clampedDelta;
    posSimMat.uniforms.uSpeed.value        = config.gpgpuSpeed;
    posSimMat.uniforms.uBounceRadius.value = config.gpgpuBounceRadius;

    simMeshRef.current.material = posSimMat;
    glCtx.setRenderTarget(posOut);
    glCtx.render(simScene, simCamera);

    glCtx.setRenderTarget(null);
    pingIsA.current = !isA;

    // ── Update draw uniforms ──
    drawMat.uniforms.uPosTex.value = posOut.texture;
    drawMat.uniforms.uColor.value.setStyle(config.gpgpuColor);
    drawMat.uniforms.uSize.value    = config.gpgpuSize;
    drawMat.uniforms.uOpacity.value = config.gpgpuOpacity;
  });

  return <points geometry={drawGeo} material={drawMat} />;
});
GpgpuSystem.displayName = 'GpgpuSystem';
