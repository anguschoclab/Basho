const fs = require('fs');
const file = 'src/engine/tick/tickMonthly.ts';
let code = fs.readFileSync(file, 'utf8');

// Ensure import for runTickPipeline exists
if (!code.includes('import { runTickPipeline')) {
    code = code.replace(`import { stableSort } from "../utils/sort";`, `import { stableSort } from "../utils/sort";\nimport { runTickPipeline, type TickStep } from "./tickOrchestrator";`);
}

// Add isBashoMonth
if (!code.includes('import { isBashoMonth }')) {
    code = code.replace(`import { stableSort } from "../utils/sort";`, `import { stableSort } from "../utils/sort";\nimport { isBashoMonth } from "../calendar";`);
}

// Ensure the pipeline has tickArchetypeDrift
if (!code.includes('tickArchetypeDrift')) {
    code = code.replace(
        `{ label: "economics_monthly", run: (w) => { tickMonthlyEconomics(w); } },`,
        `{ label: "economics_monthly", run: (w) => { tickMonthlyEconomics(w); } },\n    { label: "archetype_drift", run: (w) => { tickArchetypeDrift(w); } },`
    );

    const functionAdd = `
/**
 * Flag 2: Archetype Drift & Hysteresis Logic
 * Evaluate drift only post-Basho (odd-numbered months).
 */
export function tickArchetypeDrift(world: WorldState): void {
  if (isBashoMonth(world.calendar.month)) {
    for (const r of world.rikishi.values()) {
      if (!r.archetypeEvidence || Array.isArray(r.archetypeEvidence)) continue;

      const evidence = r.archetypeEvidence;
      const pushSuccess = evidence.push.success;
      const grappleSuccess = evidence.grapple.success;
      const evadeSuccess = evidence.evade.success;

      // Determine the most successful tactical family during this basho
      let newArchetype = r.tacticalArchetypePrimary;

      if (pushSuccess > grappleSuccess && pushSuccess > evadeSuccess && pushSuccess >= 5) {
        newArchetype = 'oshi';
      } else if (grappleSuccess > pushSuccess && grappleSuccess > evadeSuccess && grappleSuccess >= 5) {
        newArchetype = 'yotsu';
      } else if (evadeSuccess > pushSuccess && evadeSuccess > grappleSuccess && evadeSuccess >= 5) {
        newArchetype = 'trickster';
      }

      // If a drift occurred, dispatch event and update
      if (newArchetype !== r.tacticalArchetypePrimary) {
        logEngineEvent(world, {
          type: "ARCHETYPE_DRIFT",
          category: "combat",
          importance: "minor",
          scope: "rikishi",
          rikishiId: r.id,
          title: \`\${r.shikona} Tactical Shift\`,
          summary: \`\${r.shikona} has drifted towards a \${newArchetype} style after a successful basho.\`,
          data: { old: r.tacticalArchetypePrimary, new: newArchetype },
          tags: ["combat", "progression"]
        });
        r.tacticalArchetypePrimary = newArchetype;
      }

      // Reset accumulator to zeros
      evidence.push = { success: 0, fail: 0 };
      evidence.grapple = { success: 0, fail: 0 };
      evidence.evade = { success: 0, fail: 0 };
    }
  }
}
`;
    code += functionAdd;
    fs.writeFileSync(file, code);
}
