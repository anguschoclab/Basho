/**
 * uiUtilities.test.ts
 *
 * Tests for UI utility functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  resolveRegistryLabel,
  enrichRikishiForUI,
} from "../../../presenters/utilities/uiUtilities";
import { createMockRikishi } from "../../utils/testHelpers";

describe("uiUtilities", () => {
  describe("resolveRegistryLabel", () => {
    it("should return the ID when entry not found", () => {
      const label = resolveRegistryLabel("test", "non-existent");
      expect(label).toBe("non-existent");
    });

    it("should return the label when entry found", () => {
      const label = resolveRegistryLabel("test", "test-id");
      expect(label).toBeDefined();
      expect(typeof label).toBe("string");
    });
  });

  describe("enrichRikishiForUI", () => {
    it("should return a UI rikishi projection", () => {
      const rikishi = createMockRikishi({ id: "rikishi-1" });
      const result = enrichRikishiForUI(rikishi as any);
      expect(result).toBeDefined();
      expect(result.id).toBe("rikishi-1");
    });
  });
});
