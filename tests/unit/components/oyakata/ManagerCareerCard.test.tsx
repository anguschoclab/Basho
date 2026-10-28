import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ManagerCareerCard } from "@/components/oyakata/ManagerCareerCard";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { Oyakata } from "@/engine/types/oyakata";

describe("ManagerCareerCard", () => {
  it("renders tenure stats, election standing, and milestone list", () => {
    const world = makeMockWorld({ year: 2030 });
    const heya = makeMockHeya("h1", { politicalCapital: 90, reputation: 80 });
    heya.oyakataId = "o1" as never;
    world.heyas.set("h1", heya);
    world.oyakata.set("o1" as never, {
      id: "o1", heyaId: "h1",
      tenure: { startedYear: 2025, bashoServed: 30, championships: 4, sekitoriProduced: 6, insolvencyEvents: 0, majorScandals: 0, forcedMergers: 0, boardSeatsWon: 1 },
    } as unknown as Oyakata);
    render(<ManagerCareerCard world={world} heyaId={"h1" as never} />);
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getAllByText(/Chairman/i).length).toBeGreaterThan(0);
  });

  it("empty-tenure state renders career-just-begun copy", () => {
    const world = makeMockWorld();
    const heya = makeMockHeya("h1");
    world.heyas.set("h1", heya);
    render(<ManagerCareerCard world={world} heyaId={"h1" as never} />);
    expect(screen.getByText(/just begun/i)).toBeTruthy();
  });
});
