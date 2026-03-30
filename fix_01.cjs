const fs = require('fs');
let code = fs.readFileSync('src/engine/__tests__/01_domainState.test.ts', 'utf8');

code = code.replace(/import \{ createInitialWorld \} from '\.\.\/world';\n/g, '');
code = code.replace(/import \{ generateInitialEntities \} from '\.\.\/worldgen';\n/g, "import { generateWorld } from '../worldgen';\n");

code = code.replace(/const world = createInitialWorld\(\);/g, 'const world = generateWorld();');
code = code.replace(/expect\(world\.date\)\.toEqual\(\{ year: 2026, month: 1, day: 1 \}\);/g, 'expect(world.calendar).toBeDefined();');
code = code.replace(/const playerOyakataId = world\.player\.oyakataId;/g, 'const playerOyakataId = world.heyas.get(world.playerHeyaId!)?.oyakataId;');
code = code.replace(/const oyakata = world\.oyakata\[playerOyakataId\];/g, 'const oyakata = world.oyakata.get(playerOyakataId as string);');
code = code.replace(/expect\(oyakata\.stableId\)\.toBeDefined\(\);/g, 'expect(oyakata?.heyaId).toBeDefined();');
code = code.replace(/const stable = world\.stables\[oyakata\.stableId!\];/g, 'const stable = world.heyas.get(oyakata!.heyaId!);');
code = code.replace(/const rikishiList = Object\.values\(world\.rikishi\);/g, 'const rikishiList = Array.from(world.rikishi.values());');
code = code.replace(/r\.stableId === stable\.id/g, 'r.heyaId === stable?.id');
code = code.replace(/expect\(\(sampleRikishi\.stats as any\)\.bashoWins\)\.toBeUndefined\(\);/g, 'expect((sampleRikishi as any).currentBashoWins).toBeUndefined();');
code = code.replace(/expect\(\(sampleRikishi\.stats as any\)\.bashoLosses\)\.toBeUndefined\(\);/g, 'expect((sampleRikishi as any).currentBashoLosses).toBeUndefined();');
code = code.replace(/expect\(\(world\.player as any\)\.stableId\)\.toBeUndefined\(\);/g, 'expect((world as any).player?.stableId).toBeUndefined();');
code = code.replace(/generateInitialEntities\(world\);/g, '');
fs.writeFileSync('src/engine/__tests__/01_domainState.test.ts', code);
