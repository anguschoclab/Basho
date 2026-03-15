const fs = require('fs');

['src/pages/RivalriesPage.tsx'].forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  // remove duplicate import of clamp in RivalriesPage
  if (code.includes('import { clamp } from "../engine/utils";\nimport { clamp } from \'../engine/utils\';')) {
    code = code.replace('import { clamp } from "../engine/utils";\n', '');
    fs.writeFileSync(file, code);
    console.log(`Patched ${file}`);
  }
});
