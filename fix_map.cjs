const fs = require('fs');

const file = 'src/engine/saveload.ts';
let content = fs.readFileSync(file, 'utf8');

// The issue is that the object isn't actually a map being passed into mapToObject
// `map.keys()` is failing because `map` is undefined or not a map.
// If it's undefined, let's just return an empty object.
// If it's an object instead of a map, let's handle that too.

content = content.replace(/function mapToObject<T>\(map: Map<string, T>\): Record<string, T> \{/g, `function mapToObject<T>(map: Map<string, T> | Record<string, T> | undefined): Record<string, T> {
  if (!map) return {};
  if (!(map instanceof Map)) return { ...map };`);

fs.writeFileSync(file, content);
console.log('Fixed mapToObject in saveload.ts');
