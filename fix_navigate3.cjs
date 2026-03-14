const fs = require('fs');
const glob = require('glob');

function fixNavigate(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/navigate\(\{ to: "\/rikishi\/\$\{r\.id\}" \}\)/g, 'navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: r.id } })');
  content = content.replace(/navigate\(\{ to: "\/rikishi\/\$\{rikishi\.id\}" \}\)/g, 'navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: rikishi.id } })');
  content = content.replace(/navigate\(\{ to: "\/stable\/\$\{snap\.heyaId\}" \}\)/g, 'navigate({ to: "/stable/$id", params: { id: snap.heyaId } })');
  content = content.replace(/navigate\(\{ to: "\/rikishi\/\$\{match\.east\.id\}" \}\)/g, 'navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: match.east.id } })');
  content = content.replace(/navigate\(\{ to: "\/rikishi\/\$\{match\.west\.id\}" \}\)/g, 'navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: match.west.id } })');
  content = content.replace(/navigate\(\{ to: "\/rikishi\/\$\{entry\.id\}" \}\)/g, 'navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: entry.id } })');

  // also handle the variable back navigation logic
  content = content.replace(/navigate\(\{ to: -1 \}\)/g, "navigate({ to: '..' })");

  // fix alerts
  content = content.replace(/navigate\(\{ to: alert\.link \}\)/g, "navigate({ to: alert.link as any })");

  // fix any dynamically routed tabs
  content = content.replace(/navigate\(\{ to: route \}\)/g, "navigate({ to: route as any })");
  content = content.replace(/navigate\(\{ to: url \}\)/g, "navigate({ to: url as any })");
  content = content.replace(/navigate\(\{ to: tab\.href \}\)/g, "navigate({ to: tab.href as any })");
  content = content.replace(/navigate\(\{ to: item\.url \}\)/g, "navigate({ to: item.url as any })");
  content = content.replace(/navigate\(\{ to: QUICK_NAV\[e\.key\] \}\)/g, "navigate({ to: QUICK_NAV[e.key] as any })");

  fs.writeFileSync(filePath, content);
}

glob.sync('src/**/*.tsx').forEach(fixNavigate);
glob.sync('src/**/*.ts').forEach(fixNavigate);
