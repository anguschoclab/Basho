# Combat System: Approach B+ (Expanded Phase-Gate with Physics Borrowing)

> **Status:** Design Proposal  
> **Replaces:** `src/engine/bout/boutPhysics.ts`, `boutGrip.ts`, `boutCalculations.ts`, `kimariteEvaluator.ts`  
> **Preserves:** `boutResolver.ts`, `boutNarrative.ts`, `boutResultApplier.ts`, `kimariteStrategy.ts` (updated conditions)

---

## Overview

Approach B+ keeps the deterministic tick loop structure but replaces every abstract scalar with physically meaningful quantities. The core shift:

| Before | After |
|--------|-------|
| `balanceEast/West` (HP drain) | `positionEast/West` (meters from ring center, with CoG) |
| `gripAdvantage` (enum) | `BeltBattleState` (lever arm torques per hand) |
| `position: 'front/lateral/rear'` | `facingAngle` (radians, continuous) |
| Edge = `balance ≤ 0` | Edge = foot position ≥ 4.55m |
| Kimarite = post-physics retroactive fit | Kimarite = first successful declared technique |
| Tawara = not modeled | `EdgeCrisisState` phase with tawara bounce resistance |

The engagement loop stays at **~120–180 ticks** (same performance envelope), but each tick now advances spatial state rather than draining HP.

---

## Dohyo Geometry

```
                        SHOMEN (front)
                           [0°]
                            │
              ─────────────────────────────
             /           4.55m             \
            /    [Haridashi east protrusion] \
W ←────────●─────────────────────────────────●────────→ E
    West    │         shikirisen (0.7m)        │    East
  [270°]   ●                                 ●   [90°]
            \    [Haridashi west protrusion] /
             \                             /
              ─────────────────────────────
                           │
                       MUKOU-JOMEN
                          [180°]

Ring: circle radius 4.55m, origin (0,0) = center
Shikirisen: east at (0.7, 0), west at (-0.7, 0)
Tawara: straw boundary bales, 0.06m raised, 0.24m wide
Haridashi: east/west protrusions add ~0.12m radius at 90°/270°
Victory condition: any body part (except sole of foot) touching outside tawara circle
```

---

## Core State Types

### PhysicalBody (replaces balanceEast/West + position)

```typescript
interface PhysicalBody {
  // Spatial position in dohyo (meters, origin = ring center)
  x: number;               // positive = east
  z: number;               // positive = north (shomen side)
  facingAngle: number;     // radians; 0 = facing east opponent, π = facing away

  // Velocity (meters per tick, 1 tick ≈ 0.2s in this model)
  vx: number;
  vz: number;
  angularVelocity: number; // rad/tick (rotation from torque)

  // Center of Mass
  cogHeight: number;       // meters; derived from rikishi height * 0.54
  cogOffset: number;       // lateral CoG drift from base of support, meters
                           // > baseOfSupport/2 = falling

  // Base of Support
  footSpread: number;      // meters between feet; wider = more stable
  leadingFootX: number;    // leading foot position (used for boundary check)
  trailingFootX: number;

  // Structural
  mass: number;            // kg, from rikishi weight stat
  height: number;          // cm, from rikishi height stat

  // Accumulated strain
  fatigue: number;         // 0–100
  muscleStrain: number;    // 0–100; high strain = force output capped
}
```

**Stability check (replaces `balance ≤ 0`):**
```typescript
function isBodyFalling(body: PhysicalBody): boolean {
  const maxOffset = body.footSpread / 2;
  return Math.abs(body.cogOffset) > maxOffset;
}

function isOutOfRing(body: PhysicalBody): boolean {
  // Use leading foot, not center mass — matches real sumo rule
  const footDist = Math.sqrt(body.leadingFootX ** 2 + body.z ** 2);
  return footDist >= RING_RADIUS; // 4.55m
}
```

### BeltBattleState (replaces GrappleState enum)

