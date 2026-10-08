import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRender = vi.fn();
const mockCreateRoot = vi.fn((_el: HTMLElement) => ({ render: mockRender }));
vi.mock("react-dom/client", () => ({
  createRoot: (el: HTMLElement) => mockCreateRoot(el),
}));

const mockLoadDomains = vi.fn(() => Promise.resolve({}));
vi.mock("@/engine/bard/BardEngine", () => ({
  BardEngine: {
    loadDomains: () => mockLoadDomains(),
  },
}));

const mockError = vi.fn();
vi.mock("@/engine/utils/Logger", () => ({
  error: (msg: string, ctx?: string) => mockError(msg, ctx),
}));

import { initializeApp } from "@/bootstrap";

function makeRootElement(): HTMLElement {
  const el = document.createElement("div");
  el.id = "root";
  return el;
}

describe("initializeApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadDomains.mockResolvedValue({});
  });

  it("renders splash synchronously before loadDomains() resolves", async () => {
    let resolveLoad: () => void = () => {};
    mockLoadDomains.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLoad = resolve as () => void;
      })
    );

    const root = makeRootElement();
    document.body.appendChild(root);

    const initPromise = initializeApp(root);
    // Flush microtasks for the synchronous splash render
    await Promise.resolve();

    // createRoot should have been called (for splash) before loadDomains resolves
    expect(mockCreateRoot).toHaveBeenCalled();
    // render is called for the splash
    expect(mockRender).toHaveBeenCalled();

    resolveLoad();
    await initPromise;
    document.body.removeChild(root);
  });

  it("renders <App/> after loadDomains() resolves", async () => {
    const root = makeRootElement();
    document.body.appendChild(root);

    await initializeApp(root);

    // At least two render calls: splash then App
    expect(mockRender).toHaveBeenCalledTimes(2);

    document.body.removeChild(root);
  });

  it("still renders <App/> when loadDomains() rejects, and logs via error()", async () => {
    mockLoadDomains.mockRejectedValueOnce(new Error("domain load failed"));

    const root = makeRootElement();
    document.body.appendChild(root);

    await initializeApp(root);

    expect(mockError).toHaveBeenCalled();
    // App should still be rendered despite the failure
    expect(mockCreateRoot).toHaveBeenCalled();

    document.body.removeChild(root);
  });

  it("logs via error() and does not throw when root element is null", async () => {
    await expect(initializeApp(null)).resolves.not.toThrow();
    expect(mockError).toHaveBeenCalled();
  });
});
