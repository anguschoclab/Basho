const fs = require('fs');

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

replaceInFile('src/engine/__tests__/governance.test.ts', [
  { search: 'import { describe, it, expect, vi } from "vitest";', replace: 'import { describe, it, expect, mock } from "bun:test";' },
  { search: 'vi.mock(', replace: 'mock.module(' }
]);

replaceInFile('src/engine/__tests__/talentpool.test.ts', [
  { search: /\(world as any\)\.talentPool/g, replace: 'world.talentPool' },
  { search: /\(world1 as any\)\.talentPool/g, replace: 'world1.talentPool' },
  { search: /\(world2 as any\)\.talentPool/g, replace: 'world2.talentPool' },
  { search: '(r1 as any).nationality', replace: 'r1.nationality' },
  { search: '(world as any).year', replace: 'world.year' },
  { search: '} as any;', replace: '} as unknown as any;' }
]);

console.log('Fixed governance and talent pool tests for bun:test without conflicts');
