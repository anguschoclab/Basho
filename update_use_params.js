const fs = require('fs');
const path = require('path');

function replaceUseParams(filePath, routeName) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/useParams\s*(<[^>]+>)?\s*\(\)/g, `useParams({ strict: false })`);
  fs.writeFileSync(filePath, content);
}

replaceUseParams('src/pages/RikishiPage.tsx', 'rikishiIdRoute');
replaceUseParams('src/pages/StablePage.tsx', 'stableIdRoute');
