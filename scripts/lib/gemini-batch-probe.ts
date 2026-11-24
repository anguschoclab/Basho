/** Probe the Batch API quota — run: bun scripts/lib/gemini-batch-probe.ts */
import { readFileSync } from "node:fs";

const key = readFileSync(".env", "utf8").match(/GEMINI_API_KEY\s*=\s*(\S+)/)?.[1];
if (!key) throw new Error("no key");

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const PIXEL =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const model = "models/gemini-2.5-flash-image";

const body = {
  batch: {
    displayName: "quota-probe",
    inputConfig: {
      requests: {
        requests: [
          {
            request: {
              contents: [
                {
                  parts: [
                    { text: "Return this image unchanged." },
                    { inlineData: { mimeType: "image/png", data: PIXEL } },
                  ],
                },
              ],
              generationConfig: { responseModalities: ["IMAGE"] },
            },
            metadata: { key: "probe-0" },
          },
        ],
      },
    },
  },
};

const res = await fetch(`${BASE}/${model}:batchGenerateContent`, {
  method: "POST",
  headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const j = await res.json();
console.log(res.status, JSON.stringify(j).slice(0, 800));
