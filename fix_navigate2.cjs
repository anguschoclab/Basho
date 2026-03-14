const fs = require('fs');
const glob = require('glob');

function fixNavigate(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/navigate\(\{ to: `([^`]+)` \}\)/g, `navigate({ to: "$1" })`);
  fs.writeFileSync(filePath, content);
}

glob.sync('src/**/*.tsx').forEach(fixNavigate);
glob.sync('src/**/*.ts').forEach(fixNavigate);
