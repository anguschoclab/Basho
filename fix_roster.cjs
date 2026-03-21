const fs = require('fs');
let file = fs.readFileSync('src/components/dashboard/RosterWidget.tsx', 'utf8');

file = file.replace(
  'const exhaustedCount = roster.reduce((count, r) => count + (r.fatigueBand === "exhausted" || r.fatigueBand === "spent" ? 1 : 0), 0);',
  'const exhaustedCount = roster.reduce((count, r) => count + (r.fatigueBand === "exhausted" || r.fatigueBand === "spent" ? 1 : 0), 0);'
);

// We need to fix the sort issue, momentum was removed.
// The file has: return entries.sort((a, b) => 0); Let's replace it to sort by rank or id to make it stable.
file = file.replace('return entries.sort((a, b) => 0);', 'return entries.sort((a, b) => a.id.localeCompare(b.id));');

fs.writeFileSync('src/components/dashboard/RosterWidget.tsx', file, 'utf8');
