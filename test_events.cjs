const fs = require('fs');
const content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');

const regex = /import\s+\{\s*([^\}]+)\s*\}\s+from\s+"([^"]+)";/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('Import:', match[1], 'from', match[2]);
}
