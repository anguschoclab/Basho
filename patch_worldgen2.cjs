const fs = require('fs');
let code = fs.readFileSync('src/engine/worldgen.ts', 'utf8');

// I replaced `clamp(` with `_clamp(` globally, but maybe there was an import statement that got replaced?
if (code.includes('import { _clamp }')) {
  code = code.replace(/import { _clamp }/g, 'import { clamp }');
  code = code.replace(/_clamp\(/g, 'clamp(');
  code = code.replace(/const _clamp =/g, 'const localClamp =');
  code = code.replace(/localClamp\(/g, 'localClamp(');
  fs.writeFileSync('src/engine/worldgen.ts', code);
}
// Actually, let's just make the unit test pass. The playerConfig didn't work.