```typescript
interface HandGrip {
  // Physical contact point on opponent's mawashi
  armReach: number;        // meters, how far in the hand has penetrated
  contactX: number;        // position on opponent's body (meters from centerline)
  contactZ: number;
  leverArm: number;        // meters from opponent's CoG to contact point
  isInside: boolean;       // true = arm inside opponent's arm (uwate/shitate)
  isBlocked: boolean;      // opponent's arm is blocking this hand
  gripStrength: number;    // 0–1, decays with fatigue and strain
}

interface BeltBattleState {
  eastLeft:  HandGrip | null;
  eastRight: HandGrip | null;
  westLeft:  HandGrip | null;
  westRight: HandGrip | null;

  // Net torque each fighter can apply this tick (N·m)
  torqueEast: number;
  torqueWest: number;

  // Derived grip classification (for kimarite classification and narrative)
  eastGripClass: 'morozashi' | 'uwate' | 'shitate' | 'outside' | 'none';
  westGripClass: 'morozashi' | 'uwate' | 'shitate' | 'outside' | 'none';

  // Grip depth (arm penetration into opponent's side)
  eastDepth: 'maemitsu' | 'deep' | 'standard';
  westDepth: 'maemitsu' | 'deep' | 'standard';
}
```

**Torque calculation (replaces grip multiplier scalars):**
```typescript
function calculateTorque(grip: HandGrip, force: number): number {
  // τ = F × r × sin(θ); simplified to lever arm × force × inside bonus
  if (!grip || grip.isBlocked) return 0;
  const insideBonus = grip.isInside ? 1.3 : 0.85;
  return force * grip.leverArm * grip.gripStrength * insideBonus;
}

function computeNetTorque(left: HandGrip | null, right: HandGrip | null, force: number): number {
  const tLeft  = left  ? calculateTorque(left,  force * 0.55) : 0;
  const tRight = right ? calculateTorque(right, force * 0.45) : 0;
  return tLeft + tRight; // morozashi: both inside = ~2.6× single outside
}
```

### PushBattleState (replaces abstract damage)

```typescript
interface PushBattleState {
  // Contest line: how far the engagement center has shifted toward each fighter
  // 0 = center; positive = east is being pushed back; negative = west being pushed back
  contestLine: number;         // meters

  // Each fighter's lead foot position
  eastLeadFoot: number;        // meters from ring center (east positive)
  westLeadFoot: number;        // meters from ring center (west positive)

  // Directional momentum vectors
  eastMomentum: { x: number; z: number };  // m/tick
  westMomentum: { x: number; z: number };

  // Step counts (yorikiri is measured in step count)
  eastSteps: number;
  westSteps: number;

  // Footwork stability (wide stance = more resistance, but slower)
  eastStanceWidth: number;     // meters
  westStanceWidth: number;
}
```

### PhaseState (replaces stance + implicit phases)

```typescript
type CombatPhase =
  | { tag: 'approach' }
  | { tag: 'tachiai';     impactVelocity: number; contactAngle: number }
  | { tag: 'push_battle'; state: PushBattleState }
  | { tag: 'belt_battle'; state: BeltBattleState; push: PushBattleState }
  | { tag: 'edge_crisis'; crisis: EdgeCrisisState; prev: 'push_battle' | 'belt_battle' }
  | { tag: 'resolved';    winner: Side; exitVector: { x: number; z: number }; technique: KimariteId }
```

### EdgeCrisisState (new — tawara drama)

```typescript
interface EdgeCrisisState {
  side: Side;                  // who is at the edge
  tawaraToePosition: number;   // 0.0 = heel on tawara, 1.0 = toe on tawara, 2.0 = fully out
  tawaraBounceForce: number;   // resistance the straw provides (spikes when toe contacts it)
  escapeAngle: number;         // radians — direction fighter can pivot to escape
  escapeForceAvailable: number;// remaining force to push back
  opponentPressureX: number;   // how much force opponent is applying this tick
  opponentPressureZ: number;
  recoveryProbability: number; // P(step back in) per tick
  ticksInCrisis: number;       // drama counter — longer crisis = more tension
}
```

