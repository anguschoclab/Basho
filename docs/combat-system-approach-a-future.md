# Combat System: Approach A — Full Physics Engine (Future Iteration)

> **Status:** Future Architecture Vision  
> **Prerequisite:** Approach B+ must be shipped first — this builds on its spatial types  
> **Primary trigger:** If a visual dohyo renderer (canvas/WebGL) is ever added, this becomes the natural model

---

## Why This Exists

Approach B+ gives us spatial meaning — real positions, real ring boundaries, emergent kimarite. But it still uses simplified scalar forces, inferred leg positions, and a phase-state machine to manage what would naturally fall out of a real physics simulation.

Approach A completes the model: every interaction is a consequence of forces, masses, and geometry. You don't select a technique and check if it works — you simulate the contact forces, watch the bodies move, and _then_ classify what happened as one of the 82 kimarite.

The tradeoff: **significantly more complex**, and the payoff is mainly visual (realistic rendered bouts) and edge-case correctness (obscure kimarite that B+ can't model cleanly). The gameplay is not substantially different from B+.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PhysicsWorld                             │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  RigidBody   │      │  RigidBody   │                    │
│  │  (East)      │      │  (West)      │                    │
│  │  pos, vel,   │      │  pos, vel,   │                    │
│  │  rot, mass   │      │  rot, mass   │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │    ContactManifold  │                            │
│         └────────┬────────────┘                            │
│                  │                                          │
│         ConstraintSolver ←── GripConstraints               │
│                  │                                          │
│         IntegrationStep (60Hz, fixed dt=0.016s)            │
│                  │                                          │
│         CollisionDetector ←── DohyoGeometry                │
│                  │                                          │
│         BoundaryChecker ─────→ VictoryCondition            │
└──────────────────┼──────────────────────────────────────────┘
                   │
           KimariteClassifier
                   │
           NarrativeGenerator
```

---

## Core Physics Types

### RigidBody

```typescript
interface RigidBody {
  // Linear state
  position: Vec3; // (x, y, z) in meters; y = up
  velocity: Vec3; // m/s
  acceleration: Vec3; // m/s² (cleared each tick after integration)

  // Rotational state
  orientation: Quaternion; // unit quaternion representing body rotation
  angularVelocity: Vec3; // rad/s (in world space)
  angularAcceleration: Vec3;

  // Mass properties
  mass: number; // kg
  inertiaTensor: Mat3; // 3×3 moment of inertia (simplified to diagonal for wrestler shape)
  invInertiaTensor: Mat3; // cached inverse

  // Center of mass (local space offset from body origin)
  // Wrestlers: CoM is at ~(0, height × 0.54, 0) — above hip level
  comOffset: Vec3;

  // Collider: capsule (two spheres + cylinder connecting them)
  capsuleBottom: Vec3; // local space
  capsuleTop: Vec3;
  capsuleRadius: number; // meters (half-shoulder-width ~0.35m)

  // Foot contact points (8 points per foot for ground detection)
  leftFootPoints: Vec3[];
  rightFootPoints: Vec3[];
}
```

### ContactManifold

```typescript
interface ContactManifold {
  // Points where bodies are in contact
  contacts: Array<{
    pointA: Vec3; // contact point on body A (world space)
    pointB: Vec3; // contact point on body B (world space)
    normal: Vec3; // collision normal pointing from B to A
    depth: number; // penetration depth (meters)
    friction: number; // coefficient (dry clay: ~0.7)
  }>;

  // Relative velocity at contact
  relativeVelocity: Vec3;

  // Accumulated impulse (for warm-starting)
  accumulatedImpulse: number;
}
```

### GripConstraint

```typescript
// Belt grip modeled as a distance constraint between attachment points
interface GripConstraint {
  bodyA: RigidBody;
  bodyB: RigidBody;

  // Attachment points in LOCAL space on each body
  // (where the hand grabs the mawashi — varies with grip depth)
  anchorA: Vec3;
  anchorB: Vec3;

  // Constraint parameters
  minDistance: number; // can't pull hand out past this
  maxDistance: number; // can't extend arm past this
  stiffness: number; // N/m (how strongly constraint enforces distance)
  damping: number; // N·s/m (oscillation damping)

  // Force limits (grip fails above this)
  maxForce: number; // N (breaks when opponent's weight exceeds grip strength)
  currentForce: number; // N (tracked to detect grip breaks)

  // State
  isActive: boolean;
  gripSide: "left" | "right";
  isInsideArm: boolean; // determines torque leverage
}
```

### DohyoGeometry

```typescript
interface DohyoGeometry {
  // Inner ring (loss boundary)
  ringRadius: number; // 4.55m (center of tawara)
  ringCenter: Vec3; // (0, 0, 0)

  // Tawara (straw bales at boundary)
  tawaraInnerRadius: number; // 4.55m
  tawaraOuterRadius: number; // 4.79m
  tawaraHeight: number; // 0.06m
  tawaraNormalMap: Vec3[]; // 36 normals around the circle (per bale)

  // Haridashi (east/west protrusions)
  haridashiEastCenter: Vec3; // (4.55, 0, 0)
  haridashiWestCenter: Vec3; // (-4.55, 0, 0)
  haridashiRadius: number; // 0.36m additional protrusion

  // Surface properties
  surfaceFriction: number; // clay friction coefficient ~0.65
  surfaceRestitution: number; // bounce coefficient ~0.1 (clay is not bouncy)
}
```

---

## Physics Integration

### Tick Loop (Fixed 60Hz)

```typescript
const PHYSICS_DT = 1 / 60; // seconds
const PHYSICS_SUBSTEPS = 4; // sub-steps per game tick for stability

function physicsTick(world: PhysicsWorld, east: Rikishi, west: Rikishi): PhysicsResult | void {
  for (let sub = 0; sub < PHYSICS_SUBSTEPS; sub++) {
    const dt = PHYSICS_DT / PHYSICS_SUBSTEPS;

    // 1. Apply external forces (gravity, muscle forces, balance correction)
    applyForces(world, east, west, dt);

    // 2. Broad-phase collision detection (AABB check)
    const pairs = broadPhase(world);

    // 3. Narrow-phase (capsule-capsule, capsule-ground, capsule-tawara)
    const manifolds = narrowPhase(pairs, world.dohyo);

    // 4. Constraint solver (grip constraints + joint limits)
    // Iterative: 8–16 solver iterations per sub-step
    solveConstraints(world.gripConstraints, manifolds, dt, 12);

    // 5. Integration (semi-implicit Euler)
    integrateVelocities(world, dt);
    integratePositions(world, dt);

    // 6. Velocity correction (post-integration contact resolution)
    correctPenetrations(manifolds, dt);

    // 7. Check victory conditions
    const result = checkVictoryConditions(world.bodyEast, world.bodyWest, world.dohyo);
    if (result) return result;
  }
}
```

### Force Application

```typescript
function applyForces(world: PhysicsWorld, east: Rikishi, west: Rikishi, dt: number): void {
  // Gravity (always)
  world.bodyEast.acceleration.y -= 9.81;
  world.bodyWest.acceleration.y -= 9.81;

  // Muscle force (the engine's "action" system — wrestler's intent)
  const eastForce = computeMuscleForce(east, world.eastIntent, world.bodyEast);
  const westForce = computeMuscleForce(west, world.westIntent, world.bodyWest);

  applyForceAtPoint(world.bodyEast, eastForce, world.bodyEast.comOffset);
  applyForceAtPoint(world.bodyWest, westForce, world.bodyWest.comOffset);

  // Balance correction (proprioceptive — wrestlers constantly self-correct)
  // This prevents the simulation from tipping over from tiny perturbations
  const eastBalanceForce = computeBalanceCorrection(world.bodyEast, east.stats?.balance ?? 50);
  const westBalanceForce = computeBalanceCorrection(world.bodyWest, west.stats?.balance ?? 50);

  applyTorque(world.bodyEast, eastBalanceForce);
  applyTorque(world.bodyWest, westBalanceForce);
}

function computeBalanceCorrection(body: RigidBody, balanceStat: number): Vec3 {
  // Proportional controller: torque proportional to CoM lateral displacement
  const comWorld = addVec3(body.position, rotateVec3(body.comOffset, body.orientation));
  const lateralDisplacement = { x: comWorld.x - body.position.x, z: comWorld.z - body.position.z };

  // Higher balance stat = stronger correction (harder to tip over)
  const gain = balanceStat * 0.08;
  return {
    x: -lateralDisplacement.z * gain,
    y: 0,
    z: lateralDisplacement.x * gain,
  };
}
```

### Grip Constraint Solver

```typescript
function solveGripConstraint(
  constraint: GripConstraint,
  bodyA: RigidBody,
  bodyB: RigidBody,
  dt: number
): void {
  if (!constraint.isActive) return;

  // World-space anchor positions
  const anchorAWorld = addVec3(bodyA.position, rotateVec3(constraint.anchorA, bodyA.orientation));
  const anchorBWorld = addVec3(bodyB.position, rotateVec3(constraint.anchorB, bodyB.orientation));

  const delta = subtractVec3(anchorAWorld, anchorBWorld);
  const dist = lengthVec3(delta);

  if (dist < constraint.minDistance || dist > constraint.maxDistance) {
    // Constraint violation — apply corrective impulse
    const targetDist = clamp(dist, constraint.minDistance, constraint.maxDistance);
    const correction = (dist - targetDist) / dist;
    const impulse = scaleVec3(delta, correction * constraint.stiffness * dt);

    // Apply to both bodies (inverse mass weighted)
    applyImpulse(bodyA, scaleVec3(impulse, -bodyA.invMass), anchorAWorld);
    applyImpulse(bodyB, scaleVec3(impulse, bodyB.invMass), anchorBWorld);

    // Track force for grip-break detection
    constraint.currentForce = lengthVec3(impulse) / dt;
    if (constraint.currentForce > constraint.maxForce) {
      // Grip breaks!
      constraint.isActive = false;
    }
  }
}
```

---

## Collision Detection

### Body-Body (Capsule-Capsule)

```typescript
function capsuleCapsuleContact(a: RigidBody, b: RigidBody): ContactManifold | null {
  // Closest point on capsule A's axis segment to capsule B's axis segment
  const [closestA, closestB] = closestPointsOnSegments(
    a.capsuleBottom,
    a.capsuleTop,
    b.capsuleBottom,
    b.capsuleTop
  );

  const delta = subtractVec3(closestA, closestB);
  const dist = lengthVec3(delta);
  const minDist = a.capsuleRadius + b.capsuleRadius;

  if (dist >= minDist) return null; // no contact

  const normal = dist > 0.001 ? normalizeVec3(delta) : { x: 1, y: 0, z: 0 };
  const depth = minDist - dist;

  return {
    contacts: [
      {
        pointA: addVec3(closestA, scaleVec3(normal, -a.capsuleRadius)),
        pointB: addVec3(closestB, scaleVec3(normal, b.capsuleRadius)),
        normal,
        depth,
        friction: 0.5, // body-on-body (skin/mawashi)
      },
    ],
    relativeVelocity: subtractVec3(a.velocity, b.velocity),
    accumulatedImpulse: 0,
  };
}
```

### Body-Tawara (Boundary)

```typescript
function bodyTawaraContact(body: RigidBody, dohyo: DohyoGeometry): ContactManifold | null {
  // Check if any foot point is at/past the tawara inner radius
  for (const footPoint of [...body.leftFootPoints, ...body.rightFootPoints]) {
    const worldFoot = addVec3(body.position, rotateVec3(footPoint, body.orientation));
    const radialDist = Math.sqrt(worldFoot.x ** 2 + worldFoot.z ** 2);

    if (radialDist >= dohyo.tawaraInnerRadius) {
      // Foot is on or past tawara
      const outwardNormal = normalizeVec3({ x: worldFoot.x, y: 0, z: worldFoot.z });

      // Tawara provides upward and inward reaction force (the "bounce")
      const tawaraNormal = normalizeVec3({ x: -outwardNormal.x, y: 2.0, z: -outwardNormal.z });

      // Higher protrusion = more upward component
      const protrusion = Math.max(0, radialDist - dohyo.tawaraInnerRadius);
      const depth = Math.min(protrusion, dohyo.tawaraHeight);

      return {
        contacts: [
          {
            pointA: worldFoot,
            pointB: { ...worldFoot, y: dohyo.tawaraHeight },
            normal: tawaraNormal,
            depth,
            friction: dohyo.surfaceFriction,
          },
        ],
        relativeVelocity: body.velocity,
        accumulatedImpulse: 0,
      };
    }
  }
  return null;
}
```

---

## Victory Conditions

```typescript
function checkVictoryConditions(
  east: RigidBody,
  west: RigidBody,
  dohyo: DohyoGeometry
): PhysicsResult | null {
  // 1. Foot out of ring (any foot point past tawara outer edge)
  const eastFootOut = isAnyFootOutside(east, dohyo.tawaraOuterRadius);
  const westFootOut = isAnyFootOutside(west, dohyo.tawaraOuterRadius);

  if (eastFootOut) return { winner: "west", exitType: "foot_out", exitBody: east };
  if (westFootOut) return { winner: "east", exitType: "foot_out", exitBody: west };

  // 2. Body touch (any non-foot part touches outside ring OR ground)
  const eastBodyOut = isBodyTouchingOutside(east, dohyo) || isBodyTouchingGround(east);
  const westBodyOut = isBodyTouchingOutside(west, dohyo) || isBodyTouchingGround(west);

  if (eastBodyOut) return { winner: "west", exitType: "body_touch", exitBody: east };
  if (westBodyOut) return { winner: "east", exitType: "body_touch", exitBody: west };

  // 3. Both out simultaneously → gyoji (referee) calls monoii review
  // (extremely rare but physically possible — track for playoff handling)

  return null;
}
```

---

## Kimarite Classifier

In Approach A, kimarite is classified AFTER the bout by reading the physics history. This is the inverse of the current system (retroactive) and B+ (mid-fight declaration). Here, kimarite is **post-simulation classification of observed events**.

```typescript
function classifyKimarite(history: PhysicsFrame[], winner: Side, dohyo: DohyoGeometry): KimariteId {
  const finalFrame = history[history.length - 1];
  const loser: Side = winner === "east" ? "west" : "east";

  const loserBody = loser === "east" ? finalFrame.bodyEast : finalFrame.bodyWest;
  const winnerBody = winner === "east" ? finalFrame.bodyEast : finalFrame.bodyWest;

  // Get exit trajectory
  const exitVelocity = loserBody.velocity;
  const exitAngularVel = loserBody.angularVelocity;
  const exitPosition = loserBody.position;
  const wasGripped = history.some((f) => getActiveGrips(f, winner).length > 0);
  const wasGrippedLoser = history.some((f) => getActiveGrips(f, loser).length > 0);

  // Classify by trajectory and final state
  const movingForward = dot(exitVelocity, forwardVec(winnerBody)) > 0.3;
  const spinningOut = lengthVec3(exitAngularVel) > 1.5;
  const liftedOff = exitPosition.y > 0.1; // was in the air
  const backwardFall = dot(exitVelocity, forwardVec(loserBody)) > 0.3; // moving own forward = backing out

  // PRIMARY CLASSIFIERS (in priority order)
  if (!wasGripped && movingForward && !spinningOut) return "oshidashi"; // pure push
  if (wasGripped && movingForward && !spinningOut) return "yorikiri"; // belt walk-out
  if (!wasGripped && !movingForward && spinningOut) return "hatakikomi"; // slap pull-down
  if (wasGripped && spinningOut && !liftedOff) return "uwatenage"; // belt throw
  if (wasGripped && liftedOff) return "tsuriotoshi"; // lift-and-drop
  if (backwardFall && wasGripped) return "okuridashi"; // rear push-out

  // LEG TRIP detection (requires foot-contact data from narrow phase)
  const legContact = history.findLast((f) => hasLegContact(f, winner, loser));
  if (legContact) {
    const tripSide = getTripSide(legContact, winner);
    return tripSide === "outside" ? "sotogake" : "uchigake";
  }

  // ISAMIASHI (winner stepped out after loser moved away)
  const winnerSteppedOut = isAnyFootOutside(winnerBody, dohyo.tawaraOuterRadius);
  if (winnerSteppedOut) return "isamiashi";

  // BACK-BEND (izori/kakezori family — winner's CoM went below normal range)
  const minWinnerY = Math.min(...history.map((f) => getBodyY(f, winner)));
  if (minWinnerY < 0.4) return "izori";

  // Fallback: classify by grip state + direction
  return wasGripped ? "yoritaoshi" : "oshitaoshi";
}
```

---

## Muscle Force Model

The AI decision system feeds into the physics as **intended forces**, not as instant power calculations:

```typescript
interface MusclePlan {
  // Where the wrestler wants to push (in their local frame)
  pushDirection: Vec3;
  pushMagnitude: number; // Newtons — derived from strength stat × action weight

  // Where they want to plant their feet
  footTargetLeft: Vec3;
  footTargetRight: Vec3;

  // Grip intention
  gripTargetLeft: Vec3 | null; // null = not attempting grip this tick
  gripTargetRight: Vec3 | null;
}

function computeMuscleForce(rikishi: Rikishi, plan: MusclePlan, body: RigidBody): Vec3 {
  const maxForce = stat(rikishi, "strength") * 12; // ~600–1200N for sumo-class wrestlers
  const fatiguePenalty = 1.0 - (body.fatigue / 100) * 0.45;
  const magnitude = Math.min(plan.pushMagnitude, maxForce) * fatiguePenalty;

  // Force applied at hip level (not CoM — creates torque)
  const hipOffset = { x: 0, y: body.comOffset.y * 0.7, z: 0 };
  return scaleVec3(normalizeVec3(plan.pushDirection), magnitude);
}
```

---

## MusclePlan AI (replaces CombatAction selection)

```typescript
function planNextTick(
  rng: SeededRNG,
  rikishi: Rikishi,
  myBody: RigidBody,
  opponentBody: RigidBody,
  activeGrips: GripConstraint[],
  tactic: BoutTactic
): MusclePlan {
  // Compute where I want to push (toward opponent + apply arc based on stance)
  const toOpponent = normalizeVec3(subtractVec3(opponentBody.position, myBody.position));
  const pushAngle = jitter(rng, 0.3); // ±17° variance
  const pushDir = rotateY(toOpponent, pushAngle);

  // Strength-based push magnitude
  const strength = stat(rikishi, "strength");
  const magnitude = strength * 11 + jitter(rng, 2) * strength;

  // Foot targets: step toward opponent, adjust width based on balance stat
  const stanceWidth = 0.25 + stat(rikishi, "balance") / 400; // 0.25–0.50m
  const footTargetLeft = { x: opponentBody.position.x * 0.3, y: 0, z: -stanceWidth };
  const footTargetRight = { x: opponentBody.position.x * 0.3, y: 0, z: stanceWidth };

  // Grip attempt: if yotsu style or YOTSU_BELT tactic
  const wantsBelt = rikishi.combatProfile.familyPreferences.belt > 40 || tactic === "YOTSU_BELT";
  const gripTargetLeft = wantsBelt ? computeGripTarget(myBody, opponentBody, "left") : null;
  const gripTargetRight = wantsBelt ? computeGripTarget(myBody, opponentBody, "right") : null;

  return {
    pushDirection: pushDir,
    pushMagnitude: magnitude,
    footTargetLeft,
    footTargetRight,
    gripTargetLeft,
    gripTargetRight,
  };
}
```

---

## Kimarite That Only A Can Model Correctly

These 8 techniques require full physics simulation and cannot be emergent in B+:

| Kimarite           | Why It Needs A                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Tsuriotoshi**    | Requires actual vertical lift (y-axis > 0), gravity, opponent mass — needs rigid body flight |
| **Kakezori**       | Winner's spine bends backward past 90° — requires spinal rotation constraint                 |
| **Shumokuzori**    | Both fighters fall simultaneously — requires simultaneous boundary exit resolution           |
| **Mitokorozeme**   | Three simultaneous contact points (arm + body + leg) — needs full contact manifold           |
| **Hansoku** (foul) | Hair grab / slap to face — requires hand trajectory tracking through opponent's head capsule |
| **Kirikaeshi**     | Leg sweep from behind — requires foot-path history showing wrap-around trajectory            |
| **Ipponzeoi**      | Shoulder throw — requires arm getting under opponent's armpit (spatial sweep)                |
| **Yaguranage**     | Inner thigh throw — requires leg penetrating between opponent's legs (complex geometry)      |

---

## Performance Profile

At 60Hz with 4 substeps per simulation tick, and mapping to game ticks:

```
1 game tick = 0.2s real time
0.2s ÷ 0.016s = ~12 physics steps per game tick
12 × 4 substeps = 48 solver iterations per game tick

Typical bout: 15–30 game ticks = 720–1440 physics solver iterations
Constraint solver: 12 iterations × 2 grips × 2 bodies = 48 operations/step

Total: ~34,560–69,120 constraint operations per bout

Modern CPU: ~10M simple operations/ms → negligible
Even 15 bouts per day × 6 tournaments = 90 bouts/day → <1ms total simulation
```

The physics engine is not a performance concern. The overhead is in the new type system and GC pressure from allocating many Vec3s per tick — use object pools.

---

## Determinism Strategy

The main risk with floating-point physics is non-determinism across platforms (different FPU precision, WASM vs V8, etc.):

1. **Fixed-point representation** for all coordinates — store as `int32` millimeters instead of `float` meters. Convert to float only for rendering.
2. **Seeded RNG** only — same seed produces identical MusclePlan decisions
3. **No `Date.now()` or `performance.now()`** inside the physics loop
4. **Quaternion normalization** after every integration step (prevents drift)
5. **Constraint solver warm-starting** must use accumulated impulse from same seed path

If targeting Web Workers + main thread rendering, serialize `PhysicsFrame[]` as structured clone (already done in `tickOrchestrator.ts`) — the frame history is the canonical record, renderer reads it.

---

## Migration Path from B+

B+ and A share the `PhysicalBody` concept (B+ uses a simplified version). Migration steps:

1. **Extend `PhysicalBody`** to add `velocity: Vec3`, `orientation: Quaternion`, `inertiaTensor`
2. **Replace `cogOffset: number`** with full `comOffset: Vec3`
3. **Extend `BeltBattleState`** to `GripConstraint[]` (the lever arm model in B+ maps directly)
4. **Replace `tickPushBattle`/`tickBeltBattle`** with `physicsTick` + `applyForces`
5. **Replace `evaluateKimariteAttempt`** with `classifyKimarite` (post-simulation classifier)
6. **Add `DohyoGeometry`** — B+ already has the constants, just needs to be a typed object
7. **Foot tracking**: B+ tracks `leadingFootX` (scalar) — A needs `leftFootPoints: Vec3[]` per foot

The type migration is the hard part. The logic migration follows naturally once the types are right.
