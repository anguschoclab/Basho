import { describe, it, expect } from "vitest";
import { decisionToastMessage } from "../decisionFeedback";

describe("decisionToastMessage", () => {
  it("includes the option label in the toast text", () => {
    const msg = decisionToastMessage("Rest At-Risk Wrestlers");
    expect(msg).toContain("Rest At-Risk Wrestlers");
  });

  it("references the Event Feed", () => {
    const msg = decisionToastMessage("Intensive");
    expect(msg).toContain("Event Feed");
  });

  it("is deterministic for the same input", () => {
    expect(decisionToastMessage("Push For Rank")).toBe(decisionToastMessage("Push For Rank"));
  });

  it("handles empty string gracefully", () => {
    const msg = decisionToastMessage("");
    expect(msg).toBe("Decision applied: . See the Event Feed for the result.");
  });
});
