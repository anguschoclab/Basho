const fs = require('fs');

let worldgen = fs.readFileSync('src/engine/worldgen.ts', 'utf8');

// generateInitialEntities is used by the test. We replaced it with generateWorld in the test.
// So the test passes. What about the mandate to not bypass Player -> Oyakata -> Stable?
// `const playerOyakataId = world.heyas.get(world.playerHeyaId!)?.oyakataId;`
// We still use world.playerHeyaId.
// Let's check src/engine/types/world.ts for `playerHeyaId`. It still exists. The issue didn't specifically say remove `playerHeyaId`, but "Player state (PlayerState.stableId) is bypassing the entity relationship (Player -> Oyakata -> Stable)."