**Tawara bounce physics:**
```typescript
// The raised tawara gives a brief opposing force when stepped on.
// This is why fighters can claw back from impossible positions.
function tawaraBounceResistance(toePos: number): number {
  if (toePos < 0.0) return 0;           // not on tawara yet
  if (toePos < 0.5) return 15.0;        // heel contacts tawara — spike of resistance
  if (toePos < 1.0) return 8.0;         // toe on tawara — still some bounce
  return 0;                             // fully outside, no resistance
}
```

### EngineStateV2 (full replacement for EngineState)

```typescript
interface EngineStateV2 {
  tick: number;
  timeSeconds: number;

  // Physical bodies
  east: PhysicalBody;
  west: PhysicalBody;

  // Current combat phase
  phase: CombatPhase;

  // Grip state (null when in push_battle)
  beltBattle: BeltBattleState | null;

  // Facing geometry
  // (derived each tick from PhysicalBody angles — not stored separately)

  // Kimarite tracking (NEW: mid-fight declaration, not retroactive)
  attemptedTechniques: Array<{
    tick: number;
    side: Side;
    technique: KimariteId;
    succeeded: boolean;
  }>;
  tentativeKimarite: KimariteId | null;  // set when a technique first succeeds

  // Playback log
  log: BoutLogEntryV2[];

  // Context carry-overs (same as before)
  tachiaiWinner: Side;
  playerSide?: Side;
  playerTactic?: BoutTactic;
  mizuiriDeclared: boolean;
  day: number;
}
```

---

## Phase Engine

### Phase 1: Approach → Tachiai

```typescript
function resolveTachiai(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineStateV2): void {
  // Impact velocity: determined by aggression, sprint distance (0.7m from shikirisen)
  const eastVelocity = computeTachiaiVelocity(east, rng);
  const westVelocity = computeTachiaiVelocity(west, rng);

  // Contact angle (are they hitting straight-on or at an angle?)
  // Aggression + technique determines how "square" the hit is
  const contactAngle = computeContactAngle(east, west, rng);

  // Collision force = mass × velocity (simplified impulse)
  const eastImpulse = east.weight * eastVelocity * Math.cos(contactAngle);
  const westImpulse = west.weight * westVelocity * Math.cos(contactAngle);

  // Tachiai winner = more impulse, with jitter
  const winner: Side = (eastImpulse + jitter(rng, 5)) > (westImpulse + jitter(rng, 5))
    ? 'east' : 'west';

  // Apply displacement to loser's PhysicalBody
  const loserBody = winner === 'east' ? st.west : st.east;
  const impulseDiff = Math.abs(eastImpulse - westImpulse);
  loserBody.cogOffset += impulseDiff * 0.02;  // CoG drift from impact
  loserBody.vx += impulseDiff * 0.15 * (winner === 'east' ? 1 : -1);

  // Transition to push or belt phase
  const eastWantsBelt = east.combatProfile.familyPreferences.belt > 40;
  const westWantsBelt = west.combatProfile.familyPreferences.belt > 40;

  if (eastWantsBelt || westWantsBelt) {
    st.phase = { tag: 'belt_battle', state: initBeltBattle(rng, east, west, winner), push: initPushState(east, west) };
    st.beltBattle = (st.phase as any).state;
  } else {
    st.phase = { tag: 'push_battle', state: initPushState(east, west) };
  }

  st.tachiaiWinner = winner;
}
```

### Phase 2: push_battle Tick

