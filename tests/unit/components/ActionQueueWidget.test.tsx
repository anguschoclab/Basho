import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ActionQueueWidget } from "@/components/dashboard/ActionQueueWidget";

describe("ActionQueueWidget — accessibility", () => {
  it("renders without crashing on empty items", () => {
    const { container } = render(<ActionQueueWidget items={[]} />);
    expect(container).toBeDefined();
  });
});
