const fs = require('fs');

const file = 'src/engine/injuries.ts';
let content = fs.readFileSync(file, 'utf8');

// I replaced `ts?.focusSlots as any[] | undefined;` with `ts?.focusSlots | undefined;`
// That's a bitwise OR instead of type union! Need to fix it!
content = content.replace(/const slots = ts\?\.focusSlots \| undefined;/g, 'const slots = ts?.focusSlots;');

fs.writeFileSync(file, content);
console.log('Fixed bitwise OR error in injuries.ts');
