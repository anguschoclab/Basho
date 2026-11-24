/**
 * avatar-compare.ts — build a model-comparison sheet.
 * Rows = output dirs under <base>, columns = the same sheet items.
 * Run: bun scripts/avatar-compare.ts [baseDir] [dir1,dir2,...]
 */
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSections, sheetHtml } from "./lib/avatar-sheet";

const base = resolve(process.argv[2] ?? "docs/avatar-contact-sheet/ab");
const dirs = (process.argv[3] ?? "pro,flash25,flash31").split(",");
const items = buildSections().flatMap((s) => s.items).slice(0, 8);

const html = sheetHtml(
  "Model comparison — same source avatars",
  dirs.map((d) => ({
    title: d,
    items: items.map((it) => ({
      label: it.label,
      inner: `<img src="${d}/polished/${it.key}.png" alt="${it.label}"/>`,
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
