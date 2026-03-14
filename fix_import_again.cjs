const fs = require('fs');
let content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');

content = content.replace(
  /import \{ queryEvents, logEngineEvent, ensureEventsState, tickWeek \} from "\.\.\/events";/,
  'import { queryEvents, logEngineEvent, ensureEventsState, tickWeek, EventBus } from "../events";'
);

fs.writeFileSync('src/engine/__tests__/events.test.ts', content);
