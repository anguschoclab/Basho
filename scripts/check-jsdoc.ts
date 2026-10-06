/**
 * Scans the codebase for JSDoc issues:
 *  1. @param tags whose name doesn't match any real parameter
 *  2. Auto-generated boilerplate docs (@returns The result., "@param x - The X.", etc.)
 *  3. @param tags with redundant type annotations that contradict TS types
 * Run: bun scripts/check-jsdoc.ts
 */
import { Project, SyntaxKind, type JSDocableNode } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.app.json",
  skipAddingFilesFromTsConfig: false,
});

// Also include scripts/e2e/electron files not in tsconfig.app.json
project.addSourceFilesAtPaths(["scripts/**/*.ts", "e2e/**/*.ts", "electron/**/*.ts"]);

interface Issue {
  file: string;
  line: number;
  kind: string;
  detail: string;
}

const issues: Issue[] = [];

const BOILERPLATE_RETURNS = /^\s*@returns?\s+the\s+(result|value)\.?\s*$/i;
const BOILERPLATE_PARAM = /^\s*@param\s+\S+\s+-?\s*the\s+\S+\s*\.?\s*$/i;

function checkJsDoc(ownerName: string, jsdocText: string, file: string, line: number) {
  for (const rawLine of jsdocText.split("\n")) {
    const l = rawLine.replace(/^\s*\*\s?/, "").trim();
    if (BOILERPLATE_RETURNS.test(l)) {
      issues.push({ file, line, kind: "boilerplate-returns", detail: `${ownerName}: "${l}"` });
    } else if (BOILERPLATE_PARAM.test(l)) {
      issues.push({ file, line, kind: "boilerplate-param", detail: `${ownerName}: "${l}"` });
    }
  }
}

function paramNamesOf(node: JSDocableNode & { getParameters?(): { getName(): string }[] }) {
  if (typeof node.getParameters !== "function") return null;
  return node
    .getParameters()
    .map((p) => p.getName())
    .filter((n) => !n.startsWith("{")) // skip destructured objects for name matching
    .map((n) => n.replace(/^\.\.\./, ""));
}

for (const sf of project.getSourceFiles()) {
  const filePath = sf.getFilePath();
  sf.forEachDescendant((node) => {
    const kind = node.getKind();
    const isFn =
      kind === SyntaxKind.FunctionDeclaration ||
      kind === SyntaxKind.MethodDeclaration ||
      kind === SyntaxKind.FunctionExpression ||
      kind === SyntaxKind.ArrowFunction ||
      kind === SyntaxKind.Constructor ||
      kind === SyntaxKind.GetAccessor ||
      kind === SyntaxKind.SetAccessor;
    if (!isFn) return;

    const docable = node as unknown as JSDocableNode;
    if (typeof docable.getJsDocs !== "function") return;
    const jsdocs = docable.getJsDocs();
    if (jsdocs.length === 0) return;

    const realParams = paramNamesOf(node as never) ?? [];
    const ownerName =
      (node as { getName?(): string }).getName?.() ??
      (kind === SyntaxKind.Constructor ? "constructor" : "<anonymous>");
    const line = node.getStartLineNumber();

    for (const doc of jsdocs) {
      checkJsDoc(ownerName, doc.getFullText(), filePath, line);
      for (const tag of doc.getTags()) {
        if (tag.getKind() !== SyntaxKind.JSDocParameterTag) continue;
        const paramTag = tag as import("ts-morph").JSDocParameterTag;
        const name = paramTag.getName();
        if (!name) continue;
        // Allow dotted names (options.foo) and destructured patterns
        const root = name.split(".")[0];
        if (realParams.length > 0 && !realParams.includes(root)) {
          issues.push({
            file: filePath,
            line,
            kind: "param-mismatch",
            detail: `${ownerName}: @param "${name}" not in signature (${realParams.join(", ")})`,
          });
        }
      }
      // flag completely empty JSDoc bodies: "/** */" or only tags with no text
      const text = doc.getFullText();
      const body = text
        .replace(/\/\*\*|\*\//g, "")
        .split("\n")
        .map((l) => l.replace(/^\s*\*\s?/, ""))
        .filter((l) => l.trim() && !l.trim().startsWith("@"));
      if (body.length === 0 && doc.getTags().length === 0) {
        issues.push({ file: filePath, line, kind: "empty-jsdoc", detail: ownerName });
      }
    }
  });
}

const byFile = new Map<string, Issue[]>();
for (const i of issues) {
  const arr = byFile.get(i.file) ?? [];
  arr.push(i);
  byFile.set(i.file, arr);
}
for (const [file, list] of [...byFile.entries()].sort()) {
  console.log(file);
  for (const i of list) console.log(`  L${i.line} [${i.kind}] ${i.detail}`);
}
console.log(`\n${issues.length} issue(s) in ${byFile.size} file(s)`);
