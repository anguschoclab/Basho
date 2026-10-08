/**
 * find-dead-test-subjects.ts — flags test files whose subjects may no longer exist.
 *
 * Two kinds of subject references in every *.test.ts(x) under src/tests:
 *   1. Real import specifiers (template-literal contents stripped first, so
 *      fixture code embedded in writeFileSync templates isn't misread) —
 *      relative and "@/" imports are resolved with extension probing.
 *   2. join(BASE, "part", ...) chains where BASE resolves to a repo-anchored
 *      const, plus readSrcFile("x") / readRepoFile("x") / existsSync(join(...)).
 *      Const bindings like `const AUDIT_DIR = join(ROOT, ".windsurf", "audit")`
 *      are resolved iteratively so multi-arg joins check the full path.
 *
 * Output: docs/audit/test-audit-findings.md. This is a *finder*, not a deleter —
 * every flagged entry needs human review (a missing literal can be an
 * intentional regression pin asserting a file was deleted, e.g. menu-core.tsx).
 *
 * Usage: bunx tsx scripts/find-dead-test-subjects.ts [--out path]
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const TESTS_DIR = join(SRC, "tests");
const DEFAULT_OUT = join(ROOT, "docs/audit/test-audit-findings.md");
const RESOLVABLE = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mts", ".cts"];
const KNOWN_BASES: Record<string, string> = {
  ROOT,
  SRC,
  SRC_DIR: SRC,
  SRC_ROOT: SRC,
  REPO_ROOT: ROOT,
  PROJECT_ROOT: ROOT,
};

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (/\.test\.tsx?$/.test(e)) yield full;
  }
}

/** Remove template-literal contents (keeps line structure) so embedded fixture
 *  code (writeFileSync(`import ...`)) is not mistaken for real imports. */
function stripTemplates(src: string): string {
  return src.replace(/`(?:[^`\\]|\\.)*`/gs, (m) => m.replace(/[^\n]/g, " "));
}

function resolveImport(spec: string, fromFile: string): boolean {
  const base = spec.startsWith("@/")
    ? join(SRC, spec.slice(2))
    : resolve(dirname(fromFile), spec);
  if (existsSync(base) && statSync(base).isFile()) return true;
  for (const ext of RESOLVABLE) if (existsSync(base + ext)) return true;
  for (const ext of RESOLVABLE) if (existsSync(join(base, `index${ext}`))) return true;
  return false;
}

interface Finding {
  file: string;
  kind: "import" | "fs-path";
  subject: string;
  detail: string;
}

function scanFile(file: string): Finding[] {
  const findings: Finding[] = [];
  const text = readFileSync(file, "utf8");
  const stripped = stripTemplates(text);
  const rel = relative(ROOT, file);

  // ── imports ──────────────────────────────────────────────────────────────
  // Skip lines whose trimmed content starts with a quote — those are fixture
  // code inside string literals (e.g. engineReviewerSelfTest's sample arrays).
  const codeLines = stripped
    .split("\n")
    .filter((l) => !/^\s*["']/.test(l))
    .join("\n");
  for (const m of codeLines.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const spec = m[1];
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
    if (!resolveImport(spec, file)) {
      findings.push({ file: rel, kind: "import", subject: spec, detail: "unresolvable import" });
    }
  }

  // ── const bindings: const X = join(BASE-or-known, "a", "b") ──────────────
  const bases = new Map<string, string>(Object.entries(KNOWN_BASES));
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of stripped.matchAll(/const (\w+)\s*=\s*join\(([^)]*)\)/g)) {
      const name = m[1];
      if (bases.has(name)) continue;
      const resolved = resolveJoinArgs(m[2], bases);
      if (resolved) {
        bases.set(name, resolved);
        changed = true;
      }
    }
  }

  // ── join(BASE, "lit", ...) calls — check the full resolved path ──────────
  for (const m of stripped.matchAll(/join\(([^)]*)\)/g)) {
    const resolved = resolveJoinArgs(m[1], bases);
    if (!resolved) continue; // unknown base — can't judge
    if (!existsSync(resolved)) {
      findings.push({
        file: rel,
        kind: "fs-path",
        subject: relative(ROOT, resolved),
        detail: `join(...) resolves to missing path`,
      });
    }
  }

  // ── readSrcFile("lit") / readRepoFile("lit") ─────────────────────────────
  for (const m of stripped.matchAll(/readSrcFile\(\s*["']([^"']+)["']/g)) {
    if (!existsSync(join(SRC, m[1]))) {
      findings.push({ file: rel, kind: "fs-path", subject: `src/${m[1]}`, detail: "readSrcFile target missing" });
    }
  }
  for (const m of stripped.matchAll(/readRepoFile\(\s*["']([^"']+)["']/g)) {
    if (!existsSync(join(ROOT, m[1]))) {
      findings.push({ file: rel, kind: "fs-path", subject: m[1], detail: "readRepoFile target missing" });
    }
  }

  // Dedupe identical findings (same subject flagged at multiple callsites).
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.kind}:${f.subject}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Resolve join("a", BASE, "b", ...) if every arg is a string literal or a
 *  known base identifier. Returns absolute path or null. */
function resolveJoinArgs(argsSrc: string, bases: Map<string, string>): string | null {
  const args: string[] = [];
  for (const a of argsSrc.split(",")) {
    const t = a.trim();
    const lit = t.match(/^["']([^"']*)["']$/);
    if (lit) {
      args.push(lit[1]);
    } else if (bases.has(t)) {
      args.push(bases.get(t) as string);
    } else if (t === "__dirname" || t === "import.meta.dirname") {
      return null; // file-relative — skip rather than guess
    } else {
      return null; // expression arg — can't resolve statically
    }
  }
  if (args.length === 0) return null;
  // First arg must be an absolute base (or a literal containing a path sep
  // that turns out absolute); otherwise this join isn't repo-anchored.
  return args[0].startsWith("/") ? join(...args) : null;
}

function main() {
  const outArg = process.argv.indexOf("--out");
  const out = outArg >= 0 ? process.argv[outArg + 1] : DEFAULT_OUT;

  const findings: Finding[] = [];
  let count = 0;
  for (const f of walk(TESTS_DIR)) {
    count++;
    findings.push(...scanFile(f));
  }

  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byFile.get(f.file) ?? [];
    list.push(f);
    byFile.set(f.file, list);
  }

  const lines: string[] = [
    "# Test Audit Findings — Dead Subject Scan",
    "",
    `Generated: ${new Date().toISOString()} by \`scripts/find-dead-test-subjects.ts\``,
    "",
    `Scanned ${count} test files; ${byFile.size} files flagged.`,
    "",
    "**Review required before deleting anything** — a missing path can be an",
    "intentional regression pin asserting a file was deleted (e.g. menu-core.tsx),",
    "not a stale subject.",
    "",
    "| File | Kind | Missing subject | Detail |",
    "|------|------|-----------------|--------|",
  ];
  for (const [file, list] of [...byFile.entries()].sort()) {
    for (const f of list) {
      lines.push(`| \`${file}\` | ${f.kind} | \`${f.subject}\` | ${f.detail} |`);
    }
  }
  lines.push("");
  writeFileSync(out, lines.join("\n"));
  console.log(`scanned ${count} files; flagged ${byFile.size}; wrote ${relative(ROOT, out)}`);
  for (const [file, list] of [...byFile.entries()].sort()) {
    for (const f of list) console.log(`  ${f.kind.padEnd(8)} ${file} → ${f.subject}`);
  }
}

main();
