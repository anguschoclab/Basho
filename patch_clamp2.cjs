const fs = require('fs');

['src/engine/banzuke.ts'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('function clampInt(')) {
    code = code.replace(/function clampInt\(/g, 'function localClampInt(');
    // Also rename references
    code = code.replace(/clampInt\(/g, 'localClampInt(');
    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  }
});
