const fs = require('fs');

const file = 'src/engine/__tests__/saveload.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Also mock localStorage inside the file if globalThis isn't working
content = content.replace(/globalThis\.localStorage = localStorageMock as any;/g,
`globalThis.localStorage = localStorageMock as any;
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  }
`);

fs.writeFileSync(file, content);
console.log('Fixed saveload test globals again');
