import { describe, it, expect } from "vitest";
import React from "react";
import ReactDOM from "react-dom";

describe("React 19 version", () => {
  it("React.version starts with 19.", () => {
    expect(React.version.startsWith("19.")).toBe(true);
  });

  it("ReactDOM.version starts with 19.", () => {
    expect(ReactDOM.version.startsWith("19.")).toBe(true);
  });
});
