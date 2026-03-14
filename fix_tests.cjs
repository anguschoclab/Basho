const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of replacements) {
    if (search instanceof RegExp) {
        content = content.replace(search, replace);
    } else {
        content = content.split(search).join(replace);
    }
  }
  fs.writeFileSync(filePath, content);
}

replaceInFile('src/engine/__tests__/bout.test.ts', [
  { search: '(result as any).isKinboshi', replace: 'result.isKinboshi' },
  { search: '(result as any).pbpLines', replace: 'result.pbpLines' },
  { search: '(result as any).pbp', replace: 'result.pbp' }
]);

replaceInFile('src/engine/__tests__/dailyTick.test.ts', [
  { search: ']) as any,', replace: ']) as unknown as Map<string, any>,' },
  { search: 'heyas: new Map([["test-heya", heya]]) as any,', replace: 'heyas: new Map([["test-heya", heya]]) as unknown as Map<string, any>,' },
  { search: '} as any', replace: '} as unknown as any' }
]);

replaceInFile('src/engine/__tests__/historyIndex.test.ts', [
  { search: 'const world = generateWorld("test-history") as any;', replace: 'const world = generateWorld("test-history");' },
  { search: '} as any;', replace: '} as unknown as any;' }
]);

replaceInFile('src/engine/__tests__/injuries.test.ts', [
  { search: '} as any]]),', replace: '} as unknown as any]]),'},
  { search: '(heya.facilities as any).recovery', replace: '(heya.facilities as unknown as { recovery: number }).recovery' },
  { search: 'const r = world.rikishi.get("r1")! as any;', replace: 'const r = world.rikishi.get("r1")!;' }
]);

replaceInFile('src/engine/__tests__/matchmaking.test.ts', [
  { search: '} as any);', replace: '} as unknown as any);' }
]);

replaceInFile('src/engine/__tests__/metaShift.test.ts', [
  { search: '} as any);', replace: '} as unknown as any);' }
]);

replaceInFile('src/engine/__tests__/npcAI_full.test.ts', [
  { search: '} as any)', replace: '} as unknown as any)' },
  { search: 'const heya = world.heyas.get("h1")! as any;', replace: 'const heya = world.heyas.get("h1")!;' },
  { search: '(world as any).trainingState', replace: 'world.trainingState' },
  { search: 'const r1 = world.rikishi.get("r1")! as any;', replace: 'const r1 = world.rikishi.get("r1")!;' }
]);

replaceInFile('src/engine/__tests__/uiModels.test.ts', [
  { search: '(uiRikishi as any).power', replace: '(uiRikishi as { power?: number }).power' }
]);

// Talent Pool tests have A LOT of world as any
replaceInFile('src/engine/__tests__/talentpool.test.ts', [
  { search: /\(world as any\)\.talentPool/g, replace: 'world.talentPool' },
  { search: /\(world1 as any\)\.talentPool/g, replace: 'world1.talentPool' },
  { search: /\(world2 as any\)\.talentPool/g, replace: 'world2.talentPool' },
  { search: '(r1 as any).nationality', replace: 'r1.nationality' },
  { search: '(world as any).year', replace: 'world.year' },
  { search: '} as any;', replace: '} as unknown as any;' }
]);

console.log('Fixed tests');
