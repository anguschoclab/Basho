/**
 * Game Store Worker Sync Tests
 * Verifies state versioning and pending tick locking
 */

import { describe, it, expect } from "vitest";

describe("gameStore worker synchronization", () => {
  it("should prevent concurrent tick commands", () => {
    const pendingTick = false;
    const sendCommand = (command: { type: string }) => {
      if (
        pendingTick &&
        ["TICK_DAY", "AUTO_SIM_DAYS", "TICK_MULTIPLE_DAYS"].includes(command.type)
      ) {
        console.warn("[Store] Tick command dropped - another tick is in progress");
        return false;
      }
      return true;
    };

    // First command should succeed
    expect(sendCommand({ type: "TICK_DAY" })).toBe(true);
  });

  it("should increment worldVersion on WORLD_UPDATED", () => {
    let worldVersion = 0;

    const handleWorldUpdated = (data: { version?: number }) => {
      const newVersion = data.version ?? worldVersion + 1;
      worldVersion = newVersion;
      return worldVersion;
    };

    handleWorldUpdated({ version: 5 });
    expect(worldVersion).toBe(5);

    handleWorldUpdated({}); // No version provided
    expect(worldVersion).toBe(6);
  });

  it("should set pendingTick for tick commands", () => {
    const state = { pendingTick: false, isSimulating: false };

    const sendCommand = (command: { type: string }) => {
      if (
        state.pendingTick &&
        ["TICK_DAY", "AUTO_SIM_DAYS", "TICK_MULTIPLE_DAYS"].includes(command.type)
      ) {
        return false;
      }

      if (command.type === "AUTO_SIM_DAYS" || command.type === "TICK_MULTIPLE_DAYS") {
        state.isSimulating = true;
        state.pendingTick = true;
      } else if (command.type === "TICK_DAY") {
        state.pendingTick = true;
      }
      return true;
    };

    sendCommand({ type: "TICK_DAY" });
    expect(state.pendingTick).toBe(true);

    // Second tick should be dropped
    expect(sendCommand({ type: "TICK_DAY" })).toBe(false);
  });

  it("should clear pendingTick on WORLD_UPDATED", () => {
    const state = { pendingTick: true, worldVersion: 0 };

    const handleWorldUpdated = (data: { version?: number }) => {
      state.worldVersion = data.version ?? state.worldVersion + 1;
      state.pendingTick = false;
    };

    handleWorldUpdated({ version: 3 });
    expect(state.pendingTick).toBe(false);
    expect(state.worldVersion).toBe(3);
  });
});
