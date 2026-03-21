const fs = require('fs');
let file = fs.readFileSync('src/engine/uiDigest.ts', 'utf8');

file = file.replace(
  'import { stableSort } from "./utils/sort";',
  'import { stableSort } from "./utils/sort";\nimport { toSatisfactionBand, type SatisfactionBand } from "./descriptorBands";'
);

fs.writeFileSync('src/engine/uiDigest.ts', file, 'utf8');
