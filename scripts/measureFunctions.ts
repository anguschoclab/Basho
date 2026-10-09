/**
 * measureFunctions.ts
 * ===================
 * AST-grade function/object size inventory for the refactor campaign.
 *
 * Uses the TypeScript compiler API (no regex heuristics) to classify every
 * function-like declaration and every large const object/array literal in
 * production source, then emits a CSV sorted by LOC descending.
 *
 * Usage: bun scripts/measureFunctions.ts [--threshold N] [--out path] [--json path]
 *
 * Kinds reported:
 *   function  - FunctionDeclaration
 *   arrow     - ArrowFunction bound to a variable/property
 *   fn-expr   - named or anonymous FunctionExpression
 *   method    - class/object MethodDeclaration (incl. ctor/get/set)
 *   const-obj - VariableDeclaration initialized to {...}
 *   const-arr - VariableDeclaration initialized to [...]
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, "..", "..");
const SRC = join(ROOT, "src");
const DEFAULT_OUT = join(ROOT, "docs", "audit", "function-lengths.csv");

export interface Measurement {
  file: string;
  symbol: string;
  kind: string;
  startLine: number;
  endLine: number;
  loc: number;
  exported: boolean;
}

// ─── File walk ───────────────────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e === "node_modules" || e === "tests") continue;
      walk(p, out);
    } else if (st.isFile()) {
      const ext = extname(p);
      if ((ext === ".ts" || ext === ".tsx") && !e.endsWith(".test.ts") && !e.endsWith(".test.tsx")) {
        out.push(p);
      }
    }
  }
  return out;
}

// ─── Naming ──────────────────────────────────────────────────────────────────

function nodeName(node: ts.Node, sf: ts.SourceFile): string {
  // VariableDeclaration parent → variable name
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) {
    return parent.name.getText(sf);
  }
  if (ts.isBinaryExpression(parent)) {
    return parent.left.getText(sf);
  }
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return `anonymous@${line + 1}`;
}

function hasExportModifier(node: ts.Node): boolean {
  // climbs to the declaration that might carry `export`
  let n: ts.Node | undefined = node;
  while (n) {
    if (
      ts.isFunctionDeclaration(n) ||
      ts.isVariableStatement(n) ||
      ts.isClassDeclaration(n) ||
      ts.isMethodDeclaration(n)
    ) {
      return !!ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    }
    n = n.parent;
    if (ts.isSourceFile(n) || ts.isBlock(n) || ts.isModuleBlock(n)) break;
  }
  return false;
}

// ─── Measurement ─────────────────────────────────────────────────────────────

function measure(file: string, threshold: number): Measurement[] {
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const rel = relative(ROOT, file);
  const results: Measurement[] = [];

  const locOf = (node: ts.Node): { start: number; end: number; loc: number } => {
    const start = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    const end = sf.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    return { start, end, loc: end - start + 1 };
  };

  const push = (node: ts.Node, kind: string, name: string) => {
    const { start, end, loc } = locOf(node);
    if (loc < threshold) return;
    results.push({
      file: rel,
      symbol: name,
      kind,
      startLine: start,
      endLine: end,
      loc,
      exported: hasExportModifier(node),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node)) {
      if (node.body) {
        const name = node.name?.text ?? `anonymous@${locOf(node).start}`;
        push(node, "function", name);
      }
    } else if (ts.isArrowFunction(node)) {
      push(node, "arrow", nodeName(node, sf));
    } else if (ts.isFunctionExpression(node)) {
      push(node, "fn-expr", node.name?.text ?? nodeName(node, sf));
    } else if (
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isConstructorDeclaration(node)
    ) {
      if (node.body) {
        const cls = ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent)
          ? (node.parent.name?.text ?? "<class>")
          : "";
        const raw =
          ts.isConstructorDeclaration(node) ? "constructor" : node.name.getText(sf);
        push(node, "method", cls ? `${cls}.${raw}` : raw);
      }
    } else if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isObjectLiteralExpression(node.initializer)) {
        push(node.initializer, "const-obj", node.name.getText(sf));
      } else if (ts.isArrayLiteralExpression(node.initializer)) {
        push(node.initializer, "const-arr", node.name.getText(sf));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return results;
}

// ─── Public API (importable by tests) ────────────────────────────────────────

export function scanFunctions(threshold = 40): Measurement[] {
  const files = walk(SRC);
  const all: Measurement[] = [];
  for (const f of files) all.push(...measure(f, threshold));
  all.sort((a, b) => b.loc - a.loc);
  return all;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function dirname_safe(p: string): string {
  const idx = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return idx > 0 ? p.slice(0, idx) : ".";
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const THRESHOLD = Number(opt("--threshold") ?? "40");
  const OUT = opt("--out") ?? DEFAULT_OUT;
  const JSON_OUT = opt("--json");

  const all = scanFunctions(THRESHOLD);
  const escapeCsv = (s: string) => (s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s);
  const csv = [
    "file,symbol,kind,startLine,endLine,loc,exported",
    ...all.map(
      (m) =>
        `${m.file},${escapeCsv(m.symbol)},${m.kind},${m.startLine},${m.endLine},${m.loc},${m.exported}`,
    ),
  ].join("\n");

  mkdirSync(dirname_safe(OUT), { recursive: true });
  writeFileSync(OUT, csv + "\n");

  if (JSON_OUT) {
    mkdirSync(dirname_safe(JSON_OUT), { recursive: true });
    writeFileSync(JSON_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), threshold: THRESHOLD, entries: all }, null, 2));
  }

  const byKind = new Map<string, number>();
  for (const m of all) byKind.set(m.kind, (byKind.get(m.kind) ?? 0) + 1);
  const over = (n: number) => all.filter((m) => m.loc >= n);
  console.log(`measured entries -> ${all.length} >= ${THRESHOLD} LOC`);
  for (const [k, n] of [...byKind].sort()) console.log(`  ${k}: ${n}`);
  console.log(`entries >=150 LOC: ${over(150).length}`);
  console.log(`  functions/arrows/methods >=150: ${over(150).filter((m) => m.kind !== "const-obj" && m.kind !== "const-arr").length}`);
  console.log(`  const-obj/const-arr >=150: ${over(150).filter((m) => m.kind === "const-obj" || m.kind === "const-arr").length}`);
  console.log(`wrote ${relative(ROOT, OUT)}`);
}
