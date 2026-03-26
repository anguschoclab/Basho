const fs = require('fs');
const calFile = 'src/engine/calendar.ts';
let calCode = fs.readFileSync(calFile, 'utf8');
if (!calCode.includes('export function isBashoMonth')) {
    calCode += `\nexport function isBashoMonth(month: number): boolean {\n  return month % 2 !== 0;\n}\n`;
    fs.writeFileSync(calFile, calCode);
}
