const fs = require('fs');
const file = 'src/engine/types/oyakata.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('OyakataMood')) {
  code = code.replace('export type OyakataArchetype', `export type OyakataMood = "ecstatic" | "pleased" | "neutral" | "frustrated" | "furious";\n\nexport type OyakataArchetype`);

  code = code.replace('quirks?: string[];', 'mood?: OyakataMood;\n  quirks?: string[];');
  fs.writeFileSync(file, code);
  console.log('patched types');
} else {
  console.log('already patched');
}
