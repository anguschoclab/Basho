/**
 * rikishiUI.test.ts
 *
 * Tests for rikishi UI projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import { projectRikishi } from "../../presenters/rikishiUI";
import { createMockRikishi, createMockWorldState } from "../utils/testHelpers";

describe("rikishiUI", () => {
  describe("projectRikishi", () => {
    it("should return a UI rikishi projection", () => {
      const rikishi = createMockRikishi({ id: "rikishi-1" }) as any;
      const world = createMockWorldState() as any;
      const result = projectRikishi(rikishi, world);
      expect(result).toBeDefined();
      expect(result.id).toBe("rikishi-1");
    });

    it("should include shikona when available", () => {
      const rikishi = createMockRikishi({ id: "rikishi-1", shikona: "Test Shikona" }) as any;
      const world = createMockWorldState() as any;
      const result = projectRikishi(rikishi, world);
      expect(result.shikona).toBe("Test Shikona");
    });
  });
});
