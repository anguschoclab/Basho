const fs = require('fs');

const file = 'src/engine/__tests__/autoSim.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Fix bun:test it signature. `it("desc", { timeout }, () => {})` is Vitest. In bun:test it's `it("desc", () => {}, { timeout })` or similar, or just `it("desc", () => {}, 10000)`
content = content.replace(/it\("should simulate an entire basho deterministically", \{ timeout: 10000 \}, \(\) => \{/g, 'it("should simulate an entire basho deterministically", () => {');

fs.writeFileSync(file, content);
console.log('Fixed autoSim test');
