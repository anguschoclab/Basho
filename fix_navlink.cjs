const fs = require('fs');

function fixNavLink(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import\s*\{\s*([^}]*?)NavLink([^}]*?)\s*\}\s*from\s*"@tanstack\/react-router"/g, 'import {$1Link$2} from "@tanstack/react-router"');
  content = content.replace(/<NavLink/g, '<Link');
  content = content.replace(/<\/NavLink/g, '</Link');

  // also handle "activeClassName" which Tanstack Router calls "activeProps={{ className: '...' }}"
  // We can just strip it out or use the Link active class handling, but wait, Tanstack link uses activeProps
  content = content.replace(/activeClassName="([^"]+)"/g, 'activeProps={{ className: "$1" }}');

  fs.writeFileSync(filePath, content);
}

fixNavLink('src/components/layout/AppSidebar.tsx');
fixNavLink('src/components/layout/TopNavBar.tsx');
fixNavLink('src/pages/RecapPage.tsx');
