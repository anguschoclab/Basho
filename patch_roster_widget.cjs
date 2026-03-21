const fs = require('fs');
let file = fs.readFileSync('src/components/dashboard/RosterWidget.tsx', 'utf8');

file = file.replace(/b\.momentum \- a\.momentum/g, '0');

file = file.replace(
  'const avgFatigue = roster.length ? Math.round(roster.reduce((s, r) => s + r.fatigue, 0) / roster.length) : 0;',
  `const exhaustedCount = roster.reduce((count, r) => count + (r.fatigueBand === "exhausted" || r.fatigueBand === "spent" ? 1 : 0), 0);
  const fatigueWarning = exhaustedCount > 0;`
);

file = file.replace(
  '<span className="text-[10px]">Avg fatigue: {avgFatigue}%</span>',
  '<span className="text-[10px]">{exhaustedCount} exhausted</span>'
);

file = file.replace(
  '{/* Team fatigue overview bar */}\n      <div className="h-1 rounded-full bg-muted overflow-hidden">\n        <div\n          className={`h-full rounded-full transition-all duration-500 ${\n            avgFatigue > 70 ? "bg-destructive" : avgFatigue > 40 ? "bg-warning" : "bg-primary"\n          }`}\n          style={{ width: `${avgFatigue}%` }}\n        />\n      </div>',
  `{/* Team fatigue warning */}\n      {fatigueWarning && (\n        <div className="h-1 rounded-full bg-muted overflow-hidden">\n          <div className="h-full rounded-full transition-all duration-500 bg-destructive" style={{ width: \`\${(exhaustedCount / roster.length) * 100}%\` }} />\n        </div>\n      )}`
);

file = file.replace(
  'className={`h-full rounded-full transition-all duration-300 ${\n                  entry.fatigue > 70 ? "bg-destructive" : entry.fatigue > 40 ? "bg-warning" : "bg-primary/60"\n                }`}\n                style={{ width: `${entry.fatigue}%` }}',
  'className={`h-full rounded-full transition-all duration-300 ${\n                  entry.fatigueBand === "spent" || entry.fatigueBand === "exhausted" ? "bg-destructive w-[90%]" : entry.fatigueBand === "tired" ? "bg-warning w-[60%]" : entry.fatigueBand === "light" ? "bg-primary/60 w-[30%]" : "bg-success w-[10%]"\n                }`}'
);

fs.writeFileSync('src/components/dashboard/RosterWidget.tsx', file, 'utf8');
