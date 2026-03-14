const fs = require('fs');

const file = 'src/engine/__tests__/saveload.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Ensure hasLocalStorage returns true by making sure window exists
content = content.replace(/if \(typeof window !== 'undefined'\) \{/g, `
// Force window object for tests so hasLocalStorage() returns true
if (typeof window === 'undefined') {
  globalThis.window = { localStorage: localStorageMock } as any;
}
if (typeof window !== 'undefined') {`);

fs.writeFileSync(file, content);
console.log('Fixed saveload tests windows object');
