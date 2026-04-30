const fs = require('fs');

let content = fs.readFileSync('src/contexts/gameReducer.ts', 'utf8');
content = content.replace(
  'return { ...next, digest: buildWeeklyDigest(next.world) };',
  "try {\n      return { ...next, digest: buildWeeklyDigest(next.world) };\n    } catch (error) {\n      console.error('Error loading data:', error);\n      return state;\n    }"
);

fs.writeFileSync('src/contexts/gameReducer.ts', content);
