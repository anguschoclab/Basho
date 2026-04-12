import fs from 'fs';

let filepath = 'src/engine/npcRetirementStrategy.ts';
let content = fs.readFileSync(filepath, 'utf8');
content = content.replace('import { getRetirementContext, executeRetirement } from "./utils/strategy";', 'import { executeRetirement } from "./utils/strategy";');
fs.writeFileSync(filepath, content);

filepath = 'src/engine/utils/strategy.ts';
content = fs.readFileSync(filepath, 'utf8');
content = content.replace(/export function getRetirementContext\(world: WorldState, heya: Heya\) \{[\s\S]*?\}\n\n/, '');
fs.writeFileSync(filepath, content);

// We need to keep countsAsForeignFromRikishi in TalentPoolService.ts because it is used by overflow.ts
// Wait, is it used by overflow.ts?
// Yes: import { getForeignCountInHeya, countsAsForeignFromRikishi, reinjectToTalentPool } from "./systems/generation/TalentPoolService";
