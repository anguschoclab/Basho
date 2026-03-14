const fs = require('fs');
const file = 'src/engine/bout.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('tactical_adaptation')) {

  // 1. Add Tactical Adaptation as a momentum shift reason
  code = code.replace(
    '| "physics_wall"  // NEW\n  | "mizu_iri";     // NEW',
    '| "physics_wall"  // NEW\n  | "mizu_iri"     // NEW\n  | "tactical_adaptation"; // NEW'
  );

  // 2. Insert tactical adaptation into resolveMomentumTick
  const oldMomentumEnd = `
  const isStalemate = st.advantage === "none";
  const intensity = isStalemate && st.stance !== "push-dominant" ? "low" : "high";
  const pTime = calculatePhaseTime(rng, st.stance, intensity);
  st.timeSeconds += pTime;

  // Time Limit (Mizu-iri check)
  if (st.timeSeconds > 240 && !st.mizuiriDeclared) {
    st.mizuiriDeclared = true;
    st.log.push({
      phase: "momentum",
      description: "Mizu-iri! The rikishi are separated to rest after a 4-minute deadlock.",
      data: { reason: "mizu_iri", duration: pTime }
    } as any);
    st.fatigueEast *= 0.2;
    st.fatigueWest *= 0.2;
    st.advantage = "none";
    return;
  }`;

  const tacticalLogic = `
  // TACTICAL ADAPTATION (Bout IQ)
  // If a rikishi is heavily disadvantaged and fatigued, they might try a desperation move
  let adaptationFired = false;
  if (st.advantage !== "none") {
    const trailingSide = st.advantage === "east" ? "west" : "east";
    const trailingRikishi = trailingSide === "east" ? east : west;
    const trailingFatigue = trailingSide === "east" ? st.fatigueEast : st.fatigueWest;

    // Condition: Trailing rikishi is tired (> 40) and has high technique/mental (Bout IQ)
    if (trailingFatigue > 40 && stat(trailingRikishi, "technique") > 65 && stat(trailingRikishi, "mental") > 50) {
      // 10% chance per tick to attempt adaptation when in trouble
      if (rng.next() < 0.10) {
        adaptationFired = true;
        st.advantage = "none"; // Reset advantage due to sudden shift

        // Either they change stance or pull a sudden move
        if (rng.next() < 0.5) {
          st.stance = st.stance === "push-dominant" ? "belt-dominant" : "push-dominant";
        }

        st.log.push({
          phase: "tactical" as any,
          description: "Sensing overwhelming pressure, a sudden tactical shift changes the flow of the bout!",
          data: {
            reason: "tactical_adaptation",
            trailingSide
          }
        } as any);

        // Adrenaline burst - regain some fatigue
        if (trailingSide === "east") st.fatigueEast *= 0.8;
        else st.fatigueWest *= 0.8;
      }
    }
  }
`;

  code = code.replace(oldMomentumEnd, oldMomentumEnd + '\n' + tacticalLogic);

  // 3. Make sure to emit 'tactical' in BoutPhase if it's missing from pbp.ts / types.ts
  fs.writeFileSync(file, code);
  console.log("Patched bout.ts");
} else {
  console.log("bout.ts already patched");
}
