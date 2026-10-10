/**
 * report-test-timings.ts — runs a vitest suite with the JSON reporter and emits
 * a per-file timing artifact consumed by the test-budget meta gate.
 *
 * Usage:
 *   bunx tsx scripts/report-test-timings.ts --suite fast   # vitest.config.ts
 *   bunx tsx scripts/report-test-timings.ts --suite slow   # vitest.slow.config.ts
 *   bunx tsx scripts/report-test-timings.ts --suite perf   # vitest.perf.config.ts
 *   bunx tsx scripts/report-test-timings.ts --suite all
 *   bunx tsx scripts/report-test-timings.ts --suite fast --json existing.json  # parse, don't run
 *
 * Options:
 *   --suite <fast|slow|perf|all>   which config to run (required)
 *   --out   <path>                 merged output (default: docs/audit/test-timings.json)
 *   --xml   <path>                 parse an existing vitest JUnit report instead of running
 *   --top   <n>                    rows in the printed table (default: 25)
 *
 * The --out file is cumulative: entries for suites not run this invocation are
 * preserved, entries for the run suite are replaced.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DEFAULT_OUT = join(ROOT, "docs/audit/test-timings.json");

const SUITE_CONFIGS: Record<string, string> = {
  fast: "vitest.config.ts",
  slow: "vitest.slow.config.ts",
  perf: "vitest.perf.config.ts",
};

interface TimingEntry {
  file: string;
  durationMs: number;
  testCount: number;
}

interface TimingReport {
  generatedAt: string;
  suites: Record<
    string,
    {
      totalDurationMs: number;
      fileCount: number;
      testCount: number;
      files: TimingEntry[];
    }
  >;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    suite: get("suite"),
    out: get("out") ?? DEFAULT_OUT,
    xml: get("xml"),
    top: Number(get("top") ?? "25"),
  };
}

/**
 * Parses vitest's JUnit XML. Per-file `testsuite time` INCLUDES beforeAll/
 * afterAll hooks (unlike the JSON reporter's `duration`, which covers only
 * test bodies — hook-heavy files would otherwise look instant).
 */
function parseJunitXml(xmlPath: string): TimingEntry[] {
  const xml = readFileSync(xmlPath, "utf8");
  const entries: TimingEntry[] = [];
  for (const m of xml.matchAll(
    /<testsuite name="([^"]+)"[^>]*?tests="(\d+)"[^>]*?time="([\d.]+)"/g
  )) {
    entries.push({
      file: relative(
        ROOT,
        m[1]
          .replace(/&quot;/g, '"')
          .replace(/&gt;/g, ">")
          .replace(/&lt;/g, "<")
          .replace(/&amp;/g, "&")
      ),
      testCount: Number(m[2]),
      durationMs: Math.round(Number(m[3]) * 1000),
    });
  }
  return entries.sort((a, b) => b.durationMs - a.durationMs);
}

function runSuite(suite: string): string {
  const config = SUITE_CONFIGS[suite];
  if (!config) {
    console.error(`Unknown suite "${suite}". Valid: ${Object.keys(SUITE_CONFIGS).join(", ")}, all`);
    process.exit(1);
  }
  const tmp = join(ROOT, `node_modules/.cache/test-timings-${suite}.xml`);
  mkdirSync(dirname(tmp), { recursive: true });
  console.log(`Running "${suite}" suite (config: ${config}) ...`);
  const res = spawnSync(
    "bunx",
    ["vitest", "run", "--config", config, "--reporter=junit", `--outputFile=${tmp}`],
    { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"], env: process.env }
  );
  if (!existsSync(tmp)) {
    console.error(`vitest produced no JUnit report at ${tmp}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.warn(
      `warning: "${suite}" suite exited ${res.status} — timings reflect a failing/partial run`
    );
  }
  return tmp;
}

function main() {
  const args = parseArgs();
  if (!args.suite) {
    console.error(
      "usage: report-test-timings.ts --suite <fast|slow|perf|all> [--out path] [--xml path] [--top n]"
    );
    process.exit(1);
  }
  const suites = args.suite === "all" ? Object.keys(SUITE_CONFIGS) : [args.suite];

  const report: TimingReport = existsSync(args.out)
    ? (JSON.parse(readFileSync(args.out, "utf8")) as TimingReport)
    : { generatedAt: "", suites: {} };

  for (const suite of suites) {
    const xmlPath = args.xml ?? runSuite(suite);
    const files = parseJunitXml(xmlPath);
    report.suites[suite] = {
      totalDurationMs: files.reduce((s, f) => s + f.durationMs, 0),
      fileCount: files.length,
      testCount: files.reduce((s, f) => s + f.testCount, 0),
      files,
    };
    printTable(suite, files, args.top);
  }

  report.generatedAt = new Date().toISOString();
  mkdirSync(dirname(args.out), { recursive: true });
  writeFileSync(args.out, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nWrote ${relative(ROOT, args.out)}`);
}

function printTable(suite: string, files: TimingEntry[], top: number) {
  const total = files.reduce((s, f) => s + f.durationMs, 0);
  console.log(
    `\n${suite}: ${files.length} files, ${(total / 1000).toFixed(1)}s total — top ${top}`
  );
  for (const f of files.slice(0, top)) {
    console.log(`  ${(f.durationMs / 1000).toFixed(1).padStart(7)}s  ${f.file}`);
  }
}

main();
