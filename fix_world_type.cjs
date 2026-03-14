const fs = require('fs');
let content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');

content = content.replace(
  /describe\("EventBus factories", \(\) => \{\n    let world;/,
  'describe("EventBus factories", () => {\n    let world: WorldState;'
);

content = content.replace(
  /import \{ ensureEventsState, logEngineEvent, tickWeek, queryEvents, EventBus \} from "\.\.\/events";/,
  'import { ensureEventsState, logEngineEvent, tickWeek, queryEvents, EventBus } from "../events";\nimport type { WorldState } from "../world";'
);

fs.writeFileSync('src/engine/__tests__/events.test.ts', content);
