import { describe, expect, it } from "bun:test";
import { getVoiceMatrix } from "../pbpMatrix";

describe("PBP Matrix Validation", () => {
  it("should have valid string interpolation tokens", () => {
    const lib = getVoiceMatrix();
    const validTokens = ["east", "west", "winner", "loser", "kimarite", "leader", "trailer", "rikishi_shikona", "action_target"];

    let allValid = true;
    const errors: string[] = [];

    function checkText(text: string, context: string) {
      const matches = text.match(/\{(\w+)\}/g);
      if (matches) {
        for (const match of matches) {
          const token = match.replace(/[\{\}]/g, "");
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
});
