const fs = require('fs');

const file = 'src/engine/saveload.ts';
let content = fs.readFileSync(file, 'utf8');

// I saw the stack trace earlier showed mapToObject crashing on map.keys()
// Need to make sure `keys` can be extracted even if it's a plain object
content = content.replace(/function mapToObject<T>\(map: Map<string, T> \| Record<string, T> \| undefined\): Record<string, T> \{[\s\S]*?const keys = Array\.from\(map\.keys\(\)\)\.sort\(\);/g, `function mapToObject<T>(map: Map<string, T> | Record<string, T> | undefined): Record<string, T> {
  if (!map) return {};
  const obj: Record<string, T> = {};

  if (map instanceof Map) {
    const keys = Array.from(map.keys()).sort();
    for (const k of keys) {
      obj[k] = map.get(k) as T;
    }
    return obj;
  } else {
    // it's a plain object
    const keys = Object.keys(map).sort();
    for (const k of keys) {
      obj[k] = (map as Record<string, T>)[k];
    }
    return obj;
  }`);

// Make sure the syntax is correct.
content = content.replace(/\} else \{\n    \/\/ it's a plain object\n    const keys = Object\.keys\(map\)\.sort\(\);\n    for \(const k of keys\) \{\n      obj\[k\] = \(map as Record<string, T>\)\[k\];\n    \}\n    return obj;\n  \}\n  for \(const k of keys\) \{\n    obj\[k\] = map\.get\(k\)!;\n  \}\n  return obj;\n\}/g, `} else {
    const keys = Object.keys(map).sort();
    for (const k of keys) {
      obj[k] = (map as Record<string, T>)[k];
    }
    return obj;
  }
}`);

fs.writeFileSync(file, content);
console.log('Fixed mapToObject second attempt');