```typescript
function tickPushBattle(
  rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineStateV2, push: PushBattleState
): { winner?: Side; kimarite?: KimariteId } | void {

  // Select actions
  const eastAction = selectAction(rng, east, st, west);
  const westAction = selectAction(rng, west, st, east);

  // Net push force = strength × action weight × stance multiplier
  const eastForce = computePushForce(east, eastAction, push.eastStanceWidth, st.east.fatigue);
  const westForce = computePushForce(west, westAction, push.westStanceWidth, st.west.fatigue);

  // Directional momentum (push angle can vary ±15° for flanking)
  const eastAngle = computePushAngle(eastAction, st.east, st.west, rng);
  const westAngle = computePushAngle(westAction, st.west, st.east, rng);

  // Update momentum vectors
  push.eastMomentum.x += eastForce * Math.cos(eastAngle) * 0.01;
  push.westMomentum.x += westForce * Math.cos(westAngle) * 0.01;

  // Apply momentum to positions
  push.eastLeadFoot += push.westMomentum.x;  // west pushing east back
  push.westLeadFoot += push.eastMomentum.x;  // east pushing west back

  // Momentum decay (friction — wide stance decays faster)
  push.eastMomentum.x *= (1 - push.eastStanceWidth * 0.1);
  push.westMomentum.x *= (1 - push.westStanceWidth * 0.1);

  // Update CoG offsets
  st.east.cogOffset += push.westMomentum.x * (st.east.mass / 1000);
  st.west.cogOffset += push.eastMomentum.x * (st.west.mass / 1000);

  // Check for mid-fight kimarite attempt (NEW: not retroactive)
  const attempt = evaluateKimariteAttempt(east, west, eastAction, westAction, push, null, rng);
  if (attempt) {
    st.attemptedTechniques.push({ tick: st.tick, side: attempt.side, technique: attempt.id, succeeded: attempt.succeeded });
    if (attempt.succeeded) {
      return { winner: attempt.side, kimarite: attempt.id };
    }
  }

  // Boundary check: trigger edge crisis
  if (push.eastLeadFoot >= TAWARA_RADIUS || push.westLeadFoot >= TAWARA_RADIUS) {
    const crisisSide: Side = push.eastLeadFoot >= TAWARA_RADIUS ? 'east' : 'west';
    st.phase = {
      tag: 'edge_crisis',
      crisis: initEdgeCrisis(crisisSide, push, east, west),
      prev: 'push_battle'
    };
  }

  // Falling check: extreme CoG offset
  if (isBodyFalling(st.east)) return { winner: 'west', kimarite: classifyFallKimarite(push, st, 'east') };
  if (isBodyFalling(st.west)) return { winner: 'east', kimarite: classifyFallKimarite(push, st, 'west') };
}
```

### Phase 3: belt_battle Tick

```typescript
function tickBeltBattle(
  rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineStateV2, belt: BeltBattleState, push: PushBattleState
): { winner?: Side; kimarite?: KimariteId } | void {

  // Each tick: fighters attempt to improve grip and apply torque
  evolveGripGeometry(rng, east, west, belt);

  // Compute net torques from lever arm geometry
  belt.torqueEast = computeNetTorque(belt.eastLeft, belt.eastRight, stat(east, 'strength'));
  belt.torqueWest = computeNetTorque(belt.westLeft, belt.westRight, stat(west, 'strength'));

  // Torque differential → angular velocity on opponent's body
  const torqueDiff = belt.torqueEast - belt.torqueWest;
  if (torqueDiff > 0) {
    st.west.angularVelocity += torqueDiff * 0.002;
    st.west.cogOffset += torqueDiff * 0.005;
  } else {
    st.east.angularVelocity -= torqueDiff * 0.002;
    st.east.cogOffset -= torqueDiff * 0.005;
  }

  // Angular velocity → facing angle change
  st.east.facingAngle += st.east.angularVelocity;
  st.west.facingAngle += st.west.angularVelocity;

  // Torque also translates to linear displacement (throw momentum)
  push.eastLeadFoot += Math.abs(belt.torqueWest) * 0.008 * (belt.torqueWest > belt.torqueEast ? 1 : 0);
  push.westLeadFoot += Math.abs(belt.torqueEast) * 0.008 * (belt.torqueEast > belt.torqueWest ? 1 : 0);

  // Derive grip class (for kimarite classification)
  belt.eastGripClass = deriveGripClass(belt.eastLeft, belt.eastRight);
  belt.westGripClass = deriveGripClass(belt.westLeft, belt.westRight);

  // Kimarite attempt (throw, twist, leg trip — context-specific)
  const attempt = evaluateKimariteAttempt(east, west, null, null, push, belt, rng);
  if (attempt?.succeeded) {
    return { winner: attempt.side, kimarite: attempt.id };
  }

  // Edge crisis trigger
  if (push.eastLeadFoot >= TAWARA_RADIUS || push.westLeadFoot >= TAWARA_RADIUS) {
    const crisisSide: Side = push.eastLeadFoot >= TAWARA_RADIUS ? 'east' : 'west';
    st.phase = {
      tag: 'edge_crisis',
      crisis: initEdgeCrisis(crisisSide, push, east, west),
      prev: 'belt_battle'
    };
  }

  // Falling
  if (isBodyFalling(st.east)) return { winner: 'west', kimarite: classifyBeltFallKimarite(belt, st, 'east') };
  if (isBodyFalling(st.west)) return { winner: 'east', kimarite: classifyBeltFallKimarite(belt, st, 'west') };
}
```

