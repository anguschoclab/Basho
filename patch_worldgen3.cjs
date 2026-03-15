const fs = require('fs');
let code = fs.readFileSync('src/engine/worldgen.ts', 'utf8');

// I think the previous `bun install --frozen-lockfile` or `git checkout` reverted my changes to `worldgen.ts`.
// Let's re-apply the playerConfig override logic.

code = code.replace(
  'const actualSeed = typeof seed === "string" ? seed : seed?.seed || "initial-seed";',
  `const actualSeed = typeof seed === "string" ? seed : seed?.seed || "initial-seed";
  const playerConfig = typeof seed === "object" ? seed.playerConfig : undefined;`
);

const heyaGenEnd = code.indexOf('// 2. Create Rikishi');

if (heyaGenEnd !== -1) {
  const insertIndex = heyaGenEnd;
  const insertCode = `
  // --- PLAYER CONFIG OVERRIDES ---
  if (playerConfig && playerConfig.heyaId) {
    const pHeya = heyaMap.get(playerConfig.heyaId);
    if (pHeya) {
      pHeya.isPlayerOwned = true;
      const pOyakata = oyakataMap.get(pHeya.oyakataId);
      if (pOyakata) {
        if (playerConfig.name) pOyakata.name = \`\${playerConfig.name} Oyakata\`;

        let fundsBonus = 0;
        let scoutingBonus = 50;
        let trainingBonus = 50;

        if (playerConfig.background === "yokozuna") {
          fundsBonus = 5_000_000;
          scoutingBonus = 70;
          trainingBonus = 80;
          pOyakata.highestRank = "Yokozuna";
        } else if (playerConfig.background === "ozeki") {
          fundsBonus = 15_000_000;
          scoutingBonus = 60;
          trainingBonus = 70;
          pOyakata.highestRank = "Ozeki";
        } else if (playerConfig.background === "maegashira") {
          fundsBonus = 30_000_000;
          scoutingBonus = 50;
          trainingBonus = 50;
          pOyakata.highestRank = "Maegashira";
        }

        pHeya.funds = Math.max(pHeya.funds, fundsBonus);
        if (pOyakata.stats) {
          pOyakata.stats.scouting = scoutingBonus;
          pOyakata.stats.training = trainingBonus;
        }
      }
    }
  }
  // --------------------------------
  `;

  code = code.slice(0, insertIndex) + insertCode + code.slice(insertIndex);
}

fs.writeFileSync('src/engine/worldgen.ts', code);
console.log('Patched worldgen.ts with playerConfig overrides');
