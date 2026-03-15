const fs = require('fs');

['src/engine/bout.ts', 'src/engine/narrativeDescriptions.ts', 'src/engine/worldgen.ts'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('const clamp =')) {
    code = code.replace(/const clamp =/g, 'const _clamp =');
    // Also rename references
    code = code.replace(/clamp\(/g, '_clamp(');
    // Be careful with imports: "import { clamp }" should NOT be renamed, but regex `clamp\(` only matches function calls.
    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  }
});
