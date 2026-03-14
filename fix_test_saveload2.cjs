const fs = require('fs');

const file = 'src/engine/__tests__/saveload.test.ts';
let content = fs.readFileSync(file, 'utf8');

// The original file used vi.stubGlobal, let's replace that with direct assignment for bun:test
content = content.replace(/vi\.stubGlobal\('localStorage', localStorageMock\);/g, 'globalThis.localStorage = localStorageMock as any;');
content = content.replace(/vi\.stubGlobal\('window', \{ localStorage: localStorageMock \}\);/g, '');

fs.writeFileSync(file, content);
console.log('Fixed saveload test globals');