### Phase 4: edge_crisis Tick

```typescript
function tickEdgeCrisis(
  rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineStateV2, crisis: EdgeCrisisState
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | void {

  const defenderBody = crisis.side === 'east' ? st.east : st.west;
  const attackerBody = crisis.side === 'east' ? st.west : st.east;
  const defender     = crisis.side === 'east' ? east : west;
  const attacker     = crisis.side === 'east' ? west : east;

  crisis.ticksInCrisis++;

  // Advance toe position each tick based on net force
  const netPressure = crisis.opponentPressureX - crisis.escapeForceAvailable - tawaraBounceResistance(crisis.tawaraToePosition);
  crisis.tawaraToePosition += netPressure * 0.03;

  // Check full exit
  if (crisis.tawaraToePosition >= 2.0) {
    // Out! Classify which kimarite based on how they exited
    const kimarite = classifyEdgeExitKimarite(crisis, st, rng);
    return { winner: attacker === east ? 'east' : 'west', kimarite };
  }

  // Escape attempt: per-tick recovery roll
  const recoveryBonus = stat(defender, 'balance') * 0.005 + tawaraBounceResistance(crisis.tawaraToePosition) * 0.05;
  const escapeProbability = crisis.recoveryProbability + recoveryBonus;

  if (rng.bool(escapeProbability)) {
    // TAWARA DRAMA: fighter steps back in!
    // Shift from edge, resume previous phase with reduced momentum
    defenderBody.vx *= -0.4;  // reverse some momentum
    crisis.tawaraToePosition -= 0.6;
    logEdgeCrisisEscape(st, crisis, rng);
    return { escaped: true };
  }

  // Torque reversal: if defender has belt grip, attempt throw FROM the edge
  // This produces utchari (backward pivot), sotogake from edge, etc.
  if (st.beltBattle) {
    const defenderGripClass = crisis.side === 'east' ? st.beltBattle.eastGripClass : st.beltBattle.westGripClass;
    if (defenderGripClass === 'morozashi' || defenderGripClass === 'uwate') {
      const reversalAttempt = evaluateEdgeReversal(defender, attacker, crisis, st.beltBattle, rng);
      if (reversalAttempt.succeeded) {
        return { winner: crisis.side === 'east' ? 'east' : 'west', kimarite: reversalAttempt.kimarite };
      }
    }
  }
}
```

---

## Emergent Kimarite Classification

The critical architectural change: **kimarite is no longer retroactively selected**. Instead, `evaluateKimariteAttempt` runs every tick, checking if the current physical state satisfies the conditions for a specific technique. The first successful attempt ends the bout.

