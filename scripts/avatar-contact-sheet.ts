/**
 * avatar-contact-sheet.ts
 * =======================
 * Renders a labeled contact sheet of pixel avatars from the avatar generator
 * (generateAvatarIdentity + deriveAvatarStage + composeAvatar) — no game
 * state required. Emits a self-contained HTML file plus a PNG screenshot
 * (via the project's Playwright install).
 *
 * Usage:
 *   bun scripts/avatar-contact-sheet.ts [--out <dir>] [--html-only]
 *
 * Defaults: writes contact-sheet.html and contact-sheet.png into
 * docs/avatar-contact-sheet/.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildSections, sheetHtml } from "./lib/avatar-sheet";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const outDir = resolve(opt("--out", join("docs", "avatar-contact-sheet")));
mkdirSync(outDir, { recursive: true });

const sections = buildSections();
const html = sheetHtml(
  "Avatar generator — contact sheet",
  sections.map((s) => ({
    title: s.title,
    items: s.items.map((it) => ({ label: it.label, inner: it.svg })),
  }))
);

const htmlPath = join(outDir, "contact-sheet.html");
const pngPath = join(outDir, "contact-sheet.png");
writeFileSync(htmlPath, html);
console.log(`wrote ${htmlPath}`);

if (!flag("--html-only")) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "load" });
    await page.locator("#sheet").screenshot({ path: pngPath });
    console.log(`wrote ${pngPath}`);
  } finally {
    await browser.close();
  }
}
