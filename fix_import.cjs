const fs = require('fs');
let content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');

content = content.replace(
  /import \{ ensureEventsState, logEngineEvent, tickWeek, queryEvents \} from "\.\.\/events";/,
  'import { ensureEventsState, logEngineEvent, tickWeek, queryEvents, EventBus } from "../events";'
);

fs.writeFileSync('src/engine/__tests__/events.test.ts', content);
