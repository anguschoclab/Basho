import { describe, it, expect } from "vitest";
import { useState, useMemo } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

function Counter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  const doubled = useMemo(() => count * 2, [count]);
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="doubled">{doubled}</span>
      <button onClick={() => setCount((c) => c + 1)}>Inc</button>
    </div>
  );
}

describe("React Compiler gate test", () => {
  it("renders a component with hooks and verifies it works", () => {
    render(<Counter initial={5} />);
    expect(screen.getByTestId("count").textContent).toBe("5");
    expect(screen.getByTestId("doubled").textContent).toBe("10");
  });

  it("updates state correctly after click", () => {
    render(<Counter initial={0} />);
    const btn = screen.getByRole("button", { name: "Inc" });
    fireEvent.click(btn);
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("doubled").textContent).toBe("2");
  });
});
