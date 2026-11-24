/** Probe every image-capable model on the key — run: bun scripts/lib/gemini-probe.ts */
import { readFileSync } from "node:fs";

const key: string = readFileSync(".env", "utf8").match(/GEMINI_API_KEY\s*=\s*(\S+)/)?.[1] ?? "";
if (!key) throw new Error("no key");
console.log("key length:", key.length, "prefix:", key.slice(0, 6) + "…\n");

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const list = (await (
  await fetch(`${BASE}/models?pageSize=200`, { headers: { "x-goog-api-key": key } })
).json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };

const models = list.models ?? [];
const imgModels = models.filter((m) => /image|imagen|banana/i.test(m.name));
console.log("image-ish models:");
for (const m of imgModels) {
  console.log(`  ${m.name}  methods=${(m.supportedGenerationMethods ?? []).join(",")}`);
}

const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function probeGenerateContent(model: string): Promise<string> {
  const res = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: "Return this image unchanged." },
            { inlineData: { mimeType: "image/png", data: PIXEL } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (res.ok) return `${res.status} OK`;
  const j = (await res.json()) as { error?: { message?: string; details?: { retryDelay?: string }[] } };
  const retry = j.error?.details?.find((d) => d.retryDelay)?.retryDelay;
  return `${res.status} ${(j.error?.message ?? "").slice(0, 60)}${retry ? ` retry=${retry}` : ""}`;
}

async function probePredict(model: string): Promise<string> {
  const res = await fetch(`${BASE}/models/${model}:predict`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: "a single blue square pixel on white" }],
      parameters: { sampleCount: 1, aspectRatio: "1:1" },
    }),
  });
  if (res.ok) return `${res.status} OK`;
  const j = (await res.json()) as { error?: { message?: string; details?: { retryDelay?: string }[] } };
  const retry = j.error?.details?.find((d) => d.retryDelay)?.retryDelay;
  return `${res.status} ${(j.error?.message ?? "").slice(0, 60)}${retry ? ` retry=${retry}` : ""}`;
}

console.log("\nprobes:");
for (const m of imgModels) {
  const name = m.name.replace(/^models\//, "");
  const methods = m.supportedGenerationMethods ?? [];
  if (methods.includes("generateContent")) {
    console.log(`  ${name}: ${await probeGenerateContent(name)}`);
  }
  if (methods.includes("predict")) {
    console.log(`  ${name} (predict): ${await probePredict(name)}`);
  }
}
