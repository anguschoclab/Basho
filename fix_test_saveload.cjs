const fs = require('fs');

const file = 'src/engine/__tests__/saveload.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import \{ describe, it, expect, vi \} from "vitest";/g, 'import { describe, it, expect, mock } from "bun:test";');
content = content.replace(/vi\.mock\(/g, 'mock.module(');

// Also need to fix localStorage error in saveload tests if it exists
if (content.includes('localStorage')) {
    const localStorageMock = `
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();
globalThis.localStorage = localStorageMock as any;
`;
    // Find a good place to inject it
    if (!content.includes('localStorageMock')) {
        content = content.replace('describe("Save/Load System", () => {', `${localStorageMock}\n\ndescribe("Save/Load System", () => {`);
    }
}

fs.writeFileSync(file, content);
console.log('Fixed saveload test');

const govFile = 'src/engine/__tests__/governance.test.ts';
let govContent = fs.readFileSync(govFile, 'utf8');
govContent = govContent.replace(/import \{ describe, it, expect, vi \} from "vitest";/g, 'import { describe, it, expect, mock } from "bun:test";');
govContent = govContent.replace(/vi\.mock\(/g, 'mock.module(');
fs.writeFileSync(govFile, govContent);
console.log('Fixed governance test');
