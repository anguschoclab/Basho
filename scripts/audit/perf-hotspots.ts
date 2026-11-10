/**
 * perf-hotspots.ts
 * ================
 * Static finder for likely O(N×M) nested linear-search patterns:
 *
 *   - membership : `.includes(` / `.indexOf(` inside an iteration — the
 *                  classic "array used as a set" hotspot. HIGH severity.
 *   - scan       : `.find(` / `.findIndex(` / `.some(` / `.filter(` /
 *                  `.map(` nested inside another iteration — a full inner
 *                  pass per outer element. MEDIUM.
 *   - alloc      : `new Set(` / `new Map(` / `.concat(` inside an iteration
 *                  — repeated construction/copy. Usually hoistable. MEDIUM.
 *   - sort       : `.sort(` inside an iteration — repeated O(N log N) work.
 *                  MEDIUM.
 *   - clone      : `structuredClone(` / `JSON.parse(JSON.stringify(` inside
 *                  an iteration — deep copy per element. MEDIUM.
 *
 * An "iteration" is a `for`/`while`/`do` loop or a `.forEach/.map/.filter/
 * .reduce/.some/.find/.flatMap` callback, tracked by brace depth. This is a
 * *finder*, not a verdict — every hit needs cardinality/context triage
 * (enum-order lookups, capped collections, and intentionally-nested pairing
 * algorithms are often fine).
 *
 * Suppression: append `// perf-hotspots: ignore` to a line to skip it.
 *
 * Usage:
 *   bunx tsx scripts/audit/perf-hotspots.ts [--json out.json] [--gate]
 *                                          [--include src/engine]
 *   --gate     exit 1 when any HIGH-severity finding exists
 *   --include  restrict scan to a path prefix relative to src/ (repeatable)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..");
const SRC = join(ROOT, "src");

type Severity = "high" | "medium";
type Kind = "membership" | "scan" | "alloc" | "sort" | "clone";

interface Finding {
  file: string;
  line: number;
  severity: Severity;
  kind: Kind;
  code: string;
  outerContext: string;
}

// ─── Patterns ────────────────────────────────────────────────────────────

const SEARCH_RE = /\.(includes|indexOf|find|findIndex|some|filter|map)\s*\(/g;
const SEARCH_TEST_RE = /\.(includes|indexOf|find|findIndex|some|filter|map)\s*\(/;
const MEMBER_TEST_RE = /\.(includes|indexOf)\s*\(/;
const ALLOC_RE = /\bnew\s+(Set|Map)\s*\(|\.concat\s*\(/;
const SORT_RE = /\.sort\s*\(/;
const CLONE_RE = /\bstructuredClone\s*\(|JSON\.parse\s*\(\s*JSON\.stringify\s*\(/;
const IGNORE_RE = /perf-hotspots:\s*ignore/;

// Loop openers. `.find`/`.some`/`.filter`/`.map` appear both here and in
// SEARCH_RE — inside an outer iteration they are flagged as the inner scan;
// at top level they simply open a new iteration context.
const LOOP_RE =
  /\b(for|while|do)\b|\.(forEach|map|flatMap|filter|reduce|some|find|every)\s*\(/;

// ─── File walk ───────────────────────────────────────────────────────────

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (e === "node_modules" || e.startsWith(".")) continue;
      yield* walk(full);
    } else if (
      /\.tsx?$/.test(e) &&
      !e.endsWith(".test.ts") &&
      !e.endsWith(".test.tsx") &&
      !e.endsWith(".d.ts")
    ) {
      yield full;
    }
  }
}

// ─── Scan ────────────────────────────────────────────────────────────────

function braceDelta(line: string): number {
  let d = 0;
  for (const ch of line) {
    if (ch === "{") d++;
    else if (ch === "}") d--;
  }
  return d;
}

function classify(line: string): { kind: Kind; severity: Severity } | null {
  if (SEARCH_TEST_RE.test(line)) {
    return MEMBER_TEST_RE.test(line)
      ? { kind: "membership", severity: "high" }
      : { kind: "scan", severity: "medium" };
  }
  if (ALLOC_RE.test(line)) return { kind: "alloc", severity: "medium" };
  if (SORT_RE.test(line)) return { kind: "sort", severity: "medium" };
  if (CLONE_RE.test(line)) return { kind: "clone", severity: "medium" };
  return null;
}

function scanFile(path: string): Finding[] {
  const findings: Finding[] = [];
  const lines = readFileSync(path, "utf8").split("\n");

  // Iteration contexts currently open, tracked by the brace depth at which
  // each opened. depthStack[i] = brace depth on the line the loop began.
  const iterStack: { depth: number; context: string; oneShot: boolean }[] = [];
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const startDepth = depth;

    // An unbraced loop body (`for (...) stmt;`) keeps the iteration alive
    // for exactly one following line.
    for (const ctx of iterStack) {
      if (ctx.oneShot) ctx.depth = Number.POSITIVE_INFINITY;
    }

    // Drop iterations whose body has closed.
    while (iterStack.length > 0 && startDepth <= iterStack[iterStack.length - 1].depth) {
      iterStack.pop();
    }

    const inIteration = iterStack.length > 0;
    const outerContext = inIteration ? iterStack[iterStack.length - 1].context : "";
    const isComment =
      trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");

    if (trimmed && !isComment && !IGNORE_RE.test(line) && (inIteration || LOOP_RE.test(line))) {
      const hit = classify(line);
      if (hit) {
        // A search call on the same line that OPENS the iteration (e.g.
        // `arr.find(x => ...)`) is not nested — it IS the outer pass.
        // Flag only when an enclosing iteration exists, or the line opens
        // an iteration *before* the search call position-wise.
        let nested = inIteration;
        if (!nested && LOOP_RE.test(line)) {
          const loopAt = line.search(LOOP_RE);
          SEARCH_RE.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = SEARCH_RE.exec(line))) {
            if (m.index > loopAt) {
              nested = true;
              break;
            }
          }
        }
        if (nested) {
          findings.push({
            file: relative(ROOT, path),
            line: i + 1,
            severity: hit.severity,
            kind: hit.kind,
            code: trimmed.slice(0, 140),
            outerContext: outerContext || "same-line iteration",
          });
        }
      }
    }

    // Track iteration opens. oneShot = no `{` opened on this line → body is
    // a single statement (or the arrow body is an expression).
    if (LOOP_RE.test(line)) {
      const delta = braceDelta(line);
      iterStack.push({
        depth: startDepth,
        context: trimmed.slice(0, 80),
        oneShot: delta <= 0,
      });
    }

    depth += braceDelta(line);
  }

  return findings;
}

// ─── CLI ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : undefined;
const gate = args.includes("--gate");
const includes: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--include" && args[i + 1]) includes.push(args[i + 1]);
}

const findings: Finding[] = [];
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  if (includes.length > 0 && !includes.some((p) => rel.startsWith(p))) continue;
  findings.push(...scanFile(file));
}

findings.sort((a, b) =>
  a.severity === b.severity
    ? a.file.localeCompare(b.file) || a.line - b.line
    : a.severity === "high"
      ? -1
      : 1
);

const high = findings.filter((f) => f.severity === "high");
const med = findings.filter((f) => f.severity === "medium");

console.log(`perf-hotspots: ${findings.length} candidate(s) (${high.length} high, ${med.length} medium)\n`);
for (const f of findings) {
  console.log(`${f.severity.padEnd(6)} ${f.file}:${f.line} [${f.kind}]`);
  console.log(`        in: ${f.outerContext}`);
  console.log(`        ${f.code}`);
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ generated: new Date().toISOString(), findings }, null, 2));
  console.log(`\nwrote ${jsonOut}`);
}

if (gate && high.length > 0) {
  console.error(`\n--gate: ${high.length} high-severity finding(s)`);
  process.exit(1);
}
