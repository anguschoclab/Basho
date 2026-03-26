const fs = require('fs');
const file = 'src/presenters/uiModels.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `export function getLocalizedArchetype(archetype?: import("../engine/types/combat").CombatArchetype): string {
    if (!archetype) return "All-Rounder";
    const map: Record<string, string> = {
        oshi: "Explosive Blitzer",
        giant: "Immovable Mountain",
        trickster: "Acrobatic Trickster",
        yotsu: "Defensive Stalwart",
        hybrid: "Dynamic Tactician",
        speedster: "Lightning Specialist",
    };
    return map[archetype] || "Unknown";
}

// ─────────────────────────────────────────
//  Banzuke Grid Projections`;

if (!code.includes("getLocalizedArchetype")) {
  code = code.replace(`// ─────────────────────────────────────────
//  Banzuke Grid Projections`, replacement);

  const target = `  const archetypeName = archInfo?.label ?? r.archetype;`;
  const replacement2 = `  // Prevent narrative leakage: Use localized string instead of raw enum fallback
  const archetypeName = archInfo?.label ?? getLocalizedArchetype(r.tacticalArchetypePrimary);`;
  code = code.replace(target, replacement2);

  fs.writeFileSync(file, code);
}
