/* eslint-disable @typescript-eslint/no-non-null-assertion -- temp reorg codemod */
/**
 * expand-barrels.ts — rewire importers of a compat barrel to the true
 * source module of each imported symbol, using ts-morph's resolved
 * export declarations (handles `export *` chains).
 *
 * Usage: bun scripts/reorg/expand-barrels.ts <barrelPath> [more...] [--dry-run]
 *   e.g. bun scripts/reorg/expand-barrels.ts src/engine/lifecycle.ts src/engine/shikona.ts
 *
 * For `import {A, type B} from "@/engine/lifecycle"` emits per-target-module
 * imports: `import {A} from "@/engine/lifecycle/retirementCheck"; import type {B} from "..."`.
 * Named imports only — default/namespace imports are reported for manual fix.
 */
import { Project } from "ts-morph";
import { join, dirname, posix } from "path";
import { BARREL_REDIRECTS } from "./moves";

const ROOT = join(import.meta.dirname, "..", "..").replaceAll("\\", "/");
const dryRun = process.argv.includes("--dry-run");
const barrels = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const ALIASES: [string, string][] = [
  ["@tests/", "tests/"],
  ["@/", "src/"],
];

function emitAlias(targetRepoRel: string): string {
  for (const [alias, dir] of ALIASES) {
    if (targetRepoRel.startsWith(dir))
      return alias + targetRepoRel.slice(dir.length).replace(/\.(d\.ts|tsx?)$/, "");
  }
  return targetRepoRel;
}

const project = new Project({ skipFileDependencyResolution: true });
project.addSourceFilesAtPaths([
  join(ROOT, "src/**/*.{ts,tsx}"),
  join(ROOT, "tests/**/*.{ts,tsx}"),
  join(ROOT, "e2e/**/*.ts"),
  join(ROOT, "scripts/**/*.ts"),
  join(ROOT, "electron/**/*.ts"),
]);

const manualFix: string[] = [];
let filesChanged = 0;
let importsRewritten = 0;

for (const barrel of barrels) {
  const barrelAbs = join(ROOT, barrel).replaceAll("\\", "/");
  const barrelSf = project.getSourceFile(barrelAbs);
  if (!barrelSf) {
    console.error(`barrel not found: ${barrel}`);
    continue;
  }
  // name -> true source module (repo-rel) via resolved export declarations
  const exportOrigin = new Map<string, string>();
  for (const [name, decls] of barrelSf.getExportedDeclarations()) {
    const srcFile = decls[0]?.getSourceFile().getFilePath().replaceAll("\\", "/");
    if (srcFile) exportOrigin.set(name, srcFile.replace(ROOT + "/", ""));
  }
  const barrelModule = barrel.replace(/\.(d\.ts|tsx?)$/, "");

  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath() === barrelSf.getFilePath()) continue;
    for (const imp of sf.getImportDeclarations()) {
      const spec = imp.getModuleSpecifierValue();
      // Does this specifier point at the barrel? Resolve alias or relative.
      let resolved: string | null = null;
      for (const [alias, dir] of ALIASES) {
        if (spec.startsWith(alias)) resolved = dir + spec.slice(alias.length);
      }
      if (resolved === null && spec.startsWith(".")) {
        resolved = posix.normalize(
          join(dirname(sf.getFilePath().replaceAll("\\", "/").replace(ROOT + "/", "")), spec).replaceAll("\\", "/")
        );
      }
      if (resolved !== barrelModule && resolved !== barrel) continue;

      const defaultImp = imp.getDefaultImport();
      const nsImp = imp.getNamespaceImport();
      if (defaultImp || nsImp) {
        manualFix.push(`${sf.getFilePath().replace(ROOT + "/", "")}: ${defaultImp ? "default " + defaultImp.getText() : "namespace " + nsImp!.getText()} from "${spec}"`);
        continue;
      }

      // Group named imports by true origin module.
      const groups = new Map<string, { names: string[]; typeNames: string[] }>();
      let unmapped = 0;
      for (const ni of imp.getNamedImports()) {
        const exported = ni.getNameNode().getText();
        const local = ni.getAliasNode()?.getText() ?? exported;
        const text = exported === local ? exported : `${exported} as ${local}`;
        let origin = exportOrigin.get(exported);
        if (origin && BARREL_REDIRECTS[origin]) origin = BARREL_REDIRECTS[origin];
        if (!origin) {
          unmapped++;
          manualFix.push(`${sf.getFilePath().replace(ROOT + "/", "")}: symbol "${exported}" not found in ${barrel} exports`);
          continue;
        }
        const g = groups.get(origin) ?? { names: [], typeNames: [] };
        (ni.isTypeOnly() || imp.isTypeOnly() ? g.typeNames : g.names).push(text);
        groups.set(origin, g);
      }
      if (unmapped) continue;

      if (!dryRun) {
        let at = imp.getChildIndex();
        imp.remove();
        for (const [origin, g] of groups) {
          if (g.names.length)
            sf.insertImportDeclaration(at++, {
              moduleSpecifier: emitAlias(origin),
              namedImports: g.names.map((n) => {
                const [name, alias] = n.split(" as ");
                return alias ? { name, alias } : { name };
              }),
            });
          if (g.typeNames.length)
            sf.insertImportDeclaration(at++, {
              moduleSpecifier: emitAlias(origin),
              isTypeOnly: true,
              namedImports: g.typeNames.map((n) => {
                const [name, alias] = n.split(" as ");
                return alias ? { name, alias } : { name };
              }),
            });
        }
      }
      importsRewritten++;
      filesChanged++;
    }
    // Also handle `export {A} from "barrel"` re-export sites.
    for (const exp of sf.getExportDeclarations()) {
      const spec = exp.getModuleSpecifierValue();
      if (!spec) continue;
      let resolved: string | null = null;
      for (const [alias, dir] of ALIASES) {
        if (spec.startsWith(alias)) resolved = dir + spec.slice(alias.length);
      }
      if (resolved === null && spec.startsWith(".")) {
        resolved = posix.normalize(
          join(dirname(sf.getFilePath().replaceAll("\\", "/").replace(ROOT + "/", "")), spec).replaceAll("\\", "/")
        );
      }
      if (resolved !== barrelModule && resolved !== barrel) continue;
      manualFix.push(`${sf.getFilePath().replace(ROOT + "/", "")}: re-export from "${spec}" — manual check needed`);
    }
    if (!dryRun) sf.saveSync();
  }
}

console.log(`${dryRun ? "[dry-run]" : ""} rewrote ${importsRewritten} imports across ${filesChanged} file-imports`);
if (manualFix.length) {
  console.log(`\nMANUAL FIX (${manualFix.length}):`);
  for (const m of manualFix.slice(0, 40)) console.log("  " + m);
}
