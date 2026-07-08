/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SuccessionModal } from "@/components/stable/SuccessionModal";
import type { WorldState } from "@/engine/types/world";

vi.mock("@/engine/systems/legacy/DynastyService", () => ({
  DynastyService: {
    findEligibleSuccessors: vi.fn(() => []),
  },
}));

import { DynastyService } from "@/engine/systems/legacy/DynastyService";

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

// ── Helpers ────────────────────────────────────────────────

function makeRikishi(id: string, shikona: string, heyaId: string) {
  return {
    id,
    shikona,
    name: shikona,
    heyaId,
    rank: "ozeki",
    division: "makuuchi",
    makuuchiWins: 10,
    birthYear: 1980,
    avatarConfig: {},
  } as any;
}

function makeOyakata(id: string, heyaId: string) {
  return {
    id,
    heyaId,
    name: `Oyakata ${id}`,
    shikona: `Ex-${id}`,
    age: 65,
    archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 10,
    successionReadiness: "mandatory",
  } as any;
}

function makeHeya(id: string, oyakataId: string) {
  return {
    id,
    oyakataId,
    name: `Stable ${id}`,
    rikishiIds: [],
  } as any;
}

function makeWorld(
  opts: {
    heyaId?: string;
    oyakataId?: string;
    rikishi?: any[];
  } = {}
): WorldState {
  const heyaId = opts.heyaId ?? "h1";
  const oyakataId = opts.oyakataId ?? "o1";
  const heyas = new Map([[heyaId, makeHeya(heyaId, oyakataId)]]);
  const oyakata = new Map([[oyakataId, makeOyakata(oyakataId, heyaId)]]);
  const rikishi = new Map<string, any>();
  for (const r of opts.rikishi ?? []) rikishi.set(r.id, r);
  return {
    heyas,
    oyakata,
    rikishi,
    activeRikishiIds: new Set((opts.rikishi ?? []).map((r) => r.id)),
    year: 2024,
    week: 10,
  } as any;
}

// ── Tests ──────────────────────────────────────────────────

describe("SuccessionModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when heya is missing", () => {
    const world = makeWorld();
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={vi.fn()}
        world={world}
        heyaId="nonexistent"
        onSelect={vi.fn()}
      />
    );
    expect(screen.queryByText("The Rite of Succession")).toBeNull();
  });

  it("renders candidate list from findEligibleSuccessors", () => {
    const rikishi = [makeRikishi("r1", "Hakuho", "h1"), makeRikishi("r2", "Kakuryu", "h1")];
    vi.mocked(DynastyService.findEligibleSuccessors).mockReturnValue(["r1", "r2"]);
    const world = makeWorld({ rikishi });
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={vi.fn()}
        world={world}
        heyaId="h1"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText("Hakuho")).toBeTruthy();
    expect(screen.getByText("Kakuryu")).toBeTruthy();
  });

  it("renders empty-state when no candidates", () => {
    vi.mocked(DynastyService.findEligibleSuccessors).mockReturnValue([]);
    const world = makeWorld();
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={vi.fn()}
        world={world}
        heyaId="h1"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByText(/no Sekitori-ranked pupils or alumni eligible/i)).toBeTruthy();
  });

  it("clicking a candidate selects it (gold highlight)", () => {
    vi.mocked(DynastyService.findEligibleSuccessors).mockReturnValue(["r1"]);
    const world = makeWorld({ rikishi: [makeRikishi("r1", "Hakuho", "h1")] });
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={vi.fn()}
        world={world}
        heyaId="h1"
        onSelect={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Hakuho"));
    // The selected candidate row gets bg-gold/10 class
    const selectedRow = screen.getByText("Hakuho").closest("[class*='bg-gold']");
    expect(selectedRow).toBeTruthy();
  });

  it("Finalize button is disabled until a candidate is selected", () => {
    vi.mocked(DynastyService.findEligibleSuccessors).mockReturnValue(["r1"]);
    const world = makeWorld({ rikishi: [makeRikishi("r1", "Hakuho", "h1")] });
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={vi.fn()}
        world={world}
        heyaId="h1"
        onSelect={vi.fn()}
      />
    );
    const finalizeBtn = screen.getByText("Finalize Succession").closest("button");
    expect(finalizeBtn?.disabled).toBe(true);
    fireEvent.click(screen.getByText("Hakuho"));
    const finalizeBtnAfter = screen.getByText("Finalize Succession").closest("button");
    expect(finalizeBtnAfter?.disabled).toBe(false);
  });

  it("clicking Finalize calls onSelect with the selected id", () => {
    vi.mocked(DynastyService.findEligibleSuccessors).mockReturnValue(["r1"]);
    const world = makeWorld({ rikishi: [makeRikishi("r1", "Hakuho", "h1")] });
    const onSelect = vi.fn();
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={vi.fn()}
        world={world}
        heyaId="h1"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByText("Hakuho"));
    fireEvent.click(screen.getByText("Finalize Succession"));
    expect(onSelect).toHaveBeenCalledWith("r1");
  });

  it("onClose is wired to Dialog onOpenChange", () => {
    vi.mocked(DynastyService.findEligibleSuccessors).mockReturnValue(["r1"]);
    const world = makeWorld({ rikishi: [makeRikishi("r1", "Hakuho", "h1")] });
    const onClose = vi.fn();
    renderWithProvider(
      <SuccessionModal
        isOpen={true}
        onClose={onClose}
        world={world}
        heyaId="h1"
        onSelect={vi.fn()}
      />
    );
    // Radix Dialog fires onOpenChange(false) when ESC or overlay click happens.
    // We simulate by pressing Escape on the dialog content.
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
