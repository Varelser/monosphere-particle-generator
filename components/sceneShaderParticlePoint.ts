import { PHYSICS_LOGIC } from './scenePhysicsLogic';

export const PARTICLE_VERTEX_SHADER = `
  precision highp float;
  ${PHYSICS_LOGIC}
  uniform float uTime; uniform float uOpacity; uniform float uAudioBassMotion; uniform float uAudioTrebleMotion; uniform float uAudioBassSize; uniform float uAudioTrebleSize; uniform float uAudioBassAlpha; uniform float uAudioTrebleAlpha; uniform float uAudioPulse; uniform float uAudioMorph; uniform float uAudioShatter; uniform float uAudioTwist; uniform float uAudioBend; uniform float uAudioWarp;
  uniform float uGlobalSpeed; uniform float uGlobalAmp; uniform float uGlobalNoiseScale;
    uniform float uGlobalComplexity;
  uniform float uGlobalEvolution; uniform float uGlobalFidelity; uniform float uGlobalOctaveMult;
  uniform float uGlobalFreq; uniform float uGlobalRadius; uniform float uGlobalSize;
  uniform float uInstanced3D; uniform float uInstanced3DScale;
  uniform float uGravity; uniform vec3 uWind;
  uniform vec3 uSpin;
  uniform float uBoundaryY; uniform float uBoundaryEnabled; uniform float uBoundaryBounce;
  uniform float uViscosity; uniform float uFluidForce;
    uniform float uResistance; uniform float uMoveWithWind; uniform float uNeighborForce;
    uniform float uCollisionMode; uniform float uCollisionRadius; uniform float uRepulsion;
    uniform float uTrail; uniform float uLife; uniform float uLifeSpread; uniform float uLifeSizeBoost; uniform float uLifeSizeTaper; uniform float uBurst; uniform float uBurstPhase; uniform float uBurstMode; uniform float uBurstWaveform; uniform float uBurstSweepSpeed; uniform float uBurstSweepTilt; uniform float uBurstConeWidth; uniform float uEmitterOrbitSpeed; uniform float uEmitterOrbitRadius; uniform float uEmitterPulseAmount; uniform float uTrailDrag; uniform float uTrailTurbulence; uniform float uTrailDrift; uniform float uVelocityGlow; uniform float uVelocityAlpha; uniform float uFlickerAmount; uniform float uFlickerSpeed; uniform float uStreak; uniform float uSpriteMode; uniform float uAuxLife; uniform float uIsAux;
  uniform float uAffectPos; uniform vec2 uMouse; uniform float uMouseForce;
  uniform float uMouseRadius; uniform float uIsOrthographic;
        uniform float uInterLayerEnabled; uniform int uInterLayerColliderCount; uniform vec4 uInterLayerColliders[MAX_INTER_LAYER_COLLIDERS]; uniform float uInterLayerStrength; uniform float uInterLayerPadding;
  attribute vec3 aPosition; attribute vec3 aOffset; attribute vec4 aData1; attribute vec4 aData2; attribute vec4 aData3;
  varying float vAlpha; varying vec2 vUv; varying float vLife; varying float vVelocity; varying float vSpriteMode; varying float vVariant; varying float vBurst;
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
    vec3 tearNoise = noiseVec(pos * (0.04 + uAudioShatter * 0.02) + vec3(timeValue * 1.9 + phase));
    vec3 tearDir = normalize(vec3(tearNoise.x, tearNoise.y * 0.35 + sin(phase + timeValue), tearNoise.z) + vec3(0.0001));
    float tearMask = smoothstep(0.15, 0.95, fract(variant * 7.13 + tearNoise.x * 0.5 + timeValue * 0.12));
    pos += tearDir * amp * uAudioShatter * tearMask * mix(0.02, 0.16, variant);
    return pos;
  }
  void main() {
    vUv = uv; float aPhase = aData1.x; float aRandom = aData1.y; float aMotionType = aData1.z;
    float aBaseRadiusFactor = aData1.w; float aSpeedFactor = aData2.x; float aAmpFactor = aData2.y;
    float aFreqFactor = aData2.z; float aSizeFactor = aData2.w;
    float aSpawnOffset = aData3.x; float aLifeJitter = aData3.y; float aVariant = aData3.z;
    float radius = aBaseRadiusFactor * uGlobalRadius;
    float speed = aSpeedFactor * uGlobalSpeed * (1.0 + uAudioTrebleMotion * 3.2);
    float amp = aAmpFactor * uGlobalAmp * (1.0 + uAudioBassMotion * 1.35);
    float trebleJitterMix = 1.0 + uAudioTrebleMotion * 1.8;
    float freq = aFreqFactor * uGlobalFreq * trebleJitterMix;
    float noiseScale = uGlobalNoiseScale * trebleJitterMix;
    float complexity = uGlobalComplexity * mix(1.0, trebleJitterMix, 0.6);
    float prevTime = max(uTime - 0.04, 0.0);
    float emitterOrbitPhase = uTime * max(0.0, uEmitterOrbitSpeed);
    float prevEmitterOrbitPhase = prevTime * max(0.0, uEmitterOrbitSpeed);
    float emitterPulse = 1.0 + sin(uTime * max(0.05, uEmitterOrbitSpeed) * 1.6 + aPhase) * uEmitterPulseAmount + uAudioPulse * (0.08 + aVariant * 0.08);
    float prevEmitterPulse = 1.0 + sin(prevTime * max(0.05, uEmitterOrbitSpeed) * 1.6 + aPhase) * uEmitterPulseAmount + uAudioPulse * (0.06 + aVariant * 0.05);
    vec3 animatedOffset = aOffset * emitterPulse;
    vec3 prevAnimatedOffset = aOffset * prevEmitterPulse;
    if (uEmitterOrbitRadius > 0.0 || length(aOffset.xz) > 0.001) {
      animatedOffset = rotate(animatedOffset, vec3(0.0, 1.0, 0.0), emitterOrbitPhase);
      prevAnimatedOffset = rotate(prevAnimatedOffset, vec3(0.0, 1.0, 0.0), prevEmitterOrbitPhase);
    }
    vec3 emitterOrbitOffset = vec3(cos(emitterOrbitPhase), sin(emitterOrbitPhase * 0.5) * 0.25, sin(emitterOrbitPhase)) * uEmitterOrbitRadius;
    vec3 prevEmitterOrbitOffset = vec3(cos(prevEmitterOrbitPhase), sin(prevEmitterOrbitPhase * 0.5) * 0.25, sin(prevEmitterOrbitPhase)) * uEmitterOrbitRadius;
    animatedOffset += emitterOrbitOffset;
    prevAnimatedOffset += prevEmitterOrbitOffset;

    vec3 pos = calculateLayerPosition(
        aPosition, animatedOffset, aMotionType, uTime,
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
    // prevPos is only needed for trail/streak rendering. Skip the full physics recalculation
    // when neither trail nor streak is active (uniform is the same for all particles in the warp).
    bool needPrevPos = (uTrail > 0.001 || uStreak > 0.001);
    vec3 prevPos = pos; // default: no delta → trailDelta = 0

    if (needPrevPos) {
      prevPos = calculateLayerPosition(
          aPosition, prevAnimatedOffset, aMotionType, prevTime,
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
    }

    if (uAudioMorph > 0.001) {
      float altMotionType = mod(aMotionType + 17.0 + floor(aVariant * 11.0), 90.0);
      vec3 morphPos = calculateLayerPosition(
        aPosition, animatedOffset, altMotionType, uTime * (1.02 + aVariant * 0.12),
        speed, amp, freq * (1.0 + aVariant * 0.15), radius,
        aPhase + 1.7, aRandom, uWind, noiseScale,
        uGlobalEvolution, complexity, uFluidForce, uViscosity,
        uGlobalFidelity, uGlobalOctaveMult, uAffectPos,
        uResistance, uMoveWithWind, uNeighborForce,
        uCollisionMode, uCollisionRadius, uRepulsion,
        uGravity, uBoundaryY, uBoundaryEnabled, uBoundaryBounce,
        uInterLayerEnabled, uInterLayerColliderCount, uInterLayerColliders, uInterLayerStrength,
        uInterLayerPadding
      );
      float morphMix = clamp(uAudioMorph * (0.22 + aVariant * 0.48), 0.0, 0.92);
      pos = mix(pos, morphPos, morphMix);

      if (needPrevPos) {
        vec3 prevMorphPos = calculateLayerPosition(
          aPosition, prevAnimatedOffset, altMotionType, prevTime * (1.02 + aVariant * 0.12),
          speed, amp, freq * (1.0 + aVariant * 0.15), radius,
          aPhase + 1.7, aRandom, uWind, noiseScale,
          uGlobalEvolution, complexity, uFluidForce, uViscosity,
          uGlobalFidelity, uGlobalOctaveMult, uAffectPos,
          uResistance, uMoveWithWind, uNeighborForce,
          uCollisionMode, uCollisionRadius, uRepulsion,
          uGravity, uBoundaryY, uBoundaryEnabled, uBoundaryBounce,
          uInterLayerEnabled, uInterLayerColliderCount, uInterLayerColliders, uInterLayerStrength,
          uInterLayerPadding
        );
        prevPos = mix(prevPos, prevMorphPos, morphMix);
      }
    }

    if (length(uSpin) > 0.001) {
        pos = rotate(pos, vec3(1,0,0), uSpin.x * uTime);
        pos = rotate(pos, vec3(0,1,0), uSpin.y * uTime);
        pos = rotate(pos, vec3(0,0,1), uSpin.z * uTime);
        if (needPrevPos) {
          prevPos = rotate(prevPos, vec3(1,0,0), uSpin.x * prevTime);
          prevPos = rotate(prevPos, vec3(0,1,0), uSpin.y * prevTime);
          prevPos = rotate(prevPos, vec3(0,0,1), uSpin.z * prevTime);
        }
    }
    pos = applyAudioSpatialWarp(pos, animatedOffset, uTime, amp, aPhase, aVariant);
    if (needPrevPos) {
      prevPos = applyAudioSpatialWarp(prevPos, prevAnimatedOffset, prevTime, amp, aPhase, aVariant);
    }

    float lifeAlpha = 1.0;
    float lifeProgress = 0.0;
    if (uLife > 0.0) {
      float particleLife = max(4.0, uLife * mix(1.0 - uLifeSpread, 1.0 + uLifeSpread, aLifeJitter));
      lifeProgress = fract((uTime * 60.0) / particleLife + aSpawnOffset + uBurstPhase);
      float burstEnvelope = 1.0 - smoothstep(0.0, 0.32, lifeProgress);
      float burstTailStart = mix(0.92, 0.36, clamp(uBurst, 0.0, 1.0));
      lifeAlpha = smoothstep(0.0, 0.08, lifeProgress) * (1.0 - smoothstep(burstTailStart, 1.0, lifeProgress));
      if (uBurstWaveform > 0.5 && uBurstWaveform < 1.5) {
        burstEnvelope *= 0.85 + sin(lifeProgress * 6.28318530718) * 0.15;
      } else if (uBurstWaveform > 1.5 && uBurstWaveform < 2.5) {
        float pulseA = 1.0 - smoothstep(0.0, 0.09, abs(lifeProgress - 0.12));
        float pulseB = 1.0 - smoothstep(0.0, 0.09, abs(lifeProgress - 0.26));
        float pulseC = 1.0 - smoothstep(0.0, 0.09, abs(lifeProgress - 0.41));
        burstEnvelope = max(pulseA, max(pulseB, pulseC));
        lifeAlpha *= 0.78 + burstEnvelope * 0.4;
      } else if (uBurstWaveform >= 2.5) {
        float beatA = 1.0 - smoothstep(0.0, 0.1, abs(lifeProgress - 0.16));
        float beatB = 1.0 - smoothstep(0.0, 0.1, abs(lifeProgress - 0.31));
        burstEnvelope = max(beatA, beatB * 0.82);
        lifeAlpha *= 0.82 + burstEnvelope * 0.3;
      }
      float burstPush = clamp(uBurst, 0.0, 2.0) * burstEnvelope;
      vec3 burstDir = normalize((pos - animatedOffset) + vec3(0.0001));
      if (uBurstMode > 0.5 && uBurstMode < 1.5) {
        float coneWidth = mix(0.08, 1.05, clamp(uBurstConeWidth, 0.0, 1.0));
        burstDir = normalize(vec3(
          sin(aPhase) * coneWidth * mix(0.12, 0.65, aVariant),
          mix(1.15, 0.22, clamp(uBurstConeWidth, 0.0, 1.0)) * mix(0.65, 1.0, aLifeJitter),
          cos(aPhase) * coneWidth * mix(0.12, 0.65, aVariant)
        ) + vec3(0.0001));
      } else if (uBurstMode >= 1.5) {
        float sweepAngle = uTime * max(0.05, uBurstSweepSpeed) + aPhase;
        float sweepTilt = mix(-0.9, 0.9, clamp(uBurstSweepTilt, 0.0, 1.0));
        vec3 sweepDir = normalize(vec3(cos(sweepAngle), sweepTilt + sin(uTime * max(0.05, uBurstSweepSpeed) * 0.75 + aVariant * 6.2831) * 0.25, sin(sweepAngle)) + vec3(0.0001));
        burstDir = mix(burstDir, sweepDir, 0.82);
      }
      pos += burstDir * amp * burstPush * mix(0.08, 0.2, aVariant);
      float dragMix = clamp(uTrailDrag, 0.0, 1.5) * clamp(lifeProgress, 0.0, 1.0);
      pos = mix(pos, animatedOffset + (pos - animatedOffset) * (1.0 - dragMix * 0.55), dragMix * 0.3);
      vec3 turbulence = noiseVec((pos + animatedOffset) * (0.02 + uTrailTurbulence * 0.018) + vec3(uTime * 0.35 + aPhase));
      pos += turbulence * amp * uTrailTurbulence * burstEnvelope * 0.05;
      vec3 driftDir = normalize(uWind + vec3(0.0001));
      pos += driftDir * amp * uTrailDrift * (0.25 + lifeProgress * 0.75) * 0.06;
    }
    pos += normalize((pos - animatedOffset) + vec3(0.0001)) * amp * uAudioPulse * mix(0.018, 0.072, aVariant);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vec4 prevMvPosition = modelViewMatrix * vec4(prevPos, 1.0);

    if (uMouseForce != 0.0) {
        vec3 mouseWorld;
        if (uIsOrthographic > 0.5) { mouseWorld = vec3(uMouse.x * 500.0, uMouse.y * 500.0, 0.0); }
        else { mouseWorld = vec3(uMouse.x * 200.0, uMouse.y * 200.0, -uGlobalRadius); }
        float distToMouse = distance(mvPosition.xyz, mouseWorld);
        if (distToMouse < uMouseRadius) {
            float force = (1.0 - distToMouse / uMouseRadius) * uMouseForce * 20.0;
            mvPosition.xyz += normalize(mvPosition.xyz - mouseWorld) * force;
        }
    }

    float dist = -mvPosition.z;
    if (uIsOrthographic < 0.5 && dist <= 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vLife = 0.0;
      vVelocity = 0.0;
      vSpriteMode = uSpriteMode;
      vVariant = aVariant;
      vBurst = 0.0;
      vAlpha = 0.0;
      return;
    }
    float sizeScale = (uIsOrthographic > 0.5) ? 1.0 : min(2.5, 400.0 / max(1.0, dist));
    float audioSizeBoost = 1.0 + uAudioBassSize * 1.85 + uAudioTrebleSize * 0.45 + uAudioPulse * 1.15;
    float pSize = aSizeFactor * uGlobalSize * sizeScale * audioSizeBoost;
    float lifeSizeScale = 1.0;
    if (uLife > 0.0) {
      float lifeBloom = sin(clamp(lifeProgress, 0.0, 1.0) * 3.14159265359);
      float lifeTaper = smoothstep(0.58, 1.0, lifeProgress);
      lifeSizeScale = max(0.15, 1.0 + lifeBloom * uLifeSizeBoost - lifeTaper * uLifeSizeTaper);
    }
    pSize *= lifeSizeScale;
    if (uIsAux > 0.5) {
      float auxLifeProgress = fract((uTime * 60.0) / max(1.0, uAuxLife) + aRandom);
      float auxLifeAlpha = smoothstep(0.0, 0.12, auxLifeProgress) * (1.0 - smoothstep(0.65, 1.0, auxLifeProgress));
      lifeAlpha *= auxLifeAlpha;
      pSize *= mix(0.65, 1.35, auxLifeAlpha);
    }
    float clampedSize = clamp(pSize, 0.0, 500.0);
    vec2 trailDelta = mvPosition.xy - prevMvPosition.xy;
    float trailMagnitude = length(trailDelta);
    vec2 trailDir = trailMagnitude > 0.0001 ? normalize(trailDelta) : vec2(0.0, 1.0);
    vec2 trailPerp = vec2(-trailDir.y, trailDir.x);
    float dragTrailBoost = 1.0 + clamp(uTrailDrag, 0.0, 1.5) * clamp(lifeProgress, 0.0, 1.0);
    float trailAmount = clamp(uTrail, 0.0, 0.99) * clamp(trailMagnitude * 25.0, 0.0, 8.0) * (1.0 + max(0.0, uStreak) * 1.35) * dragTrailBoost;
    float streakStretch = 1.0 + trailAmount * (0.2 + max(0.0, uStreak));
    float streakWidth = max(0.16, 1.0 - trailAmount * 0.08 * (0.6 + max(0.0, uStreak)));

    if (uInstanced3D > 0.5) {
      // World-space 3D geometry: position.xyz is the local vertex of the geometry (cube/tetra)
      float geomSize = aSizeFactor * uGlobalSize * uInstanced3DScale;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + position.xyz * geomSize, 1.0);
    } else {
      mvPosition.xy += trailPerp * position.x * clampedSize * streakWidth + trailDir * position.y * clampedSize * streakStretch;
      gl_Position = projectionMatrix * mvPosition;
    }
    vLife = lifeProgress;
    vVelocity = clamp(trailMagnitude * 40.0, 0.0, 1.0);
    vSpriteMode = uSpriteMode;
    vVariant = aVariant;
    vBurst = clamp(uBurst, 0.0, 1.0) * (1.0 - smoothstep(0.0, 0.6, lifeProgress));
    float audioAlphaBoost = 1.0 + uAudioBassAlpha * 0.95 + uAudioTrebleAlpha * 0.35 + uAudioPulse * 0.85;
    vAlpha = uOpacity * lifeAlpha * (1.0 - smoothstep(2000.0, 5000.0, length(pos))) * (1.0 + clamp(uTrail, 0.0, 0.99) * 0.35) * audioAlphaBoost;
  }
`;

