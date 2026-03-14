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

replaceInFile('src/engine/__tests__/matchmaking.test.ts', [
  { search: 'mockRikishi("r2", { injured: true } as any)', replace: 'mockRikishi("r2", { injured: true } as unknown as any)' }
]);

console.log('Fixed additional test issue');
