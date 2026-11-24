/**
 * avatar-polish-gemini.ts
 * =======================
 * Sends every avatar on the contact sheet — plus the authored sprite parts
 * from pixelAtlas — through a Gemini image model for an HD pixel-art polish
 * pass, then composes a polished contact sheet.
 *
 * Requires GEMINI_API_KEY in ./.env (or the environment).
 *
 * Usage:
 *   bun scripts/avatar-polish-gemini.ts [--out <dir>] [--concurrency <n>]
 *
 * Outputs (default docs/avatar-contact-sheet/):
 *   src-png/<key>.png          untouched 24×24 renders (Gemini input)
 *   src/components/avatar/polished/<key>.png   Gemini-polished assets
 *   contact-sheet-polished.html / .png
 *
 * Polished PNGs are written straight into the app's avatar asset dir;
 * regenerate the runtime catalog afterwards via
 * `bun scripts/lib/gen-polished-manifest.ts`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSections, sheetHtml, type SheetItem } from "./lib/avatar-sheet";
import {
  AVATAR_PROMPT,
  PART_PROMPT,
  callGeminiImage,
  loadApiKey,
  pickImageModel,
  withRetry,
} from "./lib/gemini-image";

// ---------------------------------------------------------------------------
// Args + env
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const outDir = resolve(opt("--out", join("docs", "avatar-contact-sheet")));
const srcDir = join(outDir, "src-png");
const polishedDir = resolve(
  opt("--polished-dir", join("src", "components", "avatar", "polished"))
);
for (const d of [srcDir, polishedDir]) mkdirSync(d, { recursive: true });
const CONCURRENCY = Math.max(1, parseInt(opt("--concurrency", "4"), 10) || 4);
const API_KEY = loadApiKey();

// ---------------------------------------------------------------------------
// Source PNGs via Playwright
// ---------------------------------------------------------------------------

const SHOT_PX = 192; // css px per cell; @2x → 384px PNG

async function renderSourcePngs(items: SheetItem[]): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    const html = `<!doctype html><html><body style="margin:0">
${items
  .map(
    (it) =>
      `<div data-key="${it.key}" style="display:inline-block">${it.svg.replace(
        /width="96" height="96"/,
        `width="${SHOT_PX}" height="${SHOT_PX}"`
      )}</div>`
  )
  .join("\n")}
</body></html>`;
    await page.setContent(html, { waitUntil: "load" });
    for (const it of items) {
      const path = join(srcDir, `${it.key}.png`);
      if (existsSync(path)) continue;
      await page.locator(`[data-key="${it.key}"]`).screenshot({ path });
    }
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const sections = buildSections();
const allItems = sections.flatMap((s) => s.items);
const limit = parseInt(opt("--limit", "0"), 10) || 0;
const items = limit > 0 ? allItems.slice(0, limit) : allItems;
console.log(`rendering ${items.length} source PNGs…`);
await renderSourcePngs(items);

const forced = opt("--model", "");
const model = forced || (await pickImageModel(API_KEY));
console.log(`using model: ${model} (${items.length} images, concurrency ${CONCURRENCY})`);

const failed = new Set<string>();
let done = 0;
let idx = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (idx < items.length) {
      const it = items[idx++];
      const outPath = join(polishedDir, `${it.key}.png`);
      if (!existsSync(outPath)) {
        try {
          const src = readFileSync(join(srcDir, `${it.key}.png`));
          const out = await withRetry(() =>
            callGeminiImage(API_KEY, model, src, it.kind === "part" ? PART_PROMPT : AVATAR_PROMPT)
          );
          writeFileSync(outPath, out);
        } catch (e) {
          failed.add(it.key);
          console.error(`  ✗ ${it.label}: ${e instanceof Error ? e.message : e}`);
        }
      }
      done++;
      if (done % 10 === 0 || done === items.length) console.log(`  ${done}/${items.length}`);
    }
  })
);

// Polished sheet: <img> where a polished file exists, source svg otherwise.
const polishedSections = sections.map((s) => ({
  title: s.title,
  items: s.items.map((it) => {
    const hasImg = existsSync(join(polishedDir, `${it.key}.png`));
    return {
      label: hasImg ? it.label : `${it.label} (src)`,
      inner: hasImg
        ? `<img src="file://${join(polishedDir, `${it.key}.png`)}" alt="${it.label}"/>`
        : it.svg,
    };
  }),
}));

const html = sheetHtml(`Avatar generator — polished (${model})`, polishedSections);
const htmlPath = join(outDir, "contact-sheet-polished.html");
writeFileSync(htmlPath, html);
console.log(`wrote ${htmlPath}`);

{
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
    await page.locator("#sheet").screenshot({ path: join(outDir, "contact-sheet-polished.png") });
    console.log(`wrote ${join(outDir, "contact-sheet-polished.png")}`);
  } finally {
    await browser.close();
  }
}

if (failed.size) console.log(`finished with ${failed.size} failed item(s) — source art kept`);
