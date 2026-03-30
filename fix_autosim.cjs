const fs = require('fs');

let autoSim = fs.readFileSync('src/engine/autoSim.ts', 'utf8');
autoSim = autoSim.replace(/export function simulateBashoDay\(world: WorldState\) \{[\s\S]*\}\n/g, '');
fs.writeFileSync('src/engine/autoSim.ts', autoSim);

let calendar = fs.readFileSync('src/engine/calendar.ts', 'utf8');
calendar = calendar.replace(/export function endBasho\(world: WorldState\) \{[\s\S]*\}\n/g, '');
fs.writeFileSync('src/engine/calendar.ts', calendar);
