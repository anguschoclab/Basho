const fs = require('fs');
const file = 'src/pages/MainMenu.tsx';
let data = fs.readFileSync(file, 'utf8');
data = data.replace(
  /const newSeed = seed\?\.trim\(\) \? seed\.trim\(\) : makeDeterministicSeed\("world"\);/,
  'const newSeed = makeDeterministicSeed("world");'
);
fs.writeFileSync(file, data);
console.log('Patched MainMenu.tsx');
