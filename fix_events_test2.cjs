const fs = require('fs');

let content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');
content = content.replace(
  'import { queryEvents, logEngineEvent, ensureEventsState, tickWeek, EventBus } from "../events";\nimport { stableHash } from "../utils/hash";',
  'import { queryEvents, logEngineEvent, ensureEventsState, tickWeek, EventBus } from "../events";\n// Replicate stableHash locally for tests since it is unexported\nfunction stableHash(s: string): string {\n  let h = 0; for(let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;\n  return (h >>> 0).toString(16);\n}'
);
fs.writeFileSync('src/engine/__tests__/events.test.ts', content);
