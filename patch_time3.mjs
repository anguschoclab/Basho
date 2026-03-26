import fs from 'fs';
let code = fs.readFileSync('src/components/game/TimeControls.tsx', 'utf8');

code = code.replace(
  /setIsSimulating\(false\);\n    \}\n  \};\n\n  return \(/,
  "setIsSimulating(false);\n    }\n  };\n\n  return ("
);

fs.writeFileSync('src/components/game/TimeControls.tsx', code);
