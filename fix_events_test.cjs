const fs = require('fs');

let content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');
content = content.replace(
  'import { queryEvents, logEngineEvent, ensureEventsState, tickWeek, EventBus, stableHash } from "../events";',
  'import { queryEvents, logEngineEvent, ensureEventsState, tickWeek, EventBus } from "../events";\nimport { stableHash } from "../utils/hash";'
);
fs.writeFileSync('src/engine/__tests__/events.test.ts', content);
