import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ParticleConfig } from '../types';
import { LodSystem } from '../lib/lodSystem';
import {
  initWebGPUCompute,
  stepWebGPUCompute,
  readbackWebGPUPositions,
  destroyWebGPUCompute,
} from '../lib/webgpuCompute';
import type { WebGPUComputeState } from '../lib/webgpuCompute';

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
  uniform bool  uSphEnabled;
  uniform float uSphPressure;
  uniform float uSphViscosity;
  uniform float uSphRadius;
  uniform float uSphRestDensity;
  uniform bool  uVFieldEnabled;
  uniform int   uVFieldType;
  uniform float uVFieldStrength;
  uniform float uVFieldScale;
  uniform bool  uSpringEnabled;
  uniform float uSpringStrength;
  uniform sampler2D uInitPosTex;
  uniform bool  uSdfEnabled;
  uniform int   uSdfShape;
  uniform float uSdfX;
  uniform float uSdfY;
  uniform float uSdfZ;
  uniform float uSdfSize;
  uniform float uSdfBounce;
  uniform bool  uMouseEnabled;
  uniform vec3  uMousePos;
  uniform float uMouseStrength;
  uniform float uMouseRadius;
  uniform int   uMouseMode;
  uniform bool  uFluidEnabled;
  uniform sampler2D uFluidTex;
  uniform float uFluidInfluence;
  uniform float uFluidScale;
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

    // SPH Fluid Simulation
    if (uSphEnabled) {
      float density = 0.0;
      vec3 pressureForce = vec3(0.0);
      vec3 viscForce = vec3(0.0);
      float h2 = uSphRadius * uSphRadius;
      float stride = uTexSizeF / float(uNBodySamples);
      for (int i = 0; i < 64; i++) {
        if (i >= uNBodySamples) break;
        float si = float(i) * stride;
        vec2 sUv = (vec2(mod(si, uTexSizeF), floor(si / uTexSizeF)) + 0.5) / uTexSizeF;
        if (length(sUv - vUv) < 1.5 / uTexSizeF) continue;
        vec3 oPos = texture2D(uPosTex, sUv).xyz;
        vec3 oVel = texture2D(uVelTex, sUv).xyz;
        vec3 r = pos - oPos;
        float r2 = dot(r, r);
        if (r2 < h2 && r2 > 0.001) {
          float q = sqrt(r2) / uSphRadius;
          float w = max(0.0, 1.0 - q * q);
          density += w;
          float pressure = uSphPressure * max(0.0, density - uSphRestDensity);
          pressureForce += normalize(r + vec3(0.0001)) * pressure * w;
          viscForce += (oVel - vel) * w * uSphViscosity;
        }
      }
      vel += (pressureForce + viscForce) * uDelta * 15.0;
    }

    // Vector Field
    if (uVFieldEnabled) {
      vec3 p = pos * uVFieldScale;
      float pr = length(p) + 0.001;
      vec3 f;
      if (uVFieldType == 0) { // dipole
        float r3 = pow(pr, 3.0);
        f = vec3(3.0*p.x*p.y, 3.0*p.y*p.y - dot(p,p), 3.0*p.y*p.z) / r3;
      } else if (uVFieldType == 1) { // saddle
        f = vec3(p.x, -p.y, sin(p.z * 3.14159));
      } else if (uVFieldType == 2) { // spiral sink
        f = vec3(-p.x - p.z, p.x - p.y, -p.z * 0.5);
      } else { // source-sink
        f = p / (pr * pr * pr);
      }
      vel += normalize(f + vec3(0.0001)) * uVFieldStrength * uDelta * 30.0;
    }

    // Spring to Spawn Position
    if (uSpringEnabled) {
      vec3 spawnPos = texture2D(uInitPosTex, vUv).xyz;
      vel += (spawnPos - pos) * uSpringStrength * uDelta * 3.0;
    }

    // SDF Collider — velocity reflection
    if (uSdfEnabled) {
      vec3 sc = vec3(uSdfX, uSdfY, uSdfZ);
      float sd; vec3 sn;
      if (uSdfShape == 0) {
        sd = length(pos - sc) - uSdfSize;
        sn = normalize(pos - sc + vec3(0.0001));
      } else if (uSdfShape == 1) {
        vec3 q = abs(pos - sc) - vec3(uSdfSize);
        sd = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        vec3 dq = pos - sc; vec3 aq = abs(dq); vec3 dd = aq - vec3(uSdfSize);
        if (max(dd.x, max(dd.y, dd.z)) > 0.0) sn = normalize(max(dd, 0.0) * sign(dq));
        else if (dd.x > dd.y && dd.x > dd.z) sn = vec3(sign(dq.x), 0.0, 0.0);
        else if (dd.y > dd.z) sn = vec3(0.0, sign(dq.y), 0.0);
        else sn = vec3(0.0, 0.0, sign(dq.z));
      } else if (uSdfShape == 2) {
        vec3 lp = pos - sc; float r2 = uSdfSize * 0.35;
        float ringD = length(lp.xz) - uSdfSize;
        sd = length(vec2(ringD, lp.y)) - r2;
        float lxz = length(lp.xz) + 0.001;
        sn = normalize(vec3(lp.x / lxz * ringD, lp.y, lp.z / lxz * ringD));
      } else {
        float yc = clamp(pos.y - sc.y, -uSdfSize, uSdfSize);
        vec3 dp = vec3(pos.x - sc.x, pos.y - sc.y - yc, pos.z - sc.z);
        sd = length(dp) - uSdfSize * 0.4;
        sn = normalize(dp + vec3(0.0001));
      }
      if (sd < 2.0) {
        float vn = dot(vel, sn);
        if (vn < 0.0) vel -= sn * vn * (1.0 + uSdfBounce);
      }
    }

    // Mouse Force
    if (uMouseEnabled) {
      vec3 toMouse = uMousePos - pos;
      float md = length(toMouse);
      if (md < uMouseRadius && md > 0.001) {
        float falloff = (1.0 - md / uMouseRadius);
        falloff *= falloff;
        vec3 dir = normalize(toMouse);
        if (uMouseMode == 0) { // attract
          vel += dir * falloff * uMouseStrength * uDelta * 200.0;
        } else if (uMouseMode == 1) { // repel
          vel -= dir * falloff * uMouseStrength * uDelta * 200.0;
        } else { // swirl
          vec3 swirl = cross(dir, vec3(0.0, 1.0, 0.001));
          vel += normalize(swirl) * falloff * uMouseStrength * uDelta * 150.0;
        }
      }
    }

    // Fluid Advection
    if (uFluidEnabled) {
      vec2 fieldUv = pos.xz / (uBounceRadius * uFluidScale) * 0.5 + 0.5;
      fieldUv = clamp(fieldUv, 0.001, 0.999);
      vec2 fieldVel = texture2D(uFluidTex, fieldUv).xy;
      vel.x += fieldVel.x * uFluidInfluence * uDelta * 300.0;
      vel.z += fieldVel.y * uFluidInfluence * uDelta * 300.0;
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
  uniform bool  uVerletEnabled;
  uniform sampler2D uPrevPosTex;
  uniform bool  uSdfEnabled;
  uniform int   uSdfShape;
  uniform float uSdfX;
  uniform float uSdfY;
  uniform float uSdfZ;
  uniform float uSdfSize;
  uniform float uSdfBounce;
  varying vec2 vUv;

  float hash1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec4 posData = texture2D(uPosTex, vUv);
    vec3 pos = posData.xyz;
    float age = posData.w;
    vec3 vel = texture2D(uVelTex, vUv).xyz;

    if (uVerletEnabled) {
      vec3 prevPos = texture2D(uPrevPosTex, vUv).xyz;
      pos = pos + (pos - prevPos) * 0.98 + vel * uDelta * uSpeed * 30.0;
    } else {
      pos += vel * uDelta * uSpeed * 60.0;
    }

    float dist = length(pos);
    if (dist > uBounceRadius * 1.05) pos = normalize(pos) * uBounceRadius * 1.05;

    // SDF Collider — position push-out
    if (uSdfEnabled) {
      vec3 sc = vec3(uSdfX, uSdfY, uSdfZ);
      float sd; vec3 sn;
      if (uSdfShape == 0) {
        sd = length(pos - sc) - uSdfSize;
        sn = normalize(pos - sc + vec3(0.0001));
      } else if (uSdfShape == 1) {
        vec3 q = abs(pos - sc) - vec3(uSdfSize);
        sd = length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
        vec3 dq = pos - sc; vec3 aq = abs(dq); vec3 dd = aq - vec3(uSdfSize);
        if (max(dd.x, max(dd.y, dd.z)) > 0.0) sn = normalize(max(dd, 0.0) * sign(dq));
        else if (dd.x > dd.y && dd.x > dd.z) sn = vec3(sign(dq.x), 0.0, 0.0);
        else if (dd.y > dd.z) sn = vec3(0.0, sign(dq.y), 0.0);
        else sn = vec3(0.0, 0.0, sign(dq.z));
      } else if (uSdfShape == 2) {
        vec3 lp = pos - sc; float r2 = uSdfSize * 0.35;
        float ringD = length(lp.xz) - uSdfSize;
        sd = length(vec2(ringD, lp.y)) - r2;
        float lxz = length(lp.xz) + 0.001;
        sn = normalize(vec3(lp.x / lxz * ringD, lp.y, lp.z / lxz * ringD));
      } else {
        float yc = clamp(pos.y - sc.y, -uSdfSize, uSdfSize);
        vec3 dp = vec3(pos.x - sc.x, pos.y - sc.y - yc, pos.z - sc.z);
        sd = length(dp) - uSdfSize * 0.4;
        sn = normalize(dp + vec3(0.0001));
      }
      if (sd < 0.0) pos -= sn * sd;
    }

    if (uAgeEnabled) {
      age += uDelta;
      if (age > uAgeMax) {
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

// ── Sort: depth computation (stores uvX, uvY, viewZ per particle) ──
const SORT_DEPTH_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform mat4 uViewMatrix;
  varying vec2 vUv;
  void main() {
    vec3 pos = texture2D(uPosTex, vUv).xyz;
    float viewZ = -(uViewMatrix * vec4(pos, 1.0)).z;
    gl_FragColor = vec4(vUv.x, vUv.y, viewZ, 1.0);
  }
`;

// ── Sort: bitonic sort pass (one compare-swap step) ──
const SORT_BITONIC_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uSortIn;
  uniform float uTexSizeF;
  uniform float uStep;
  uniform float uStage;
  varying vec2 vUv;
  void main() {
    float fw   = uTexSizeF;
    float ix   = floor(vUv.x * fw);
    float iy   = floor(vUv.y * fw);
    float i    = iy * fw + ix;
    float stepSize   = pow(2.0, uStep);
    float blockSzDir = pow(2.0, uStage + 1.0);
    // Arithmetic XOR: partner index = i XOR stepSize
    float bitInStep = mod(floor(i / stepSize), 2.0);
    float l = i + (bitInStep < 0.5 ? stepSize : -stepSize);
    if (l < 0.0 || l >= fw * fw) { gl_FragColor = texture2D(uSortIn, vUv); return; }
    float lx = mod(l, fw);
    float ly = floor(l / fw);
    vec2 partnerUv = (vec2(lx, ly) + 0.5) / fw;
    vec4 myData      = texture2D(uSortIn, vUv);
    vec4 partnerData = texture2D(uSortIn, partnerUv);
    float myDepth      = myData.z;
    float partnerDepth = partnerData.z;
    // origAsc=true for even blocks. Invert comparison for descending final order (far=0).
    bool origAsc = mod(floor(i / blockSzDir), 2.0) < 0.5;
    bool shouldSwap;
    if (i < l) {
      shouldSwap = origAsc ? (myDepth < partnerDepth) : (myDepth > partnerDepth);
    } else {
      shouldSwap = origAsc ? (myDepth > partnerDepth) : (myDepth < partnerDepth);
    }
    gl_FragColor = shouldSwap ? partnerData : myData;
  }
`;

// ── Fluid advection (Semi-Lagrangian Navier-Stokes simplified) ──
const FLUID_ADVECT_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uFluidIn;
  uniform float uDelta;
  uniform float uFluidDiffuse;
  uniform float uFluidDecay;
  uniform float uFluidStrength;
  uniform float uTime;
  uniform bool  uFluidExtForce;
  varying vec2 vUv;
  void main() {
    vec2 uv  = vUv;
    vec2 vel = texture2D(uFluidIn, uv).xy;
    float ts = 1.0 / 64.0;
    // Semi-Lagrangian backward trace
    vec2 backPos = uv - vel * uDelta * ts * 80.0;
    vec2 advVel  = texture2D(uFluidIn, backPos).xy;
    // 5-point Laplacian diffusion
    vec2 vL = texture2D(uFluidIn, uv + vec2(-ts, 0.0)).xy;
    vec2 vR = texture2D(uFluidIn, uv + vec2( ts, 0.0)).xy;
    vec2 vB = texture2D(uFluidIn, uv + vec2(0.0,-ts)).xy;
    vec2 vT = texture2D(uFluidIn, uv + vec2(0.0, ts)).xy;
    vec2 lap    = vL + vR + vB + vT - 4.0 * advVel;
    vec2 newVel = advVel + uFluidDiffuse * lap;
    // Exponential decay
    newVel *= 1.0 - uFluidDecay * uDelta * 60.0;
    // External forcing: rotating vortex + periodic perturbation
    if (uFluidExtForce) {
      vec2 c = uv - 0.5;
      float r = length(c) + 0.001;
      vec2 rot = vec2(-c.y, c.x) / (r * r + 0.1);
      newVel += rot * uFluidStrength * uDelta * 2.0;
      float t = uTime * 0.3;
      vec2 perturb = vec2(sin(uv.y * 6.2832 + t), cos(uv.x * 6.2832 - t)) * uFluidStrength * 0.3 * uDelta;
      newVel += perturb;
    }
    gl_FragColor = vec4(newVel, 0.0, 1.0);
  }
`;

// ── Draw vertex (main points) ──
const DRAW_VERT = /* glsl */ `
  precision highp float;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform sampler2D uSortTex;
  uniform bool      uSortEnabled;
  uniform float uSize;
  uniform bool  uAgeEnabled;
  uniform float uAgeMax;
  uniform bool  uAgeSizeEnabled;
  uniform float uAgeSizeStart;
  uniform float uAgeSizeEnd;
  attribute vec2 aTexCoord;
  varying float vSpeed;
  varying float vNormAge;
  void main() {
    vec2 particleUv = uSortEnabled ? texture2D(uSortTex, aTexCoord).xy : aTexCoord;
    vec4 posData  = texture2D(uPosTex, particleUv);
    vec3 worldPos = posData.xyz;
    vec3 vel      = texture2D(uVelTex, particleUv).xyz;
    vSpeed   = clamp(length(vel) / 80.0, 0.0, 1.0);
    vNormAge = uAgeEnabled ? clamp(posData.w / max(uAgeMax, 0.001), 0.0, 1.0) : 0.5;
    float sizeMul = uAgeSizeEnabled ? mix(uAgeSizeStart, uAgeSizeEnd, vNormAge) : 1.0;
    vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);
    float dist = -mvPos.z;
    gl_PointSize = max(0.5, uSize * sizeMul * (dist > 0.5 ? min(4.0, 500.0 / dist) : 1.0));
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
  uniform bool  uAgeColorEnabled;
  uniform vec3  uAgeColorYoung;
  uniform vec3  uAgeColorOld;
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
    if (uAgeColorEnabled) {
      col = mix(uAgeColorYoung, uAgeColorOld, vNormAge);
    } else if (uVelColorEnabled) {
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

// ── Streak vertex (velocity-direction line segments) ──
const STREAK_VERT = /* glsl */ `
  precision highp float;
  attribute vec2  aTexCoord;
  attribute float aIsEnd;
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uStreakLength;
  uniform bool  uAgeEnabled;
  uniform float uAgeMax;
  varying float vEndAlpha;
  varying float vNormAge;
  void main() {
    vec4 posData = texture2D(uPosTex, aTexCoord);
    vec3 pos     = posData.xyz;
    vec3 vel     = texture2D(uVelTex, aTexCoord).xyz;
    float spd    = length(vel);
    vEndAlpha    = 1.0 - aIsEnd;
    vNormAge     = uAgeEnabled ? clamp(posData.w / max(uAgeMax, 0.001), 0.0, 1.0) : 0.5;
    vec3 worldPos = pos - normalize(vel + vec3(0.0001)) * aIsEnd * uStreakLength * min(spd * 0.05, 1.0);
    gl_Position   = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  }
`;

// ── Streak fragment ──
const STREAK_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform bool  uAgeEnabled;
  uniform float uAgeFadeIn;
  uniform float uAgeFadeOut;
  varying float vEndAlpha;
  varying float vNormAge;
  void main() {
    float ageFade = 1.0;
    if (uAgeEnabled) {
      ageFade  = smoothstep(0.0, uAgeFadeIn, vNormAge);
      ageFade *= smoothstep(1.0, 1.0 - uAgeFadeOut, vNormAge);
    }
    gl_FragColor = vec4(uColor, uOpacity * vEndAlpha * ageFade);
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
function makeFluidRT(size: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
  rt.texture.wrapS = THREE.RepeatWrapping;
  rt.texture.wrapT = THREE.RepeatWrapping;
  return rt;
}
const FLUID_SIZE = 64;

// ── Component ──
type GpgpuSystemProps = {
  audioRef: React.MutableRefObject<{ bass: number; treble: number; pulse: number }>;
  config: ParticleConfig;
  isPlaying: boolean;
};

export const GpgpuSystem: React.FC<GpgpuSystemProps> = React.memo(({ audioRef, config, isPlaying }) => {
  const { gl, camera } = useThree();
  const mouseNDC      = useRef(new THREE.Vector2(0, 0));
  const mouseWorldRef = useRef(new THREE.Vector3(0, 0, 0));
  const _mVec         = useRef(new THREE.Vector3());
  const _mDir         = useRef(new THREE.Vector3());

  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseNDC.current.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouseNDC.current.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    };
    canvas.addEventListener('mousemove', onMove);
    return () => canvas.removeEventListener('mousemove', onMove);
  }, [gl.domElement]);

  const lodSystem = useMemo(() => new LodSystem(), []);
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
      uSphEnabled:      { value: false },
      uSphPressure:     { value: 3.0 },
      uSphViscosity:    { value: 0.5 },
      uSphRadius:       { value: 40.0 },
      uSphRestDensity:  { value: 2.0 },
      uVFieldEnabled:   { value: false },
      uVFieldType:      { value: 2 },
      uVFieldStrength:  { value: 1.0 },
      uVFieldScale:     { value: 0.005 },
      uSpringEnabled:   { value: false },
      uSpringStrength:  { value: 1.0 },
      uInitPosTex:      { value: null },
      uSdfEnabled:      { value: false },
      uSdfShape:        { value: 0 },
      uSdfX:            { value: 0.0 },
      uSdfY:            { value: 0.0 },
      uSdfZ:            { value: 0.0 },
      uSdfSize:         { value: 80.0 },
      uSdfBounce:       { value: 0.5 },
      uMouseEnabled:    { value: false },
      uMousePos:        { value: new THREE.Vector3(0, 0, 0) },
      uMouseStrength:   { value: 2.0 },
      uMouseRadius:     { value: 150.0 },
      uMouseMode:       { value: 0 },
      uFluidEnabled:    { value: false },
      uFluidTex:        { value: null },
      uFluidInfluence:  { value: 0.8 },
      uFluidScale:      { value: 1.5 },
    },
    vertexShader: SIM_VERT, fragmentShader: SIM_VEL_FRAG,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const posSimMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:        { value: null },
      uVelTex:        { value: null },
      uDelta:         { value: 0.016 },
      uSpeed:         { value: config.gpgpuSpeed },
      uBounceRadius:  { value: config.gpgpuBounceRadius },
      uAgeEnabled:    { value: false },
      uAgeMax:        { value: 8.0 },
      uVerletEnabled: { value: false },
      uPrevPosTex:    { value: null },
      uSdfEnabled:    { value: false },
      uSdfShape:      { value: 0 },
      uSdfX:          { value: 0.0 },
      uSdfY:          { value: 0.0 },
      uSdfZ:          { value: 0.0 },
      uSdfSize:       { value: 80.0 },
      uSdfBounce:     { value: 0.5 },
    },
    vertexShader: SIM_VERT, fragmentShader: SIM_POS_FRAG,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const blitMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTex: { value: null } },
    vertexShader: SIM_VERT, fragmentShader: BLIT_FRAG,
  }), []);

  const sortDepthMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:     { value: null },
      uViewMatrix: { value: new THREE.Matrix4() },
    },
    vertexShader: SIM_VERT, fragmentShader: SORT_DEPTH_FRAG,
  }), []);

  const bitonicMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSortIn:   { value: null },
      uTexSizeF: { value: 64.0 },
      uStep:     { value: 0.0 },
      uStage:    { value: 0.0 },
    },
    vertexShader: SIM_VERT, fragmentShader: SORT_BITONIC_FRAG,
  }), []);

  const fluidAdvectMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uFluidIn:       { value: null },
      uDelta:         { value: 0.016 },
      uFluidDiffuse:  { value: 0.02 },
      uFluidDecay:    { value: 0.01 },
      uFluidStrength: { value: 1.0 },
      uTime:          { value: 0.0 },
      uFluidExtForce: { value: false },
    },
    vertexShader: SIM_VERT, fragmentShader: FLUID_ADVECT_FRAG,
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
      uAgeColorEnabled:   { value: false },
      uAgeColorYoung:     { value: new THREE.Color('#00aaff') },
      uAgeColorOld:       { value: new THREE.Color('#ff4400') },
      uAgeSizeEnabled:    { value: false },
      uAgeSizeStart:      { value: 2.0 },
      uAgeSizeEnd:        { value: 0.2 },
      uSortTex:           { value: null },
      uSortEnabled:       { value: false },
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

  // ── Streak geometry + material ──
  const streakGeo = useMemo(() => {
    const count = texSize * texSize;
    const geo   = new THREE.BufferGeometry();
    const coords = new Float32Array(count * 4);
    const ends   = new Float32Array(count * 2);
    const pos    = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const u = ((i % texSize) + 0.5) / texSize;
      const v = (Math.floor(i / texSize) + 0.5) / texSize;
      coords[i*4+0] = u; coords[i*4+1] = v;
      coords[i*4+2] = u; coords[i*4+3] = v;
      ends[i*2+0] = 0; ends[i*2+1] = 1;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aTexCoord', new THREE.BufferAttribute(coords, 2));
    geo.setAttribute('aIsEnd',    new THREE.BufferAttribute(ends, 1));
    return geo;
  }, [texSize]);

  const streakMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uPosTex:       { value: null },
      uVelTex:       { value: null },
      uColor:        { value: new THREE.Color(config.gpgpuColor) },
      uOpacity:      { value: 0.6 },
      uStreakLength: { value: 15.0 },
      uAgeEnabled:   { value: false },
      uAgeMax:       { value: 8.0 },
      uAgeFadeIn:    { value: 0.1 },
      uAgeFadeOut:   { value: 0.2 },
    },
    vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

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
  const prevPosRTRef  = useRef<THREE.WebGLRenderTarget | null>(null);
  const initPosTexRef = useRef<THREE.DataTexture | null>(null);
  const fluidRTARef   = useRef<THREE.WebGLRenderTarget | null>(null);
  const fluidRTBRef   = useRef<THREE.WebGLRenderTarget | null>(null);
  const fluidPingIsA  = useRef(true);
  const sortRTARef    = useRef<THREE.WebGLRenderTarget | null>(null);
  const sortRTBRef    = useRef<THREE.WebGLRenderTarget | null>(null);
  const webgpuStateRef   = useRef<WebGPUComputeState | null>(null);
  const webgpuPosTexRef  = useRef<THREE.DataTexture | null>(null);
  const webgpuPingIsARef = useRef(true);

  useEffect(() => {
    if (rtRef.current) {
      rtRef.current.posA.dispose(); rtRef.current.posB.dispose();
      rtRef.current.velA.dispose(); rtRef.current.velB.dispose();
    }
    prevPosRTRef.current?.dispose();
    initPosTexRef.current?.dispose();

    const posA = makeRT(texSize), posB = makeRT(texSize);
    const velA = makeRT(texSize), velB = makeRT(texSize);
    const prevPos = makeRT(texSize);
    rtRef.current = { posA, posB, velA, velB };
    prevPosRTRef.current = prevPos;
    pingIsA.current = true;

    const count = texSize * texSize;
    const posData = new Float32Array(count * 4);
    const velData = new Float32Array(count * 4);
    const r = config.gpgpuBounceRadius;
    const shape = config.gpgpuEmitShape;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      let px = 0, py = 0, pz = 0;
      if (shape === 'disc') {
        const rad = r * Math.sqrt(Math.random());
        px = rad * Math.cos(theta); py = 0; pz = rad * Math.sin(theta);
      } else if (shape === 'ring') {
        const rad = r * (0.85 + Math.random() * 0.15);
        px = rad * Math.cos(theta); py = (Math.random() - 0.5) * r * 0.08; pz = rad * Math.sin(theta);
      } else if (shape === 'box') {
        px = (Math.random() - 0.5) * 2 * r;
        py = (Math.random() - 0.5) * 2 * r;
        pz = (Math.random() - 0.5) * 2 * r;
      } else if (shape === 'shell') {
        const phi = Math.acos(2 * Math.random() - 1);
        px = r * Math.sin(phi) * Math.cos(theta);
        py = r * Math.sin(phi) * Math.sin(theta);
        pz = r * Math.cos(phi);
      } else if (shape === 'cone') {
        const h = Math.random() * r;
        const cr = (h / r) * r;
        px = cr * Math.cos(theta); py = h - r * 0.5; pz = cr * Math.sin(theta);
      } else { // sphere (default)
        const phi = Math.acos(2 * Math.random() - 1);
        const rad = r * (0.1 + Math.random() * 0.9);
        px = rad * Math.sin(phi) * Math.cos(theta);
        py = rad * Math.sin(phi) * Math.sin(theta);
        pz = rad * Math.cos(phi);
      }
      posData[i*4] = px; posData[i*4+1] = py; posData[i*4+2] = pz; posData[i*4+3] = 1;
      velData[i*4]   = (Math.random() - 0.5) * 4;
      velData[i*4+1] = (Math.random() - 0.5) * 4;
      velData[i*4+2] = (Math.random() - 0.5) * 4;
    }

    // Static initPosTex for Spring feature
    const initTex = new THREE.DataTexture(posData.slice(), texSize, texSize, THREE.RGBAFormat, THREE.FloatType);
    initTex.needsUpdate = true;
    initPosTexRef.current = initTex;

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
    // Initialize prevPos with same data as posA
    gl.setRenderTarget(prevPos); gl.render(copyScene, copyCam);
    copyMat.map = velTex; copyMat.needsUpdate = true;
    gl.setRenderTarget(velA); gl.render(copyScene, copyCam);
    gl.setRenderTarget(null);
    posTex.dispose(); velTex.dispose(); copyMat.dispose(); copyGeo.dispose();

    // Sort RTs (same size as particle textures, NearestFilter)
    sortRTARef.current?.dispose();
    sortRTBRef.current?.dispose();
    sortRTARef.current = makeRT(texSize);
    sortRTBRef.current = makeRT(texSize);

    // Fluid RTs (fixed 64x64, LinearFilter with RepeatWrapping)
    fluidRTARef.current?.dispose();
    fluidRTBRef.current?.dispose();
    fluidRTARef.current = makeFluidRT(FLUID_SIZE);
    fluidRTBRef.current = makeFluidRT(FLUID_SIZE);
    fluidPingIsA.current = true;
    // Initialize fluid field with a swirling vortex pattern
    const fluidInitData = new Float32Array(FLUID_SIZE * FLUID_SIZE * 4);
    for (let fi = 0; fi < FLUID_SIZE * FLUID_SIZE; fi++) {
      const fu = (fi % FLUID_SIZE) / FLUID_SIZE - 0.5;
      const fv = Math.floor(fi / FLUID_SIZE) / FLUID_SIZE - 0.5;
      const fr = Math.sqrt(fu * fu + fv * fv) + 0.001;
      fluidInitData[fi * 4 + 0] = -fv / (fr * fr + 0.1) * 0.08;
      fluidInitData[fi * 4 + 1] =  fu / (fr * fr + 0.1) * 0.08;
      fluidInitData[fi * 4 + 2] = 0;
      fluidInitData[fi * 4 + 3] = 1;
    }
    const fluidInitTex = new THREE.DataTexture(fluidInitData, FLUID_SIZE, FLUID_SIZE, THREE.RGBAFormat, THREE.FloatType);
    fluidInitTex.needsUpdate = true;
    const fluidCopyMat = new THREE.MeshBasicMaterial({ map: fluidInitTex });
    const fluidCopyMesh = new THREE.Mesh(copyGeo, fluidCopyMat);
    copyScene.add(fluidCopyMesh);
    gl.setRenderTarget(fluidRTARef.current); gl.render(copyScene, copyCam);
    gl.setRenderTarget(fluidRTBRef.current); gl.render(copyScene, copyCam);
    gl.setRenderTarget(null);
    copyScene.remove(fluidCopyMesh);
    fluidCopyMat.dispose(); fluidInitTex.dispose();

    // WebGPU Compute Backend — async init; destroy previous state first
    if (webgpuStateRef.current) { destroyWebGPUCompute(webgpuStateRef.current); webgpuStateRef.current = null; }
    webgpuPosTexRef.current?.dispose(); webgpuPosTexRef.current = null;
    // posData / velData captured in closure
    const wgPos = posData.slice() as Float32Array;
    const wgVel = velData.slice() as Float32Array;
    initWebGPUCompute(texSize, wgPos, wgVel).then(state => {
      webgpuStateRef.current = state;
      webgpuPingIsARef.current = true;
      if (state) {
        const dt = new THREE.DataTexture(
          new Float32Array(texSize * texSize * 4),
          texSize, texSize,
          THREE.RGBAFormat, THREE.FloatType,
        );
        dt.needsUpdate = true;
        webgpuPosTexRef.current = dt;
      }
    });

    return () => {
      rtRef.current?.posA.dispose(); rtRef.current?.posB.dispose();
      rtRef.current?.velA.dispose(); rtRef.current?.velB.dispose();
      rtRef.current = null;
      prevPosRTRef.current?.dispose(); prevPosRTRef.current = null;
      initPosTexRef.current?.dispose(); initPosTexRef.current = null;
      sortRTARef.current?.dispose(); sortRTARef.current = null;
      sortRTBRef.current?.dispose(); sortRTBRef.current = null;
      fluidRTARef.current?.dispose(); fluidRTARef.current = null;
      fluidRTBRef.current?.dispose(); fluidRTBRef.current = null;
      if (webgpuStateRef.current) { destroyWebGPUCompute(webgpuStateRef.current); webgpuStateRef.current = null; }
      webgpuPosTexRef.current?.dispose(); webgpuPosTexRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texSize, gl, config.gpgpuEmitShape]);

  const timeRef = useRef(0);

  useFrame(({ gl: glCtx }, delta) => {
    if (!isPlaying || !rtRef.current || !simMeshRef.current) return;

    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    if (config.autoLod) lodSystem.update(dt);

    const { posA, posB, velA, velB } = rtRef.current;
    const isA   = pingIsA.current;
    const posIn  = isA ? posA : posB;
    const posOut = isA ? posB : posA;
    const velIn  = isA ? velA : velB;
    const velOut = isA ? velB : velA;

    const blast = config.gpgpuAudioReactive && config.audioEnabled
      ? (audioRef.current.bass * 0.55 + audioRef.current.pulse * 0.9) * config.gpgpuAudioBlast
      : 0;

    // Update mouse world position
    _mVec.current.set(mouseNDC.current.x, mouseNDC.current.y, 0.5).unproject(camera);
    _mDir.current.copy(_mVec.current).sub(camera.position).normalize();
    mouseWorldRef.current.copy(camera.position).addScaledVector(_mDir.current, camera.position.length());

    // Pass 0: blit current pos to prevPos (for Verlet)
    if (config.gpgpuVerletEnabled && prevPosRTRef.current) {
      blitMat.uniforms.uTex.value = posIn.texture;
      simMeshRef.current.material = blitMat;
      glCtx.setRenderTarget(prevPosRTRef.current);
      glCtx.render(simScene, simCamera);
    }

    // Pass 1a: fluid field advection (before velocity pass)
    if (config.gpgpuFluidEnabled && fluidRTARef.current && fluidRTBRef.current) {
      const fluidIn  = fluidPingIsA.current ? fluidRTARef.current : fluidRTBRef.current;
      const fluidOut = fluidPingIsA.current ? fluidRTBRef.current : fluidRTARef.current;
      fluidAdvectMat.uniforms.uFluidIn.value       = fluidIn.texture;
      fluidAdvectMat.uniforms.uDelta.value         = dt;
      fluidAdvectMat.uniforms.uFluidDiffuse.value  = config.gpgpuFluidDiffuse;
      fluidAdvectMat.uniforms.uFluidDecay.value    = config.gpgpuFluidDecay;
      fluidAdvectMat.uniforms.uFluidStrength.value = config.gpgpuFluidStrength;
      fluidAdvectMat.uniforms.uTime.value          = timeRef.current;
      fluidAdvectMat.uniforms.uFluidExtForce.value = config.gpgpuFluidExtForce;
      simMeshRef.current.material = fluidAdvectMat;
      glCtx.setRenderTarget(fluidOut);
      glCtx.render(simScene, simCamera);
      fluidPingIsA.current = !fluidPingIsA.current;
      const currentFluid = fluidPingIsA.current ? fluidRTARef.current : fluidRTBRef.current;
      velSimMat.uniforms.uFluidEnabled.value   = true;
      velSimMat.uniforms.uFluidTex.value       = currentFluid.texture;
      velSimMat.uniforms.uFluidInfluence.value = config.gpgpuFluidInfluence;
      velSimMat.uniforms.uFluidScale.value     = config.gpgpuFluidScale;
    } else {
      velSimMat.uniforms.uFluidEnabled.value = false;
    }

    // Pass 1 (WebGPU path): skip WebGL sim, use native compute
    const useWebGPU = config.gpgpuWebGPUEnabled && webgpuStateRef.current !== null && webgpuPosTexRef.current !== null;
    if (useWebGPU && webgpuStateRef.current) {
      stepWebGPUCompute(
        webgpuStateRef.current,
        webgpuPingIsARef.current,
        dt,
        timeRef.current,
        config.gpgpuGravity,
        config.gpgpuTurbulence,
        config.gpgpuBounceRadius,
        config.gpgpuBounce,
        config.gpgpuSpeed,
      );
      webgpuPingIsARef.current = !webgpuPingIsARef.current;
      const wgPosTex = webgpuPosTexRef.current!;
      readbackWebGPUPositions(webgpuStateRef.current).then(data => {
        wgPosTex.image.data.set(data);
        wgPosTex.needsUpdate = true;
      });
    }

    // Pass 1: velocity (WebGL path — skipped when WebGPU is active)
    if (!useWebGPU) {
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
    velSimMat.uniforms.uSphEnabled.value      = config.gpgpuSphEnabled;
    velSimMat.uniforms.uSphPressure.value     = config.gpgpuSphPressure;
    velSimMat.uniforms.uSphViscosity.value    = config.gpgpuSphViscosity;
    velSimMat.uniforms.uSphRadius.value       = config.gpgpuSphRadius;
    velSimMat.uniforms.uSphRestDensity.value  = config.gpgpuSphRestDensity;
    velSimMat.uniforms.uVFieldEnabled.value   = config.gpgpuVFieldEnabled;
    velSimMat.uniforms.uVFieldType.value      = config.gpgpuVFieldType === 'dipole' ? 0 : config.gpgpuVFieldType === 'saddle' ? 1 : config.gpgpuVFieldType === 'spiral' ? 2 : 3;
    velSimMat.uniforms.uVFieldStrength.value  = config.gpgpuVFieldStrength;
    velSimMat.uniforms.uVFieldScale.value     = config.gpgpuVFieldScale;
    velSimMat.uniforms.uSpringEnabled.value   = config.gpgpuSpringEnabled;
    velSimMat.uniforms.uSpringStrength.value  = config.gpgpuSpringStrength;
    velSimMat.uniforms.uInitPosTex.value      = initPosTexRef.current;
    velSimMat.uniforms.uSdfEnabled.value      = config.gpgpuSdfEnabled;
    velSimMat.uniforms.uSdfShape.value        = config.gpgpuSdfShape === 'sphere' ? 0 : config.gpgpuSdfShape === 'box' ? 1 : config.gpgpuSdfShape === 'torus' ? 2 : 3;
    velSimMat.uniforms.uSdfX.value            = config.gpgpuSdfX;
    velSimMat.uniforms.uSdfY.value            = config.gpgpuSdfY;
    velSimMat.uniforms.uSdfZ.value            = config.gpgpuSdfZ;
    velSimMat.uniforms.uSdfSize.value         = config.gpgpuSdfSize;
    velSimMat.uniforms.uSdfBounce.value       = config.gpgpuSdfBounce;
    velSimMat.uniforms.uMouseEnabled.value    = config.gpgpuMouseEnabled;
    velSimMat.uniforms.uMousePos.value.copy(mouseWorldRef.current);
    velSimMat.uniforms.uMouseStrength.value   = config.gpgpuMouseStrength;
    velSimMat.uniforms.uMouseRadius.value     = config.gpgpuMouseRadius;
    velSimMat.uniforms.uMouseMode.value       = config.gpgpuMouseMode === 'attract' ? 0 : config.gpgpuMouseMode === 'repel' ? 1 : 2;
    simMeshRef.current.material = velSimMat;
    glCtx.setRenderTarget(velOut); glCtx.render(simScene, simCamera);

    // Pass 2: position
    posSimMat.uniforms.uPosTex.value       = posIn.texture;
    posSimMat.uniforms.uVelTex.value       = velOut.texture;
    posSimMat.uniforms.uDelta.value        = dt;
    posSimMat.uniforms.uSpeed.value        = config.gpgpuSpeed;
    posSimMat.uniforms.uBounceRadius.value = config.gpgpuBounceRadius;
    posSimMat.uniforms.uAgeEnabled.value    = config.gpgpuAgeEnabled;
    posSimMat.uniforms.uAgeMax.value        = config.gpgpuAgeMax;
    posSimMat.uniforms.uVerletEnabled.value = config.gpgpuVerletEnabled;
    posSimMat.uniforms.uPrevPosTex.value    = prevPosRTRef.current?.texture ?? null;
    posSimMat.uniforms.uSdfEnabled.value    = config.gpgpuSdfEnabled;
    posSimMat.uniforms.uSdfShape.value      = config.gpgpuSdfShape === 'sphere' ? 0 : config.gpgpuSdfShape === 'box' ? 1 : config.gpgpuSdfShape === 'torus' ? 2 : 3;
    posSimMat.uniforms.uSdfX.value          = config.gpgpuSdfX;
    posSimMat.uniforms.uSdfY.value          = config.gpgpuSdfY;
    posSimMat.uniforms.uSdfZ.value          = config.gpgpuSdfZ;
    posSimMat.uniforms.uSdfSize.value       = config.gpgpuSdfSize;
    posSimMat.uniforms.uSdfBounce.value     = config.gpgpuSdfBounce;
    simMeshRef.current.material = posSimMat;
    glCtx.setRenderTarget(posOut); glCtx.render(simScene, simCamera);
    } // end !useWebGPU

    // Pass 2.5: depth compute + GPU bitonic sort
    let finalSortTex: THREE.Texture | null = null;
    if (config.gpgpuSortEnabled && sortRTARef.current && sortRTBRef.current) {
      // Compute depth per particle into sortRTA
      sortDepthMat.uniforms.uPosTex.value = posOut.texture;
      sortDepthMat.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);
      simMeshRef.current.material = sortDepthMat;
      glCtx.setRenderTarget(sortRTARef.current);
      glCtx.render(simScene, simCamera);

      // Bitonic sort passes
      const logN = Math.log2(texSize * texSize);
      let spingA = true;
      bitonicMat.uniforms.uTexSizeF.value = texSize;
      for (let stage = 0; stage < logN; stage++) {
        for (let step = stage; step >= 0; step--) {
          const sIn  = spingA ? sortRTARef.current : sortRTBRef.current;
          const sOut = spingA ? sortRTBRef.current : sortRTARef.current;
          bitonicMat.uniforms.uSortIn.value = sIn.texture;
          bitonicMat.uniforms.uStep.value   = step;
          bitonicMat.uniforms.uStage.value  = stage;
          simMeshRef.current.material = bitonicMat;
          glCtx.setRenderTarget(sOut);
          glCtx.render(simScene, simCamera);
          spingA = !spingA;
        }
      }
      finalSortTex = (spingA ? sortRTBRef.current : sortRTARef.current).texture;
    }

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

    // Sparse GPGPU + LOD: limit draw to active particle count
    const lodCount = config.autoLod ? lodSystem.getEffectiveCount(config.gpgpuCount) : config.gpgpuCount;
    const activeCount = Math.min(lodCount, texSize * texSize);
    // LOD: skip expensive N-body/SPH/Boids passes when performance is low
    if (config.autoLod && lodSystem.shouldSkipExpensive()) {
      velSimMat.uniforms.uNBodyEnabled.value = false;
      velSimMat.uniforms.uSphEnabled.value   = false;
      velSimMat.uniforms.uBoidsEnabled.value = false;
    }
    drawGeo.setDrawRange(0, activeCount);
    streakGeo.setDrawRange(0, activeCount * 2);

    // Update draw uniforms
    drawMat.uniforms.uPosTex.value             = useWebGPU && webgpuPosTexRef.current ? webgpuPosTexRef.current : posOut.texture;
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
    drawMat.uniforms.uAgeColorEnabled.value    = config.gpgpuAgeColorEnabled;
    drawMat.uniforms.uAgeColorYoung.value.setStyle(config.gpgpuAgeColorYoung);
    drawMat.uniforms.uAgeColorOld.value.setStyle(config.gpgpuAgeColorOld);
    drawMat.uniforms.uAgeSizeEnabled.value     = config.gpgpuAgeSizeEnabled;
    drawMat.uniforms.uAgeSizeStart.value       = config.gpgpuAgeSizeStart;
    drawMat.uniforms.uAgeSizeEnd.value         = config.gpgpuAgeSizeEnd;
    drawMat.uniforms.uSortEnabled.value        = config.gpgpuSortEnabled && finalSortTex !== null;
    drawMat.uniforms.uSortTex.value            = finalSortTex;
    drawMat.blending = config.gpgpuSortEnabled ? THREE.NormalBlending : THREE.AdditiveBlending;

    // Update streak uniforms
    if (config.gpgpuStreakEnabled) {
      streakMat.uniforms.uPosTex.value       = posOut.texture;
      streakMat.uniforms.uVelTex.value       = velOut.texture;
      streakMat.uniforms.uColor.value.setStyle(config.gpgpuColor);
      streakMat.uniforms.uOpacity.value      = config.gpgpuStreakOpacity;
      streakMat.uniforms.uStreakLength.value = config.gpgpuStreakLength;
      streakMat.uniforms.uAgeEnabled.value   = config.gpgpuAgeEnabled;
      streakMat.uniforms.uAgeMax.value       = config.gpgpuAgeMax;
      streakMat.uniforms.uAgeFadeIn.value    = config.gpgpuAgeFadeIn;
      streakMat.uniforms.uAgeFadeOut.value   = config.gpgpuAgeFadeOut;
    }

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
      {config.gpgpuStreakEnabled && (
        <lineSegments geometry={streakGeo} material={streakMat} />
      )}
    </>
  );
});
GpgpuSystem.displayName = 'GpgpuSystem';
