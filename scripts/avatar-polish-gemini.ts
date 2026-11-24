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
 *   polished/<key>.png         Gemini-polished renders
 *   contact-sheet-polished.html / .png
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSections, sheetHtml, type SheetItem } from "./lib/avatar-sheet";

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
const polishedDir = join(outDir, "polished");
for (const d of [srcDir, polishedDir]) mkdirSync(d, { recursive: true });
const CONCURRENCY = Math.max(1, parseInt(opt("--concurrency", "4"), 10) || 4);

function loadApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = resolve(".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("GEMINI_API_KEY not found in environment or ./.env");
}
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
// Gemini
// ---------------------------------------------------------------------------

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function pickImageModel(): Promise<string> {
  const res = await fetch(`${API_BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": API_KEY },
  });
  if (!res.ok) throw new Error(`model list failed: ${res.status}`);
  const json = (await res.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
  };
  const names = (json.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /image/i.test(n));
  const preferred = [
    /^gemini-3-pro-image$/i,
    /gemini-3-pro-image/i,
    /nano-banana-pro/i,
    /gemini-nano-banana/i,
    /gemini-3\.1-flash-image/i,
    /gemini-2\.5-flash-image/i,
    /image/i,
  ];
  for (const re of preferred) {
    const hit = names.find((n) => re.test(n));
    if (hit) return hit;
  }
  throw new Error(`no image-capable model found (saw: ${names.join(", ") || "none"})`);
}

const AVATAR_PROMPT = `This is a 24x24 pixel-art avatar portrait from a sumo wrestling management game. Redraw it as polished high-definition pixel art: keep the exact same character and composition — same head shape, hairstyle, hair color, skin tone, eyes, brows, nose, mouth, facial hair, any marks/scars, all accessories (topknot, cap, glasses, bandage, ceremonial rope), clothing style and colors, facial expression, and the same solid background color. Use crisp square pixels with NO anti-aliasing, but richer pixel-art craft: subtle highlight/shadow placement and refined shading. Output a single square image containing only the polished portrait.`;

const PART_PROMPT = `This is a tiny pixel-art sprite part (an accessory overlay from a pixel avatar system) shown on a dark blue-gray background. Redraw it as polished high-definition pixel art: keep the exact same silhouette, position, and colors — crisp square pixels, no anti-aliasing — with subtle shading refinement. Keep the identical dark background color. Output a single square image.`;

interface InlineImage {
  data: string;
  mimeType?: string;
}

async function callGemini(model: string, png: Buffer, kind: SheetItem["kind"]): Promise<Buffer> {
  const prompt = kind === "part" ? PART_PROMPT : AVATAR_PROMPT;
  const makeBody = (withImageConfig: boolean) =>
    JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/png", data: png.toString("base64") } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
        ...(withImageConfig ? { imageConfig: { aspectRatio: "1:1" } } : {}),
      },
    });

  for (const withImageConfig of [true, false]) {
    const res = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
      body: makeBody(withImageConfig),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      if (withImageConfig && res.status === 400) continue; // retry without imageConfig
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: Record<string, unknown>[] } }[];
    };
    const part = json.candidates?.[0]?.content?.parts?.find(
      (p) => (p.inlineData ?? p.inline_data) != null
    );
    const inline = (part?.inlineData ?? part?.inline_data) as InlineImage | undefined;
    if (!inline?.data) throw new Error("no image in response");
    return Buffer.from(inline.data, "base64");
  }
  throw new Error("unreachable");
}

const RETRY_WAITS = [5_000, 20_000, 60_000];

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= RETRY_WAITS.length; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < RETRY_WAITS.length) await new Promise((r) => setTimeout(r, RETRY_WAITS[i]));
    }
  }
  throw last;
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
const model = forced || (await pickImageModel());
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
          const out = await withRetry(() => callGemini(model, src, it.kind));
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
      inner: hasImg ? `<img src="polished/${it.key}.png" alt="${it.label}"/>` : it.svg,
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
