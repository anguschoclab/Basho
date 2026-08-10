import { describe, it, expect, vi, beforeEach } from "vitest";

const loadDomainsMock = vi.fn().mockResolvedValue(undefined);

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

vi.mock("@/components/SplashScreen", () => ({
  SplashScreen: () => null,
}));

vi.mock("@/App", () => ({
  default: () => null,
}));

vi.mock("@/engine/utils/Logger", () => ({
  error: vi.fn(),
}));

vi.mock("@/engine/bard/BardEngine", () => ({
  BardEngine: {
    loadDomains: loadDomainsMock,
    areDomainsLoaded: vi.fn(() => true),
    resetCache: vi.fn(),
    resetDomains: vi.fn(),
  },
}));

describe("bootstrap deferred BardEngine import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("initializeApp calls BardEngine.loadDomains via dynamic import", async () => {
    const { initializeApp } = await import("@/bootstrap");
    const fakeEl = document.createElement("div");
    await initializeApp(fakeEl);

    expect(loadDomainsMock).toHaveBeenCalled();
  });

  it("initializeApp renders splash before domains load, then app after", async () => {
    const { createRoot } = await import("react-dom/client");
    const { initializeApp } = await import("@/bootstrap");

    const renderMock = vi.fn();
    vi.mocked(createRoot).mockReturnValue({ render: renderMock } as never);

    let domainsResolved = false;
    loadDomainsMock.mockImplementation(async () => {
      domainsResolved = true;
    });

    const fakeEl = document.createElement("div");
    await initializeApp(fakeEl);

    expect(renderMock).toHaveBeenCalledTimes(2);
    expect(domainsResolved).toBe(true);
  });
});
