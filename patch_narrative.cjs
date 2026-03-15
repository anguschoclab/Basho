const fs = require('fs');
let code = fs.readFileSync('src/engine/narrative.ts', 'utf8');
code = code.replace("import { pick } from './utils';\n", "");
fs.writeFileSync('src/engine/narrative.ts', code);