export const FRAGMENT_SHADER = `
  precision highp float;
  varying float vAlpha;
  varying vec2 vUv;
  varying float vLife;
  varying float vVelocity;
  varying float vSpriteMode;
  varying float vVariant;
  varying float vBurst;
  uniform vec3 uColor;
  uniform float uContrast;
  uniform float uInkMode;
  uniform float uSoftness;
  uniform float uGlow;
  uniform float uVelocityGlow;
  uniform float uVelocityAlpha;
  uniform float uTime;
  uniform float uFlickerAmount;
  uniform float uFlickerSpeed;
  uniform float uHueShift;
  uniform int uSdfShape;
  uniform float uSdfEnabled;
  uniform vec2 uSdfLight;
  uniform float uSdfSpecular;
  uniform float uSdfShininess;
  uniform float uSdfAmbient;

  // SDF shape functions (uv in [0,1] x [0,1], return signed dist; negative = inside)
  float sdfCircle(vec2 p, float r) {
    return length(p) - r;
  }
  float sdfRing(vec2 p, float r, float thickness) {
    return abs(length(p) - r) - thickness;
  }
  float sdfStar(vec2 p, float r) {
    // 5-pointed star
    float angle = atan(p.y, p.x) - 1.5707963;
    float slice = 6.28318530718 / 5.0;
    float a = mod(angle, slice) - slice * 0.5;
    float d = length(p);
    float x = cos(a) * d - r;
    float y = abs(sin(a) * d) - r * 0.4;
    return max(x, y) * 0.85;
  }
  float sdfHexagon(vec2 p, float r) {
    const vec2 k = vec2(-0.866025404, 0.5);
    vec2 q = abs(p);
    q -= 2.0 * min(dot(k, q), 0.0) * k;
    q -= vec2(clamp(q.x, -k.y * r, k.y * r), r);
    return length(q) * sign(q.y);
  }

  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
  }
  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float dist = length(vUv - 0.5);
    if (dist > 0.5) discard;
    float contrast = max(0.05, uContrast);
    float softness = clamp(uSoftness, 0.0, 1.0);
    float glow = max(0.0, uGlow);
    float innerEdge = mix(0.26, 0.08, softness);
    float outerEdge = mix(0.44, 0.62, softness);
    float edge = pow(clamp(1.0 - smoothstep(innerEdge, outerEdge, dist), 0.0, 1.0), 1.0 / contrast);
    float velocityGlow = 1.0 + vVelocity * uVelocityGlow;
    float halo = pow(clamp(1.0 - smoothstep(0.12, 0.5, dist), 0.0, 1.0), mix(2.8, 1.2, clamp(glow, 0.0, 1.0)));
    halo *= velocityGlow;
    float spriteAlpha = edge;
    if (vSpriteMode > 0.5 && vSpriteMode < 1.5) {
      float ringCenter = mix(0.22, 0.34, clamp(vLife, 0.0, 1.0));
      float ringWidth = mix(0.12, 0.05, softness);
      float ring = 1.0 - smoothstep(ringWidth, ringWidth + 0.08, abs(dist - ringCenter));
      float core2 = 1.0 - smoothstep(0.0, 0.12, dist);
      spriteAlpha = max(ring, core2 * 0.35);
    } else if (vSpriteMode >= 1.5) {
      vec2 centered = vUv - 0.5;
      float spokeA = 1.0 - smoothstep(0.01, 0.09 + (1.0 - vVelocity) * 0.06, abs(centered.x) + abs(centered.y) * 0.42);
      float spokeB = 1.0 - smoothstep(0.01, 0.09 + (1.0 - vVelocity) * 0.06, abs(centered.y) + abs(centered.x) * 0.42);
      float ember = 1.0 - smoothstep(0.08, 0.42, dist);
      spriteAlpha = max(max(spokeA, spokeB) * (0.55 + vVelocity * 0.75), ember * 0.4);
    }
    float velocityAlpha = 1.0 + vVelocity * uVelocityAlpha;
    float flickerPhase = uTime * max(0.05, uFlickerSpeed) * (2.6 + vVelocity * 1.8) + vVariant * 13.7 + vLife * 9.0;
    float flicker = mix(1.0, 0.55 + 0.45 * sin(flickerPhase), clamp(uFlickerAmount, 0.0, 1.0));
    flicker = mix(flicker, 1.0, clamp(vBurst, 0.0, 1.0) * 0.22);
    float baseAlpha = clamp(vAlpha * spriteAlpha * mix(0.8, 1.25, clamp((contrast - 0.5) / 1.5, 0.0, 1.0)) * velocityAlpha * flicker, 0.0, 1.0);
    baseAlpha = clamp(baseAlpha + vAlpha * halo * glow * 0.45, 0.0, 1.0);
    float core = 1.0 - smoothstep(0.0, mix(0.3, 0.18, softness), dist);
    float body = 1.0 - smoothstep(0.05, mix(0.5, 0.35, softness), dist);
    float inkAlpha = clamp(vAlpha * (0.45 + core * 1.15 + body * 0.9 + halo * glow * 0.35 + spriteAlpha * 0.45) * max(1.0, contrast * 0.9) * velocityAlpha * flicker, 0.0, 1.0);
    float alpha = mix(baseAlpha, inkAlpha, uInkMode);
    vec3 finalColor = uColor;
    if (abs(uHueShift) > 0.001) {
      vec3 hsv = rgb2hsv(finalColor);
      hsv.x = fract(hsv.x + uHueShift);
      finalColor = hsv2rgb(hsv);
    }

    // SDF shape + pseudo-3D lighting
    if (uSdfEnabled > 0.5) {
      vec2 p = vUv - 0.5; // [-0.5, 0.5]
      float sdfDist;
      if (uSdfShape == 1) {
        // ring
        sdfDist = sdfRing(p, 0.28, 0.08);
      } else if (uSdfShape == 2) {
        // star
        sdfDist = sdfStar(p, 0.38);
      } else if (uSdfShape == 3) {
        // hexagon
        sdfDist = sdfHexagon(p, 0.38);
      } else {
        // sphere (default)
        sdfDist = sdfCircle(p, 0.42);
      }
      float shapeEdge = 1.0 - smoothstep(-0.02, 0.02, sdfDist);
      if (shapeEdge < 0.01) discard;
      // pseudo-3D lighting for sphere only
      float lighting = 1.0;
      if (uSdfShape == 0) {
        // reconstruct hemisphere normal from UV
        vec2 np = p / 0.42;
        float nz2 = max(0.0, 1.0 - dot(np, np));
        vec3 N = normalize(vec3(np.x, np.y, sqrt(nz2)));
        vec3 L = normalize(vec3(uSdfLight.x, uSdfLight.y, 0.7));
        float diffuse = max(0.0, dot(N, L));
        vec3 V = vec3(0.0, 0.0, 1.0);
        vec3 H = normalize(L + V);
        float specular = pow(max(0.0, dot(N, H)), uSdfShininess) * uSdfSpecular;
        lighting = clamp(uSdfAmbient + diffuse * (1.0 - uSdfAmbient) + specular, 0.0, 2.0);
      }
      alpha = clamp(vAlpha * shapeEdge * velocityAlpha * flicker, 0.0, 1.0);
      finalColor = finalColor * lighting;
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;
