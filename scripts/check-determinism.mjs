import fs from "fs";
import path from "path";

const ENGINE_DIR = path.resolve("src/engine");
const DISALLOWED = [
  { name: "Math.random", pattern: /\bMath\.random\s*\(/g },
  { name: "seedrandom import/call", pattern: /\bseedrandom\b/g },
  { name: "new SeededRNG constructor", pattern: /\bnew\s+SeededRNG\s*\(/g },
];

function stripComments(code) {
  // Remove block comments and line comments, naive but effective for grep enforcement.
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(p));
    else if (e.isFile() && p.endsWith(".ts")) files.push(p);
  }
  return files;
}

const files = walk(ENGINE_DIR);
let failed = false;

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const code = stripComments(raw);

  for (const rule of DISALLOWED) {
    if (rule.name === "seedrandom import/call") {
      // Allow seedrandom only in the canonical wrapper (outside engine) - engine must not use it.
      if (rule.pattern.test(code)) {
        console.error(`[determinism] ${rule.name} found in ${file}`);
        failed = true;
      }
    } else {
      if (rule.pattern.test(code)) {
        console.error(`[determinism] ${rule.name} found in ${file}`);
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error("\nDeterminism check failed. Use SeededRNG instead of Math.random/seedrandom in engine code.");
  process.exit(1);
} else {
  console.log("Determinism check passed: no Math.random or seedrandom usage in src/engine.");
}
