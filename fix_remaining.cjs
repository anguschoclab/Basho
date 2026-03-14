const fs = require('fs');

function replaceAsAny(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content);
}

replaceAsAny('src/engine/autoSim.ts', [
  { search: 'const anyWorld: any = world as any;', replace: 'const anyWorld: any = world;' }
]);

replaceAsAny('src/engine/welfare.ts', [
  { search: '(heya.riskIndicators as any).welfare', replace: 'heya.riskIndicators.welfare' }
]);

replaceAsAny('src/engine/saveload.ts', [
  { search: '} as any;', replace: '};' }
]);

console.log('Fixed remaining files');