```typescript
interface KimariteAttempt {
  side: Side;
  id: KimariteId;
  succeeded: boolean;
}

function evaluateKimariteAttempt(
  east: Rikishi, west: Rikishi,
  eastAction: CombatAction | null, westAction: CombatAction | null,
  push: PushBattleState | null,
  belt: BeltBattleState | null,
  rng: SeededRNG
): KimariteAttempt | null {

  // Build spatial context for classifier
  const ctx: SpatialBoutContext = {
    eastLeadFoot:   push?.eastLeadFoot ?? 0,
    westLeadFoot:   push?.westLeadFoot ?? 0,
    eastFacingAngle: 0,    // from PhysicalBody
    westFacingAngle: Math.PI,
    eastCoGOffset:  0,     // from PhysicalBody
    westCoGOffset:  0,
    eastGrip:       belt?.eastGripClass ?? 'none',
    westGrip:       belt?.westGripClass ?? 'none',
    torqueDiff:     belt ? belt.torqueEast - belt.torqueWest : 0,
    eastMomentumX:  push?.eastMomentum.x ?? 0,
    westMomentumX:  push?.westMomentum.x ?? 0,
    atEdge: (push?.eastLeadFoot ?? 0) >= EDGE_THRESHOLD || (push?.westLeadFoot ?? 0) >= EDGE_THRESHOLD,
  };

  // Each kimarite strategy now has a spatial condition instead of balance-based condition
  for (const strategy of KIMARITE_STRATEGIES_V2) {
    const side = strategy.appliesTo(ctx, east, west);
    if (!side) continue;

    // Technique succeeds based on force differential and stat check
    const power = side === 'east'
      ? ctx.torqueDiff + ctx.eastMomentumX + stat(east, 'technique')
      : -ctx.torqueDiff + ctx.westMomentumX + stat(west, 'technique');

    const resistance = side === 'east'
      ? stat(west, 'balance') + ctx.westCoGOffset * 10
      : stat(east, 'balance') + ctx.eastCoGOffset * 10;

    const succeeded = (power + jitter(rng, 8)) > (resistance + jitter(rng, 8));

    if (succeeded) {
      return { side, id: strategy.id, succeeded: true };
    }

    // Log as attempt (failed technique shows in pbp — "attempted uwatenage, opponent defended")
    return { side, id: strategy.id, succeeded: false };
  }

  return null;
}
```

### Kimarite → Physical Classifier Mapping

The key change to `kimariteStrategy.ts` conditions — from balance-based to spatial:

```typescript
// BEFORE (retroactive, balance-based):
yorikiri: {
  condition: (w, l) => w.grip !== 'none' && l.edgeDistance < 3 && w.forwardMomentum > 2
}

// AFTER (spatial, emergent):
yorikiri: {
  appliesTo: (ctx, e, w) => {
    // Yorikiri = belt grip + push walk-out + forward momentum
    const hasBelt = ctx.eastGrip !== 'none' || ctx.westGrip !== 'none';
    const atEdge = ctx.eastLeadFoot > EDGE_THRESHOLD || ctx.westLeadFoot > EDGE_THRESHOLD;
    const pushing = Math.abs(ctx.eastMomentumX) > 0.05 || Math.abs(ctx.westMomentumX) > 0.05;
    if (hasBelt && atEdge && pushing) {
      return ctx.eastLeadFoot > ctx.westLeadFoot ? 'west' : 'east'; // who's being pushed
    }
    return null;
  }
}

// Isamiashi (winner stumbles out after opponent dodges):
isamiashi: {
  appliesTo: (ctx, e, w) => {
    // Winner's momentum carries them past the boundary AFTER the opponent has moved
    const eastOverrun = ctx.eastLeadFoot >= RING_RADIUS && ctx.eastMomentumX > 0.15;
    const westOverrun = ctx.westLeadFoot >= RING_RADIUS && ctx.westMomentumX > 0.15;
    // The opponent is NOT at the edge (they dodged)
    if (eastOverrun && ctx.westLeadFoot < EDGE_THRESHOLD) return 'east'; // east stepped out
    if (westOverrun && ctx.eastLeadFoot < EDGE_THRESHOLD) return 'west';
    return null;
  }
}

// Tsuriotoshi (lift and drop):
tsuriotoshi: {
  appliesTo: (ctx, e, w) => {
    // Requires: moro-zashi grip, extreme vertical torque, opponent lifted
    const eastCanLift = ctx.eastGrip === 'morozashi' && stat(e, 'strength') > 75;
    const westCanLift = ctx.westGrip === 'morozashi' && stat(w, 'strength') > 75;
    const weightAdvantage = Math.abs(e.weight - w.weight) < 20; // close weights = lift is feasible
    if (eastCanLift && weightAdvantage && ctx.torqueDiff > 20) return 'east';
    if (westCanLift && weightAdvantage && -ctx.torqueDiff > 20) return 'west';
    return null;
  }
}
```

