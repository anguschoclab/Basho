import fs from 'fs';
let code = fs.readFileSync('src/components/game/HolidayControls.tsx', 'utf8');

code = code.replace(
  /import \{\n  DEFAULT_CRITICAL_GATES\n\} from "@\/presenters\/uiDigest";/g,
  ""
);

code = code.replace(
  /import type \{\nimport \{ DEFAULT_CRITICAL_GATES \} from "@\/presenters\/uiDigest";/,
  `import { DEFAULT_CRITICAL_GATES } from "@/presenters/uiDigest";\nimport { toDurationBand, DURATION_LABELS } from "@/engine/descriptorBands";\nimport type {`
);


fs.writeFileSync('src/components/game/HolidayControls.tsx', code);
