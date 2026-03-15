export const PHYSICS_LAYER_POSITION_LOGIC = `
  vec3 calculateLayerPosition(
    vec3 p, vec3 off, float motionType, float t,
    float speed, float amp, float freq, float radius,
    float phase, float rnd, vec3 wind, float noiseScale,
    float evolution, float complexity, float fluidForce, float viscosity,
    float fidelity, float octaveMult, float affectPos,
    float resistance, float moveWithWind, float neighborForce,
    float collisionMode, float collisionRadius, float repulsion,
    float gravity, float boundaryY, float boundaryEnabled, float boundaryBounce,
    float interLayerEnabled, int interLayerColliderCount, vec4 interLayerColliders[MAX_INTER_LAYER_COLLIDERS], float interLayerStrength,
    float interLayerPadding
  ) {
    vec3 pos = p * radius + off;
    vec3 moved = applyMotion(
      pos, motionType, t, speed, amp, freq, phase, rnd, wind, noiseScale,
      evolution, complexity, fluidForce, viscosity, fidelity, octaveMult
    );
    pos = mix(pos, moved, clamp(affectPos, 0.0, 1.0));
    pos += wind * moveWithWind * t * 0.025;
    pos.y -= gravity * 0.01 * t;

    if (neighborForce != 0.0) {
      pos += normalize(noiseVec(pos * 0.03 + t * 0.3 + rnd) + vec3(0.0001)) * neighborForce * 0.12;
    }

    if (collisionMode > 0.5) {
      float worldRadius = max(1.0, collisionRadius);
      float lenPos = length(pos);
      if (lenPos > worldRadius) {
        vec3 dir = normalize(pos);
        pos = dir * worldRadius - dir * repulsion * 0.01;
      }
    }

    if (boundaryEnabled > 0.5 && pos.y < boundaryY) {
      pos.y = mix(boundaryY, boundaryY + abs(pos.y - boundaryY) * max(0.0, boundaryBounce), 0.75);
    }

    if (interLayerEnabled > 0.5) {
      for (int colliderIndex = 0; colliderIndex < MAX_INTER_LAYER_COLLIDERS; colliderIndex++) {
        if (colliderIndex >= interLayerColliderCount) break;
        vec4 collider = interLayerColliders[colliderIndex];
        float colliderRadius = collider.w;
        if (colliderRadius <= 0.0) continue;
        vec3 delta = pos - collider.xyz;
        float dist = length(delta);
        float reach = colliderRadius + interLayerPadding;
        if (dist < reach) {
          vec3 dir = dist > 0.0001 ? delta / dist : normalize(hash3(rnd + float(colliderIndex)) * 2.0 - 1.0 + vec3(0.0001));
          float overlap = 1.0 - clamp(dist / max(0.0001, reach), 0.0, 1.0);
          pos += dir * overlap * interLayerStrength * 0.1;
        }
      }
    }

    pos *= max(0.0, 1.0 - resistance * 0.025);
    return pos;
  }
`;
