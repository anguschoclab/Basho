const fs = require('fs');

function replaceUseParams(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/useParams\s*(<[^>]+>)?\s*\(\)/g, `useParams({ strict: false })`);
  fs.writeFileSync(filePath, content);
}

replaceUseParams('src/pages/RikishiPage.tsx');
replaceUseParams('src/pages/StablePage.tsx');
