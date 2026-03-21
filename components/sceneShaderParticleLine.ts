import { PHYSICS_LOGIC } from './scenePhysicsLogic';

export const LINE_VERTEX_SHADER = `
  precision highp float;
  ${PHYSICS_LOGIC}
  uniform float uTime;
  uniform float uGlobalSpeed; uniform float uGlobalAmp; uniform float uGlobalNoiseScale;
    uniform float uGlobalComplexity;
  uniform float uGlobalEvolution; uniform float uGlobalFidelity; uniform float uGlobalOctaveMult;
  uniform float uGlobalFreq; uniform float uGlobalRadius; uniform float uGlobalSize;
  uniform float uGravity; uniform vec3 uWind; uniform vec3 uSpin;
  uniform float uBoundaryY; uniform float uBoundaryEnabled; uniform float uBoundaryBounce;
  uniform float uViscosity; uniform float uFluidForce;
    uniform float uResistance; uniform float uMoveWithWind; uniform float uNeighborForce;
    uniform float uCollisionMode; uniform float uCollisionRadius; uniform float uRepulsion;
  uniform float uAffectPos; uniform vec2 uMouse; uniform float uMouseForce;
  uniform float uMouseRadius; uniform float uIsOrthographic;
  uniform float uAudioBassMotion; uniform float uAudioTrebleMotion; uniform float uAudioBassLine; uniform float uAudioTrebleLine; uniform float uAudioPulse; uniform float uAudioTwist; uniform float uAudioBend; uniform float uAudioWarp;
  uniform float uInterLayerEnabled; uniform int uInterLayerColliderCount; uniform vec4 uInterLayerColliders[MAX_INTER_LAYER_COLLIDERS]; uniform float uInterLayerStrength; uniform float uInterLayerPadding;
  uniform float uConnectDistance;
  uniform float uOpacity;
  uniform float uLife; uniform float uLifeSpread; uniform float uBurst; uniform float uBurstPhase; uniform float uBurstWaveform;
  attribute vec3 aPosA; attribute vec3 aOffA; attribute vec4 aData1A; attribute vec4 aData2A; attribute vec4 aData3A;
  attribute vec3 aPosB; attribute vec3 aOffB; attribute vec4 aData1B; attribute vec4 aData2B; attribute vec4 aData3B;
  attribute float aMix;
  varying float vAlpha;
  varying float vVelocity;
  varying float vBurst;
  vec3 applyAudioSpatialWarp(vec3 pos, vec3 origin, float timeValue, float amp, float phase, float variant) {
    float radiusNorm = clamp(length(pos.xz) / max(1.0, uGlobalRadius), 0.0, 3.0);
    float heightNorm = pos.y / max(1.0, uGlobalRadius);
    float twistAngle = uAudioTwist * (0.35 + variant * 0.85) * heightNorm * 2.8;
    float twistCos = cos(twistAngle);
    float twistSin = sin(twistAngle);
    pos.xz = mat2(twistCos, -twistSin, twistSin, twistCos) * pos.xz;
    float bendWave = sin(timeValue * 2.4 + phase + pos.y * 0.028) + cos(timeValue * 1.7 + phase * 0.7 + pos.x * 0.022);
    pos.x += bendWave * amp * uAudioBend * (0.08 + radiusNorm * 0.12);
    pos.z += cos(timeValue * 2.1 - phase + pos.x * 0.025) * amp * uAudioBend * (0.05 + abs(heightNorm) * 0.14);
    vec3 radialDir = normalize(vec3(pos.x, 0.0, pos.z) + vec3(0.0001));
    float warpWave = sin(length(pos.xz) * 0.045 - timeValue * 3.1 + phase) * 0.5 + 0.5;
    pos += radialDir * amp * uAudioWarp * mix(0.02, 0.12, warpWave) * (0.5 + variant * 0.6);
    pos.y += sin(length(origin.xz) * 0.03 + timeValue * 2.6 + phase) * amp * uAudioWarp * 0.08;
    return pos;
  }

  float getBurstEnvelope(float lifeProgress) {
    float burstEnvelope = 1.0 - smoothstep(0.0, 0.32, lifeProgress);
    if (uBurstWaveform > 0.5 && uBurstWaveform < 1.5) {
      burstEnvelope *= 0.85 + sin(lifeProgress * 6.28318530718) * 0.15;
    } else if (uBurstWaveform > 1.5 && uBurstWaveform < 2.5) {
      float pulseA = 1.0 - smoothstep(0.0, 0.09, abs(lifeProgress - 0.12));
      float pulseB = 1.0 - smoothstep(0.0, 0.09, abs(lifeProgress - 0.26));
      float pulseC = 1.0 - smoothstep(0.0, 0.09, abs(lifeProgress - 0.41));
      burstEnvelope = max(pulseA, max(pulseB, pulseC));
    } else if (uBurstWaveform >= 2.5) {
      float beatA = 1.0 - smoothstep(0.0, 0.1, abs(lifeProgress - 0.16));
      float beatB = 1.0 - smoothstep(0.0, 0.1, abs(lifeProgress - 0.31));
      burstEnvelope = max(beatA, beatB * 0.82);
    }
    return burstEnvelope;
  }

  vec3 getPos(vec3 p, vec3 off, vec4 d1, vec4 d2, vec4 d3) {
    float aPhase = d1.x; float aRandom = d1.y; float aMotionType = d1.z;
    float aBaseRadiusFactor = d1.w; float aSpeedFactor = d2.x; float aAmpFactor = d2.y;
    float aFreqFactor = d2.z; float aSizeFactor = d2.w;
    float aVariant = d3.z;
    float radius = aBaseRadiusFactor * uGlobalRadius;
    float speed = aSpeedFactor * uGlobalSpeed * (1.0 + uAudioTrebleMotion * 3.2);
    float amp = aAmpFactor * uGlobalAmp * (1.0 + uAudioBassMotion * 1.35);
    float trebleJitterMix = 1.0 + uAudioTrebleMotion * 1.8;
    float freq = aFreqFactor * uGlobalFreq * trebleJitterMix;
    float noiseScale = uGlobalNoiseScale * trebleJitterMix;
    float complexity = uGlobalComplexity * mix(1.0, trebleJitterMix, 0.6);

    vec3 result = calculateLayerPosition(
      p, off, aMotionType, uTime,
      speed, amp, freq, radius,
      aPhase, aRandom, uWind, noiseScale,
      uGlobalEvolution, complexity, uFluidForce, uViscosity,
      uGlobalFidelity, uGlobalOctaveMult, uAffectPos,
      uResistance, uMoveWithWind, uNeighborForce,
      uCollisionMode, uCollisionRadius, uRepulsion,
      uGravity, uBoundaryY, uBoundaryEnabled, uBoundaryBounce,
      uInterLayerEnabled, uInterLayerColliderCount, uInterLayerColliders, uInterLayerStrength,
      uInterLayerPadding
    );
    return applyAudioSpatialWarp(result, off, uTime, amp, aPhase, aVariant);
  }

  void main() {
    vec3 pA = getPos(aPosA, aOffA, aData1A, aData2A, aData3A);
    vec3 pB = getPos(aPosB, aOffB, aData1B, aData2B, aData3B);
    if (length(uSpin) > 0.001) {
      pA = rotate(pA, vec3(1,0,0), uSpin.x * uTime);
      pA = rotate(pA, vec3(0,1,0), uSpin.y * uTime);
      pA = rotate(pA, vec3(0,0,1), uSpin.z * uTime);
      pB = rotate(pB, vec3(1,0,0), uSpin.x * uTime);
      pB = rotate(pB, vec3(0,1,0), uSpin.y * uTime);
      pB = rotate(pB, vec3(0,0,1), uSpin.z * uTime);
    }
    float dist = distance(pA, pB);
    vec3 rigidA = aPosA * aData1A.w * uGlobalRadius + aOffA;
    vec3 rigidB = aPosB * aData1B.w * uGlobalRadius + aOffB;
    float velocityA = length(pA - rigidA);
    float velocityB = length(pB - rigidB);
    vVelocity = clamp((velocityA + velocityB) / max(1.0, uGlobalRadius * 0.35), 0.0, 1.5);
    vBurst = 0.0;
    if (uLife > 0.0) {
      float lifeA = max(4.0, uLife * mix(1.0 - uLifeSpread, 1.0 + uLifeSpread, aData3A.y));
      float lifeB = max(4.0, uLife * mix(1.0 - uLifeSpread, 1.0 + uLifeSpread, aData3B.y));
      float lifeProgressA = fract((uTime * 60.0) / lifeA + aData3A.x + uBurstPhase);
      float lifeProgressB = fract((uTime * 60.0) / lifeB + aData3B.x + uBurstPhase);
      vBurst = max(getBurstEnvelope(lifeProgressA), getBurstEnvelope(lifeProgressB)) * clamp(uBurst, 0.0, 2.0);
    }
    float audioLineBoost = 1.0 + uAudioBassLine * 0.95 + uAudioTrebleLine * 0.45 + uAudioPulse * 1.05;
    vAlpha = (1.0 - smoothstep(0.0, uConnectDistance, dist)) * uOpacity * audioLineBoost;
    if (dist > uConnectDistance) vAlpha = 0.0;
    vec3 finalPos = mix(pA, pB, aMix);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

export const LINE_FRAGMENT_SHADER = `
  precision highp float;
  varying float vAlpha;
  varying float vVelocity;
  varying float vBurst;
  uniform vec3 uColor;
  uniform float uContrast;
  uniform float uInkMode;
  uniform float uGlow;
  uniform float uTime;
  uniform float uLineVelocityGlow;
  uniform float uLineVelocityAlpha;
  uniform float uLineBurstPulse;
  uniform float uLineShimmer;
  uniform float uLineFlickerSpeed;
  void main() {
    if (vAlpha <= 0.01) discard;
    float glow = max(0.0, uGlow);
    float velocityGlow = 1.0 + vVelocity * uLineVelocityGlow;
    float velocityAlpha = 1.0 + vVelocity * uLineVelocityAlpha;
    float burstAlpha = 1.0 + vBurst * uLineBurstPulse;
    float shimmer = mix(1.0, 0.55 + 0.45 * sin(uTime * max(0.05, uLineFlickerSpeed) * (2.4 + vVelocity * 1.5) + vBurst * 8.0), clamp(uLineShimmer, 0.0, 1.0));
    float baseAlpha = clamp(vAlpha * max(0.4, uContrast) * (1.0 + glow * 0.3) * velocityAlpha * burstAlpha * shimmer, 0.0, 1.0);
    float inkAlpha = clamp(vAlpha * (1.4 + max(0.0, uContrast) * 0.65 + glow * 0.4) * velocityAlpha * burstAlpha * shimmer, 0.0, 1.0);
    baseAlpha = clamp(baseAlpha + vAlpha * glow * 0.18 * velocityGlow, 0.0, 1.0);
    inkAlpha = clamp(inkAlpha + vAlpha * glow * 0.24 * velocityGlow, 0.0, 1.0);
    gl_FragColor = vec4(uColor, mix(baseAlpha, inkAlpha, uInkMode));
  }
`;
