/**
 * audit-orphans.ts
 * ================
 * Static analysis tool to discover orphaned features: unreferenced exports,
 * orphan routes, unticked services, unused components, and write-only state fields.
 *
 * Usage: bun scripts/audit-orphans.ts [--json <path>] [--csv <path>]
 *
 * Outputs a summary to stdout and optionally writes JSON + CSV reports.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "fs";
import { join, relative, extname, basename } from "path";
import { fileURLToPath } from "url";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrphanEntry {
  id: string;
  file: string;
  symbol: string;
  orphanType:
    | "unreferenced-export"
    | "orphan-route"
    | "unticked-service"
    | "unused-component"
    | "write-only-state";
  priority: "P0" | "P1" | "P2" | "P3";
  uiRoute: string;
  npcConsumer: string;
  tickPhase: string;
  status: string;
}

interface AuditReport {
  generatedAt: string;
  summary: {
    total: number;
    unreferencedExports: number;
    orphanRoutes: number;
    untickedServices: number;
    unusedComponents: number;
    writeOnlyState: number;
  };
  entries: OrphanEntry[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const ENGINE_DIR = join(SRC, "engine");
const COMPONENTS_DIR = join(SRC, "components");
const SYSTEMS_DIR = join(ENGINE_DIR, "systems");
const AGENTS_DIR = join(ENGINE_DIR, "agents");
const NPC_AI_DIR = join(ENGINE_DIR, "npcAI");

const FILE_EXTENSIONS = [".ts", ".tsx"];
const TEST_PATTERNS = [".test.", ".spec.", "__tests__", "/tests/", "/e2e/"];

let orphanId = 0;
function nextId(): string {
  return `ORPH-${String(++orphanId).padStart(4, "0")}`;
}

// ─── File collection ─────────────────────────────────────────────────────────

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((p) => filePath.includes(p));
}

function isScriptFile(filePath: string): boolean {
  return filePath.includes("/scripts/");
}

function collectFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === "dist" || entry === "release")
        continue;
      collectFiles(fullPath, files);
    } else if (FILE_EXTENSIONS.includes(extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

function readContent(filePath: string): string {
  try {
    return readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function relPath(absPath: string): string {
  return relative(ROOT, absPath).replace(/\\/g, "/");
}

// ─── All source files (non-test, non-script) ─────────────────────────────────

const allFiles = collectFiles(SRC);
const runtimeFiles = allFiles.filter((f) => !isTestFile(f) && !isScriptFile(f));

// Pre-compute file contents for deterministic reference checking
const fileContents = new Map<string, string>();
for (const f of runtimeFiles) {
  fileContents.set(f, readContent(f));
}
const runtimeBlob = Array.from(fileContents.values()).join("\n");

// ─── 1. Unreferenced exports ─────────────────────────────────────────────────

function extractExports(filePath: string): { name: string; line: number }[] {
  const content = readContent(filePath);
  const exports: { name: string; line: number }[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // export function foo
    let m = line.match(/^export\s+(?:async\s+)?function\s+(\w+)/);
    if (m) {
      exports.push({ name: m[1], line: i + 1 });
      continue;
    }

    // export const foo
    m = line.match(/^export\s+(?:const|let|var)\s+(\w+)/);
    if (m) {
      exports.push({ name: m[1], line: i + 1 });
      continue;
    }

    // export class Foo
    m = line.match(/^export\s+(?:abstract\s+)?class\s+(\w+)/);
    if (m) {
      exports.push({ name: m[1], line: i + 1 });
      continue;
    }

    // export { foo, bar }
    m = line.match(/^export\s+\{([^}]+)\}/);
    if (m) {
      const names = m[1].split(",").map((s) =>
        s
          .trim()
          .split(/\s+as\s+/)[0]
          .trim()
      );
      for (const n of names) {
        if (n && !n.startsWith("//")) exports.push({ name: n, line: i + 1 });
      }
      continue;
    }

    // export type Foo
    m = line.match(/^export\s+(?:type|interface|enum)\s+(\w+)/);
    if (m) {
      exports.push({ name: m[1], line: i + 1 });
      continue;
    }

    // export default function
    m = line.match(/^export\s+default\s+(?:function|class)\s+(\w+)/);
    if (m) {
      exports.push({ name: m[1], line: i + 1 });
      continue;
    }
  }

  return exports;
}

function isReferenced(name: string, selfPath: string): boolean {
  // Search for the name in all runtime files except the declaring file.
  // Test files and scripts do NOT count as consumers — only runtime code does.
  const importPattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
  for (const f of runtimeFiles) {
    if (f === selfPath) continue;
    const content = fileContents.get(f);
    if (content && importPattern.test(content)) return true;
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findUnreferencedExports(): OrphanEntry[] {
  const entries: OrphanEntry[] = [];

  // Only scan engine systems, agents, and key utility files
  const scanDirs = [
    SYSTEMS_DIR,
    AGENTS_DIR,
    NPC_AI_DIR,
    join(ENGINE_DIR, "actions"),
    join(ENGINE_DIR, "advisor"),
    join(ENGINE_DIR, "ai"),
    join(ENGINE_DIR, "almanac"),
    join(ENGINE_DIR, "banzuke"),
    join(ENGINE_DIR, "bard"),
    join(ENGINE_DIR, "bout"),
    join(ENGINE_DIR, "core"),
    join(ENGINE_DIR, "governance"),
    join(ENGINE_DIR, "lifecycle"),
    join(ENGINE_DIR, "matchmaking"),
    join(ENGINE_DIR, "npcAI"),
    join(ENGINE_DIR, "prestige"),
    join(ENGINE_DIR, "shikona"),
    join(ENGINE_DIR, "strategy"),
    join(ENGINE_DIR, "training"),
    join(ENGINE_DIR, "utils"),
    join(ENGINE_DIR, "worker"),
  ];

  const scannedFiles = new Set<string>();
  for (const dir of scanDirs) {
    const files = collectFiles(dir);
    for (const file of files) {
      if (scannedFiles.has(file)) continue;
      scannedFiles.add(file);
      if (isTestFile(file)) continue;

      const exports = extractExports(file);
      for (const exp of exports) {
        // Skip type-only exports and common re-exports
        if (exp.name === "default") continue;
        if (!isReferenced(exp.name, file)) {
          entries.push({
            id: nextId(),
            file: relPath(file),
            symbol: exp.name,
            orphanType: "unreferenced-export",
            priority: classifyPriority(file),
            uiRoute: "",
            npcConsumer: "",
            tickPhase: "",
            status: "candidate",
          });
        }
      }
    }
  }

  return entries;
}

function classifyPriority(filePath: string): "P0" | "P1" | "P2" | "P3" {
  const rel = relPath(filePath);
  if (
    rel.includes("/economy/") ||
    rel.includes("/health/") ||
    rel.includes("/training/") ||
    rel.includes("/welfare/")
  )
    return "P0";
  if (
    rel.includes("/governance/") ||
    rel.includes("/media/") ||
    rel.includes("/recruitment/") ||
    rel.includes("/narrative/")
  )
    return "P1";
  if (rel.includes("/legacy/") || rel.includes("/meta/") || rel.includes("/worldCircuit/"))
    return "P2";
  return "P3";
}

// ─── 2. Orphan routes ────────────────────────────────────────────────────────

function findOrphanRoutes(): OrphanEntry[] {
  const entries: OrphanEntry[] = [];
  const routesFile = join(SRC, "routes.tsx");
  if (!existsSync(routesFile)) return entries;

  const routesContent = readContent(routesFile);

  // Extract route variable names and their paths from createRoute calls.
  // Pattern: const <varName> = createRoute({ ... path: "/something" ... })
  const createRoutePattern =
    /const\s+(\w+)\s*=\s*createRoute\s*\(\s*\{[^}]*?path:\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  const routeVars: Array<{ varName: string; path: string }> = [];
  while ((match = createRoutePattern.exec(routesContent)) !== null) {
    const varName = match[1];
    const path = match[2];
    // Skip dynamic parent routes and root
    if (path === "/" || path === "/_") continue;
    routeVars.push({ varName, path });
  }

  // Extract all variable names registered in addChildren([...]) calls.
  // These routes are reachable via the router tree and are NOT orphans.
  const registeredVars = new Set<string>();
  const addChildrenPattern = /addChildren\s*\(\s*\[([^\]]*)\]/g;
  let childMatch: RegExpExecArray | null;
  while ((childMatch = addChildrenPattern.exec(routesContent)) !== null) {
    const inner = childMatch[1];
    // Extract identifiers (skip comments, whitespace, dots)
    const identPattern = /(\w+)/g;
    let identMatch: RegExpExecArray | null;
    while ((identMatch = identPattern.exec(inner)) !== null) {
      registeredVars.add(identMatch[1]);
    }
  }

  // Build a blob of ALL source files (runtime + test + scripts) to search for route references
  const allSourceBlob = allFiles.map((f) => readContent(f)).join("\n");

  for (const { varName, path: route } of routeVars) {
    // Skip parameterized routes
    if (route.includes("$")) continue;

    // A route is NOT an orphan if:
    // 1. It's registered in the route tree via addChildren([...])
    // 2. It's referenced anywhere in the codebase as a string literal
    //    - sidebar config (to: "/route")
    //    - redirect({ to: "/route" })
    //    - <Link to="/route" />
    //    - navigate({ to: "/route" })
    //    - router.navigate({ to: "/route" })
    const isRegistered = registeredVars.has(varName);
    const routeQuoted = [`"${route}"`, `'${route}'`, `\`${route}\``];
    const isReferenced = isRegistered || routeQuoted.some((q) => allSourceBlob.includes(q));

    if (!isReferenced) {
      entries.push({
        id: nextId(),
        file: "src/routes.tsx",
        symbol: route,
        orphanType: "orphan-route",
        priority: "P1",
        uiRoute: route,
        npcConsumer: "",
        tickPhase: "",
        status: "candidate",
      });
    }
  }

  return entries;
}

// ─── 3. Unticked services ────────────────────────────────────────────────────

function findUntickedServices(): OrphanEntry[] {
  const entries: OrphanEntry[] = [];

  // Collect all service files
  const serviceFiles = collectFiles(SYSTEMS_DIR).filter(
    (f) => !isTestFile(f) && extname(f) === ".ts"
  );

  // Build a map of import paths → importing file, across all runtime (non-test) engine files.
  // A service is "ticked" if at least one of its exported symbols is imported by another runtime file.
  const engineRuntimeFiles = collectFiles(ENGINE_DIR).filter((f) => !isTestFile(f));

  for (const serviceFile of serviceFiles) {
    const serviceName = basename(serviceFile, ".ts");
    const exports = extractExports(serviceFile);
    if (exports.length === 0) continue;

    // Check if any exported symbol from this service appears in another runtime file
    // (not the service file itself). We look for the symbol name as a word boundary
    // match in the runtime blob, excluding the service's own content.
    const otherBlob = engineRuntimeFiles
      .filter((f) => f !== serviceFile)
      .map((f) => readContent(f))
      .join("\n");

    const isImported = exports.some((exp) => {
      const pattern = new RegExp(`\\b${escapeRegex(exp.name)}\\b`);
      return pattern.test(otherBlob);
    });

    if (!isImported) {
      entries.push({
        id: nextId(),
        file: relPath(serviceFile),
        symbol: serviceName,
        orphanType: "unticked-service",
        priority: classifyPriority(serviceFile),
        uiRoute: "",
        npcConsumer: "",
        tickPhase: "",
        status: "candidate",
      });
    }
  }

  return entries;
}

// ─── 4. Unused components ────────────────────────────────────────────────────

function findUnusedComponents(): OrphanEntry[] {
  const entries: OrphanEntry[] = [];

  const componentFiles = collectFiles(COMPONENTS_DIR).filter(
    (f) => !isTestFile(f) && extname(f) === ".tsx"
  );

  for (const compFile of componentFiles) {
    const compName = basename(compFile, ".tsx");
    if (compName === "index" || compName.startsWith("_")) continue;

    // Check if component name is referenced in any other runtime file
    void readContent(compFile);
    const otherFiles = runtimeFiles.filter((f) => f !== compFile);
    const otherBlob = otherFiles.map((f) => readContent(f)).join("\n");

    // Look for import or JSX usage
    const usagePattern = new RegExp(`\\b${escapeRegex(compName)}\\b`);
    if (!usagePattern.test(otherBlob)) {
      entries.push({
        id: nextId(),
        file: relPath(compFile),
        symbol: compName,
        orphanType: "unused-component",
        priority: "P2",
        uiRoute: "",
        npcConsumer: "",
        tickPhase: "",
        status: "candidate",
      });
    }
  }

  return entries;
}

// ─── 5. Write-only state fields ──────────────────────────────────────────────

function findWriteOnlyState(): OrphanEntry[] {
  const entries: OrphanEntry[] = [];

  // Read world types to find state fields
  const worldTypeFile = join(ENGINE_DIR, "types", "world.ts");
  if (!existsSync(worldTypeFile)) return entries;

  const worldTypeContent = readContent(worldTypeFile);
  const stateFields: string[] = [];

  // Extract field names from the WorldState interface
  const fieldPattern = /^\s+(\w+)[?\s]*:/gm;
  let match: RegExpExecArray | null;
  while ((match = fieldPattern.exec(worldTypeContent)) !== null) {
    const field = match[1];
    // Skip common non-state fields
    if (
      [
        "type",
        "import",
        "export",
        "interface",
        "class",
        "enum",
        "const",
        "let",
        "var",
        "function",
      ].includes(field)
    )
      continue;
    stateFields.push(field);
  }

  // Build a blob of ALL source files (runtime + test) to search for field reads
  const allSourceBlob = allFiles.map((f) => readContent(f)).join("\n");

  // Read ImpactBuilder to find which fields are written
  const impactBuilderFile = join(ENGINE_DIR, "core", "ImpactBuilder.ts");
  const writtenFields = new Set<string>();
  if (existsSync(impactBuilderFile)) {
    const impactContent = readContent(impactBuilderFile);
    // Look for field names in addImpact or setField patterns
    const writePattern = /["'`](\w+)["'`]/g;
    let wMatch: RegExpExecArray | null;
    while ((wMatch = writePattern.exec(impactContent)) !== null) {
      writtenFields.add(wMatch[1]);
    }
  }

  // For each state field, check if it's read anywhere in the codebase
  for (const field of stateFields) {
    if (
      [
        "id",
        "version",
        "seed",
        "rng",
        "tick",
        "day",
        "week",
        "month",
        "year",
        "cyclePhase",
        "currentBasho",
        "currentDate",
        "date",
        "time",
        "timestamp",
        "history",
        "eventLog",
        "events",
        "pendingEvents",
        "rikishi",
        "stables",
        "oyakata",
        "managers",
        "heya",
        "freeAgents",
      ].includes(field)
    )
      continue;

    // Check if field is read anywhere in the codebase (world.field, state.world.field, etc.)
    const readPattern = new RegExp(`\\.${escapeRegex(field)}\\b`);
    const isRead = readPattern.test(allSourceBlob);

    // Check if field is written by any phase
    const isWritten =
      writtenFields.has(field) ||
      runtimeBlob.includes(`world.${field} =`) ||
      runtimeBlob.includes(`.${field}:`);

    if (isWritten && !isRead) {
      entries.push({
        id: nextId(),
        file: "src/engine/types/world.ts",
        symbol: field,
        orphanType: "write-only-state",
        priority: "P1",
        uiRoute: "",
        npcConsumer: "",
        tickPhase: "",
        status: "candidate",
      });
    }
  }

  return entries;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log("🔍 Running orphan audit...\n");

  const unreferencedExports = findUnreferencedExports();
  console.log(`  Unreferenced exports: ${unreferencedExports.length}`);

  const orphanRoutes = findOrphanRoutes();
  console.log(`  Orphan routes: ${orphanRoutes.length}`);

  const untickedServices = findUntickedServices();
  console.log(`  Unticked services: ${untickedServices.length}`);

  const unusedComponents = findUnusedComponents();
  console.log(`  Unused components: ${unusedComponents.length}`);

  const writeOnlyState = findWriteOnlyState();
  console.log(`  Write-only state fields: ${writeOnlyState.length}`);

  const allEntries = [
    ...unreferencedExports,
    ...orphanRoutes,
    ...untickedServices,
    ...unusedComponents,
    ...writeOnlyState,
  ];

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: allEntries.length,
      unreferencedExports: unreferencedExports.length,
      orphanRoutes: orphanRoutes.length,
      untickedServices: untickedServices.length,
      unusedComponents: unusedComponents.length,
      writeOnlyState: writeOnlyState.length,
    },
    entries: allEntries,
  };

  // Parse CLI args for --json <path>
  const args = process.argv.slice(2);
  let customJsonPath: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json" && args[i + 1]) {
      customJsonPath = args[i + 1];
      i++;
    }
  }

  // Write JSON report
  const auditDir = join(ROOT, ".windsurf", "audit");
  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });

  const jsonPath = customJsonPath ?? join(auditDir, "baseline-orphans.json");
  if (customJsonPath) {
    const customDir = join(jsonPath, "..");
    if (!existsSync(customDir)) mkdirSync(customDir, { recursive: true });
  }
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 JSON report: ${relPath(jsonPath)}`);

  // Write CSV tracker (skip in test mode when custom --json path is provided)
  if (!customJsonPath) {
    const csvPath = join(auditDir, "orphan-tracker.csv");
    const csvHeader =
      "ID,File,Symbol,OrphanType,Priority,UIRoute,NPCConsumer,TickPhase,TestFile,Status,PR\n";
    const csvRows = allEntries.map((e) =>
      [
        e.id,
        e.file,
        e.symbol,
        e.orphanType,
        e.priority,
        e.uiRoute,
        e.npcConsumer,
        e.tickPhase,
        "",
        e.status,
        "",
      ]
        .map((v) => `"${v.replace(/"/g, '""')}"`)
        .join(",")
    );
    writeFileSync(csvPath, csvHeader + csvRows.join("\n"));
    console.log(`📊 CSV tracker: ${relPath(csvPath)}`);
  }

  // Print summary
  console.log("\n" + "─".repeat(60));
  console.log(`TOTAL ORPHANS: ${allEntries.length}`);
  console.log("─".repeat(60));

  // Print top entries per category
  const categories: (keyof AuditReport["summary"])[] = [
    "unreferencedExports",
    "orphanRoutes",
    "untickedServices",
    "unusedComponents",
    "writeOnlyState",
  ];
  for (const cat of categories) {
    const catName = cat.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    const catEntries = allEntries.filter((e) => {
      if (cat === "unreferencedExports") return e.orphanType === "unreferenced-export";
      if (cat === "orphanRoutes") return e.orphanType === "orphan-route";
      if (cat === "untickedServices") return e.orphanType === "unticked-service";
      if (cat === "unusedComponents") return e.orphanType === "unused-component";
      if (cat === "writeOnlyState") return e.orphanType === "write-only-state";
      return false;
    });
    if (catEntries.length > 0) {
      console.log(`\n${catName} (${catEntries.length}):`);
      for (const e of catEntries.slice(0, 10)) {
        console.log(`  [${e.priority}] ${e.file} → ${e.symbol}`);
      }
      if (catEntries.length > 10) {
        console.log(`  ... and ${catEntries.length - 10} more`);
      }
    }
  }

  console.log("\n✅ Audit complete.");
}

main();
