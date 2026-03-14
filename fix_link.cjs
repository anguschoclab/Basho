const fs = require('fs');

function fixLink(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/<Link to=\{`/g, '<Link to={`'); // Ensure we keep standard template tags, handle param passing later if needed

  // Specific fix for ClickableName.tsx
  if (filePath.includes('ClickableName.tsx')) {
    content = content.replace(/<Link to=\{`\/rikishi\/\$\{id\}`\}/g, '<Link to="/rikishi/$rikishiId" params={{ rikishiId: id }}');
    content = content.replace(/<Link to=\{`\/stable\/\$\{id\}`\}/g, '<Link to="/stable/$id" params={{ id }}');
  }

  // Handle standard <Link to="/path"> with Tanstack format

  fs.writeFileSync(filePath, content);
}

fixLink('src/components/ClickableName.tsx');
fixLink('src/pages/AlmanacPage.tsx');
