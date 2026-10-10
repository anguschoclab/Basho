/**
 * duplicateExports.ts — scan production sources for exported-name collisions.
 *
 * An exported name counts as a "definition" when the file introduces the
 * binding: `export const/fn/class/interface/type/enum Name`, `export default
 * named`, `export * as ns`, or `export { Name }` where Name is declared
 * locally in that file. Re-exports (`export { X } from`, or `export { X }`
 * where X was imported) are recorded separately so barrel/facade modules do
 * not produce false collisions.
 */
import { readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import ts from "typescript";

export interface ExportSite {
  /** path relative to repo root */
  file: string;
  name: string;
  /** value | type | reexport — reexports never count as definitions */
  kind: "value" | "type" | "reexport";
}

const VALUE_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
]);

const SKIP_DIRS = new Set(["node_modules", "tests", "__tests__"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(e)) walk(p, out);
    } else if (
      st.isFile() &&
      [".ts", ".tsx"].includes(extname(p)) &&
      !e.endsWith(".test.ts") &&
      !e.endsWith(".test.tsx") &&
      !e.endsWith(".d.ts")
    ) {
      out.push(p);
    }
  }
  return out;
}

function isExported(node: ts.Node): boolean {
  const mods = ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : [];
  return mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** Collect names of bindings declared locally at top level (for export-list disambiguation). */
function localTopLevelNames(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) names.add(d.name.text);
      }
    } else if (
      ts.isFunctionDeclaration(stmt) ||
      ts.isClassDeclaration(stmt) ||
      ts.isInterfaceDeclaration(stmt) ||
      ts.isTypeAliasDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt) ||
      ts.isModuleDeclaration(stmt)
    ) {
      if (stmt.name && ts.isIdentifier(stmt.name)) names.add(stmt.name.text);
    }
  }
  return names;
}

function importedNames(sf: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    const c = stmt.importClause;
    if (!c) continue;
    if (c.name) names.add(c.name.text);
    const b = c.namedBindings;
    if (b && ts.isNamedImports(b)) {
      for (const el of b.elements) names.add(el.name.text);
    } else if (b && ts.isNamespaceImport(b)) {
      names.add(b.name.text);
    }
  }
  return names;
}

function scanFile(root: string, file: string): ExportSite[] {
  const rel = relative(root, file);
  const sf = ts.createSourceFile(file, ts.sys.readFile(file) ?? "", ts.ScriptTarget.Latest, true);
  const out: ExportSite[] = [];
  const locals = localTopLevelNames(sf);
  const imports = importedNames(sf);

  const push = (name: string, kind: ExportSite["kind"]) => out.push({ file: rel, name, kind });

  for (const stmt of sf.statements) {
    // export { a, b as c } [from '...']
    if (ts.isExportDeclaration(stmt)) {
      if (stmt.isTypeOnly && stmt.moduleSpecifier) continue; // type re-export
      if (stmt.moduleSpecifier) {
        // `export * as ns from` → ns is a value re-export binding; `export {X} from` → re-export
        if (stmt.exportClause && ts.isNamespaceExport(stmt.exportClause)) {
          push(stmt.exportClause.name.text, "reexport");
        } else if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
          for (const el of stmt.exportClause.elements) push(el.name.text, "reexport");
        }
        continue;
      }
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          const local = el.propertyName?.text ?? el.name.text;
          if (imports.has(local)) push(el.name.text, "reexport");
          else if (locals.has(local)) {
            // local binding exported via list — classify by declaration kind
            push(el.name.text, classifyLocal(sf, local));
          }
        }
      }
      continue;
    }

    if (!isExported(stmt)) continue;

    // export default …
    const mods = ts.canHaveModifiers(stmt) ? (ts.getModifiers(stmt) ?? []) : [];
    const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if (isDefault) {
      if ("name" in stmt && stmt.name && ts.isIdentifier(stmt.name as ts.Node)) {
        push((stmt.name as ts.Identifier).text, stmtIsType(stmt) ? "type" : "value");
      }
      continue; // anonymous defaults / expression defaults are not name collisions
    }

    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) push(d.name.text, "value");
      }
    } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      if (stmt.name) push(stmt.name.text, "type");
    } else if (
      ts.isFunctionDeclaration(stmt) ||
      ts.isClassDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt) ||
      ts.isModuleDeclaration(stmt)
    ) {
      if (stmt.name) {
        push(stmt.name.text, VALUE_KINDS.has(stmt.kind) ? "value" : "type");
      }
    }
  }
  return out;
}

/** Classify a local top-level binding as value or type. */
function classifyLocal(sf: ts.SourceFile, name: string): "value" | "type" {
  for (const stmt of sf.statements) {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      if (stmt.name.text === name) return "type";
    }
  }
  return "value";
}

function stmtIsType(stmt: ts.Node): boolean {
  return ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt);
}

export interface Collision {
  name: string;
  /** files that define the name */
  definitions: ExportSite[];
  hasValueDef: boolean;
}

export function scanDuplicateExports(root: string = process.cwd()): {
  collisions: Collision[];
  allExports: ExportSite[];
} {
  const srcDir = join(root, "src");
  const allExports: ExportSite[] = [];
  for (const file of walk(srcDir)) allExports.push(...scanFile(root, file));

  const defs = new Map<string, ExportSite[]>();
  for (const site of allExports) {
    if (site.kind === "reexport") continue;
    const list = defs.get(site.name) ?? [];
    list.push(site);
    defs.set(site.name, list);
  }

  const collisions: Collision[] = [];
  for (const [name, list] of defs) {
    const files = new Set(list.map((s) => s.file));
    if (files.size <= 1) continue;
    collisions.push({
      name,
      definitions: list,
      hasValueDef: list.some((s) => s.kind === "value"),
    });
  }
  collisions.sort((a, b) => a.name.localeCompare(b.name));
  return { collisions, allExports };
}

/** Const uniqueness within a subtree (e.g. constants/engine): same const name in 2+ files. */
export function scanConstDuplicates(root: string, subtree: string): Map<string, string[]> {
  const dir = join(root, subtree);
  const decls = new Map<string, string[]>();
  for (const file of walk(dir)) {
    const sf = ts.createSourceFile(file, ts.sys.readFile(file) ?? "", ts.ScriptTarget.Latest, true);
    for (const stmt of sf.statements) {
      if (!ts.isVariableStatement(stmt) || !isExported(stmt)) continue;
      for (const d of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        const rel = relative(root, file);
        const list = decls.get(d.name.text) ?? [];
        if (!list.includes(rel)) list.push(rel);
        decls.set(d.name.text, list);
      }
    }
  }
  const dupes = new Map<string, string[]>();
  for (const [name, files] of decls) if (files.length > 1) dupes.set(name, files);
  return dupes;
}
