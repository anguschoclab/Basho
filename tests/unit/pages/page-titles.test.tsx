import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// React 19 hoists <title> and <meta> to <head> automatically.
// We verify document.title is set correctly after rendering.

afterEach(() => {
  cleanup();
  document.title = "";
});

describe("Page titles — native React 19 <title> rendering", () => {
  it("sets document.title via native <title> element", () => {
    function TestPage() {
      return (
        <div>
          <title>Test Page Title</title>
          <span>content</span>
        </div>
      );
    }
    render(<TestPage />);
    expect(document.title).toBe("Test Page Title");
  });

  it("sets dynamic document.title with interpolated values", () => {
    function DynamicPage({ name }: { name: string }) {
      return (
        <div>
          <title>{`${name} | Basho`}</title>
          <span>content</span>
        </div>
      );
    }
    render(<DynamicPage name="TestOyakata" />);
    expect(document.title).toBe("TestOyakata | Basho");
  });

  it("renders <title> alongside <meta> tags (ScoutingPage pattern)", () => {
    function PageWithMeta() {
      return (
        <div>
          <title>Scouting & Recruitment — Basho</title>
          <meta name="description" content="Scout opponents" />
          <span>content</span>
        </div>
      );
    }
    render(<PageWithMeta />);
    expect(document.title).toBe("Scouting & Recruitment — Basho");
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toBeTruthy();
    expect(meta?.getAttribute("content")).toBe("Scout opponents");
  });
});
