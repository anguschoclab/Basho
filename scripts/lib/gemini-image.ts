/**
 * gemini-image.ts — shared Gemini image-generation client for avatar scripts.
 * Requires GEMINI_API_KEY in ./.env (or the environment).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadApiKey(): string {
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

export const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function pickImageModel(apiKey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/models?pageSize=200`, {
    headers: { "x-goog-api-key": apiKey },
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

export const AVATAR_PROMPT = `This is a 24x24 pixel-art avatar portrait from a sumo wrestling management game. Redraw it as polished high-definition pixel art: keep the exact same character and composition — same head shape, hairstyle, hair color, skin tone, eyes, brows, nose, mouth, facial hair, any marks/scars, all accessories (topknot, cap, glasses, bandage, ceremonial rope), clothing style and colors, facial expression, and the same solid background color. Use crisp square pixels with NO anti-aliasing, but richer pixel-art craft: subtle highlight/shadow placement and refined shading. Output a single square image containing only the polished portrait.`;

export const PART_PROMPT = `This is a tiny pixel-art sprite part (an accessory overlay from a pixel avatar system) shown on a dark blue-gray background. Redraw it as polished high-definition pixel art: keep the exact same silhouette, position, and colors — crisp square pixels, no anti-aliasing — with subtle shading refinement. Keep the identical dark background color. Output a single square image.`;

interface InlineImage {
  data: string;
  mimeType?: string;
}

export async function callGeminiImage(
  apiKey: string,
  model: string,
  png: Buffer,
  prompt: string
): Promise<Buffer> {
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
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
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

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
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
