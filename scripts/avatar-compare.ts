/**
 * avatar-compare.ts — build a model-comparison sheet.
 * Rows = output dirs, columns = the same sheet items.
 * Each arg is `name=<dir-containing-polished>`; bare names resolve to
 * ab/<name>/polished except "pro" → src/components/avatar/polished.
 *
 * Run: bun scripts/avatar-compare.ts [baseDir] [pro,flash25,flash31]
 */
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSections, sheetHtml } from "./lib/avatar-sheet";

const base = resolve(process.argv[2] ?? "docs/avatar-contact-sheet/ab");
const SRC_POLISHED = resolve("src/components/avatar/polished");

const rows = (process.argv[3] ?? "pro,flash25,flash31").split(",").map((spec) => {
  const eq = spec.indexOf("=");
  const name = eq >= 0 ? spec.slice(0, eq) : spec;
  const dir =
    eq >= 0
      ? resolve(spec.slice(eq + 1))
      : name === "pro"
        ? SRC_POLISHED
        : resolve(join(base, name, "polished"));
  return { name, dir };
});

const items = buildSections().flatMap((s) => s.items).slice(0, 8);

const html = sheetHtml(
  "Model comparison — same source avatars",
  rows.map((r) => ({
    title: r.name,
    items: items.map((it) => ({
      label: it.label,
      inner: `<img src="file://${join(r.dir, `${it.key}.png`)}" alt="${it.label}"/>`,
    })),
  }))
);

const path = join(base, "compare.html");
writeFileSync(path, html);
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(`file://${path}`, { waitUntil: "load" });
await page.locator("#sheet").screenshot({ path: join(base, "compare.png") });
await browser.close();
console.log(`wrote ${join(base, "compare.png")}`);
