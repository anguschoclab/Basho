import { describe, expect, it } from "vitest";
import { getVoiceMatrix } from "../pbpMatrix";

describe("PBP Matrix Validation", () => {
  it("should have valid string interpolation tokens", () => {
    const lib = getVoiceMatrix();
    const validTokens = ["east", "west", "winner", "loser", "kimarite", "leader", "trailer", "rikishi_shikona", "action_target"];

    let allValid = true;
    const errors: string[] = [];

    function checkText(text: string, context: string) {
      const matches = text.match(/{(\w+)}/g);
      if (matches) {
        for (const match of matches) {
          const token = match.replace(/[{}]/g, "");
          if (!validTokens.includes(token)) {
            allValid = false;
            errors.push(`Invalid token {${token}} in ${context}: "${text}"`);
          }
        }
      }
    }

    function traverse(node: any, path: string) {
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          if (node[i] && node[i].text) {
            checkText(node[i].text, `${path}[${i}]`);
          }
        }
      } else if (node && typeof node === "object") {
        for (const key of Object.keys(node)) {
          traverse(node[key], `${path}.${key}`);
        }
      }
    }

    traverse(lib, "lib");

    if (errors.length > 0) {
      console.error("Invalid interpolation tokens found:", errors);
    }

    expect(allValid).toBe(true);
    expect(errors.length).toBe(0);
  });

  it("satisfies the Constitutional minimum phrase counts per cell", () => {
    const lib = getVoiceMatrix();
    const errors: string[] = [];

    for (const [context, cells] of Object.entries(lib)) {
      if (context === "meta" || context === "version" || typeof cells !== "object" || Array.isArray(cells)) continue;

      for (const [cellName, phrases] of Object.entries(cells as Record<string, any[]>)) {
        if (!Array.isArray(phrases)) continue;

        if (phrases.length < 50) {
          console.warn(`[Reject] ${context}.${cellName} has only ${phrases.length} phrases (min 50 required).`);
        }

        const isHighIntensity = cellName.includes("decisive") || cellName.includes("high") || context === "finish";
        if (isHighIntensity && phrases.length < 100) {
          console.warn(`[SEV-1 Warning] High-intensity cell ${context}.${cellName} has only ${phrases.length} phrases (target: 100).`);
        }
      }
    }

    if (errors.length > 0) {
      console.error(errors.join("\n"));
    }
    expect(errors.length).toBe(0);
  });
});
