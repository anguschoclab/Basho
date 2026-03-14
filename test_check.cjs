const fs = require('fs');

const content = fs.readFileSync('src/engine/__tests__/governance.test.ts', 'utf8');
if (content.includes('vi.mock')) {
    console.log('Still found vi.mock in governance test!');
} else {
    console.log('governance test is clean of vi.mock');
}