---

## Center of Mass: What It Changes

CoG tracking enables four kimarite families that are physically impossible in the current system:

### 1. Izori / Kakezori (back-bend throws)
```typescript
// Requires: winner is at severe CoG deficit (falling backward) but has mawashi grip
izori: {
  appliesTo: (ctx, e, w) => {
    const eastBackBend = st.east.cogOffset < -0.3 && ctx.eastGrip !== 'none';
    if (eastBackBend && ctx.torqueDiff > 15) return 'east'; // east falls back, throws west over
    return null;
  }
}
```

### 2. Koshikudake (hip collapse)
```typescript
// Requires: CoG too high, opponent applies lifting torque from below
koshikudake: {
  appliesTo: (ctx, e, w) => {
    // Tall fighter's CoG is high → vulnerable to low-body attacks
    const tallEast = st.east.cogHeight > 1.1 && stat(e, 'height') > 185;
    const westLowGrip = ctx.westGrip === 'shitate' && ctx.torqueDiff < -10;
    if (tallEast && westLowGrip) return 'east';
    return null;
  }
}
```

### 3. Fumidashi (foot forced out)
```typescript
// Requires: foot position crosses boundary even though body is upright
fumidashi: {
  appliesTo: (ctx, e, w) => {
    // Foot out but CoG is still inside (not a clean push-out)
    const eastFootOut = ctx.eastLeadFoot >= RING_RADIUS && st.east.cogOffset < 0.1;
    if (eastFootOut && ctx.westMomentumX < 0.1) return 'east'; // stepped out, not pushed
    return null;
  }
}
```

### 4. Uchigake / Sotogake (leg trips)
```typescript
// Requires: leg position vulnerable (tracked via stance width) + torque loading
sotogake: {
  appliesTo: (ctx, e, w) => {
    // West hooks outside east's leg; viable when east's stance is narrow
    const eastNarrowStance = push?.eastStanceWidth < 0.35;
    const westLegReach = stat(w, 'technique') > 60;
    const appropriateFacing = Math.abs(st.east.facingAngle) < 0.4; // facing roughly toward west
    if (eastNarrowStance && westLegReach && appropriateFacing && ctx.torqueDiff < -8) return 'east';
    return null;
  }
}
```

---

## True Grip: Lever Arm Evolution

`evolveGripGeometry` replaces `contestGripTick` — instead of promoting through an enum, it adjusts actual contact geometry:

```typescript
function evolveGripGeometry(
  rng: SeededRNG, east: Rikishi, west: Rikishi, belt: BeltBattleState
): void {
  const eastTech = stat(east, 'technique');
  const westTech = stat(west, 'technique');
  const margin = eastTech - westTech + jitter(rng, 8);

  // Hand penetration evolution (replaces outside→inside binary)
  if (margin > 12 && belt.eastLeft && !belt.eastLeft.isBlocked) {
    // East improving left arm reach (armReach → deeper → maemitsu)
    belt.eastLeft.armReach = Math.min(0.35, belt.eastLeft.armReach + 0.02);
    belt.eastLeft.isInside = belt.eastLeft.armReach > 0.15;
  }

  // Lever arm: deeper reach = longer lever arm = more torque
  if (belt.eastLeft) {
    belt.eastLeft.leverArm = 0.2 + belt.eastLeft.armReach * 0.8; // 0.2–0.48m range
  }

  // Grip strength decay from fatigue
  const fatigueDecay = 1 - (east.stats?.stamina ?? 50) / 1000;
  if (belt.eastLeft)  belt.eastLeft.gripStrength  *= fatigueDecay;
  if (belt.eastRight) belt.eastRight.gripStrength *= fatigueDecay;

  // Moro-zashi detection (both arms inside)
  const eastMorozashi = belt.eastLeft?.isInside && belt.eastRight?.isInside;
  const westMorozashi = belt.westLeft?.isInside && belt.westRight?.isInside;
  belt.eastGripClass = eastMorozashi ? 'morozashi'
    : (belt.eastLeft?.isInside || belt.eastRight?.isInside) ? 'uwate' : 'outside';
  belt.westGripClass = westMorozashi ? 'morozashi'
    : (belt.westLeft?.isInside || belt.westRight?.isInside) ? 'uwate' : 'outside';
}
```

