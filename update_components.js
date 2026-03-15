import fs from 'fs';

const filesToUpdate = [
  'src/components/banzuke/RikishiCell.tsx',
  'src/components/dashboard/BashoWidget.tsx',
  'src/components/dashboard/RosterWidget.tsx',
  'src/components/dashboard/BanzukeWidget.tsx',
  'src/components/game/PlayoffBracket.tsx'
];

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import {([^}]*)ClickableName([^}]*)} from "@\/components\/ClickableName";/, (match, p1, p2) => {
    if (p1.includes('RikishiName') || p2.includes('RikishiName')) {
      return match.replace('ClickableName', 'RikishiName').replace('RikishiName, RikishiName', 'RikishiName');
    }
    return match.replace('ClickableName', 'RikishiName');
  });

  content = content.replace(/<ClickableName([^>]*?)type="rikishi"([^>]*?)>/g, '<RikishiName$1$2>');
  // Cleanup empty type prop left in multiline declarations
  content = content.replace(/type="rikishi"\n\s*/g, '');
  
  fs.writeFileSync(file, content);
}