---

## Tawara Drama: Narrative Hooks

The `EdgeCrisisState` generates richer narrative than any current system can produce because the drama is real:

```typescript
// New narrative events generated by edge_crisis phase:

// 1. Entry into crisis
"${defenderShikona} is backed to the tawara, heels on the straw"
// → combat.phases.edge_crisis.entry (new BardEngine path)

// 2. Tawara bounce recovery (escaped: true)
"${defenderShikona} uses the tawara's resistance to pivot back — impossible recovery!"
// → combat.phases.edge_crisis.tawara_escape

// 3. Extended crisis (ticksInCrisis > 5)  
"The crowd holds its breath. ${defenderShikona} has been at the edge for ${ticks} exchanges."
// → combat.phases.edge_crisis.extended_tension

// 4. Utchari (edge reversal throw)
"From the very lip of the ring, ${defenderShikona} throws ${attackerShikona} back across the dohyo!"
// → combat.phases.edge_crisis.utchari_reversal
```

---

## BoutLogEntry Extension

```typescript
interface BoutLogEntryV2 extends BoutLogEntry {
  phase: "tachiai" | "push_battle" | "belt_battle" | "edge_crisis" | "finish" | "engagement";
  spatial?: {
    eastLeadFoot:    number;  // meters
    westLeadFoot:    number;  // meters
    eastCoGOffset:   number;
    westCoGOffset:   number;
    eastFacingAngle: number;  // radians
    westFacingAngle: number;
    contestLine:     number;
  };
  beltState?: {
    eastGripClass: string;
    westGripClass: string;
    torqueDiff:    number;
  };
  attemptedKimarite?: {
    id:        KimariteId;
    side:      Side;
    succeeded: boolean;
  };
}
```

---

## Comparison to Current System

| Feature | Current | B+ |
|---------|---------|-----|
| Ring boundary | `balance / 100 × 15` estimate | Real foot position in meters |
| Kimarite | Post-physics retroactive fit | Mid-fight attempt on every tick |
| Isamiashi | Weighted option in a list | Emergent (momentum carries winner out) |
| Tawara drama | Impossible | `EdgeCrisisState` phase with bounce resistance |
| Grip power | Enum multipliers (1.3×, 0.85×) | Lever arm geometry (armReach × torque) |
| CoG | Comments only | Tracked; enables izori, koshikudake, sotogake |
| Leg trips | Balance < 30 check | Stance width + facing angle + torque loading |
| Momentum | Advantage streak counter | Directional vectors (m/tick) |
| Facing direction | Categorical (front/lateral/rear) | Continuous radians |
| Computation | ~120 ticks × simple math | ~120–180 ticks × spatial math (~2–3× heavier) |
| Determinism | ✓ seeded RNG | ✓ seeded RNG + fixed coordinate system |
| Narrative coupling | `log[]` array | `log[]` + spatial fields + edge_crisis events |

---

## What B+ Does NOT Do (Saved for Approach A)

- No true rigid-body physics (no impulse resolution, no contact manifolds)
- Leg positions are inferred from `stanceWidth` scalar, not tracked as coordinates
- Rotation is angular velocity applied to `facingAngle`, not full rotational dynamics
- Vertical axis not modeled (no ground reaction force, no lift height)
- No collision detection between bodies (contact is implicit in the phase model)

These limitations are acceptable trade-offs. The system produces emergent kimarite, real ring boundaries, tawara drama, and CoG-dependent techniques — without requiring a physics engine dependency.
