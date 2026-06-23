/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroDossier } from "@/components/layout/control-center/HeroDossier";

// Mock KanjiTile to isolate HeroDossier logic
vi.mock("@/components/layout/control-center/KanjiTile", () => ({
  KanjiTile: ({ char, tone, size }: { char: string; tone?: string; size?: string }) => (
    <span data-testid="kanji-tile" data-char={char} data-tone={tone} data-size={size}>
      {char}
    </span>
  ),
}));

describe("HeroDossier", () => {
  it("renders eyebrow, title, and body text", () => {
    render(
      <HeroDossier kanji="横" eyebrow="Opportunity" title="Promotion Available" body="You can promote a rikishi." />
    );
    expect(screen.getByText("Opportunity")).toBeTruthy();
    expect(screen.getByText("Promotion Available")).toBeTruthy();
    expect(screen.getByText("You can promote a rikishi.")).toBeTruthy();
  });

  it("renders two KanjiTile instances (decorative + sm tile)", () => {
    render(<HeroDossier kanji="横" eyebrow="E" title="T" body="B" />);
    const tiles = screen.getAllByTestId("kanji-tile");
    expect(tiles).toHaveLength(2);
  });

  it("passes correct char, tone, and size to KanjiTile instances", () => {
    render(<HeroDossier kanji="危" eyebrow="E" title="T" body="B" tone="vermillion" />);
    const tiles = screen.getAllByTestId("kanji-tile");
    const decorative = tiles[0];
    const smTile = tiles[1];
    expect(decorative.getAttribute("data-char")).toBe("危");
    expect(decorative.getAttribute("data-tone")).toBe("vermillion");
    expect(decorative.getAttribute("data-size")).toBe("lg");
    expect(smTile.getAttribute("data-char")).toBe("危");
    expect(smTile.getAttribute("data-tone")).toBe("vermillion");
    expect(smTile.getAttribute("data-size")).toBe("sm");
  });

  it("renders CTA slot when provided", () => {
    render(
      <HeroDossier
        kanji="横"
        eyebrow="E"
        title="T"
        body="B"
        cta={<button data-testid="cta-btn">Act Now</button>}
      />
    );
    expect(screen.getByTestId("cta-btn")).toBeTruthy();
  });

  it("does not render CTA slot when absent", () => {
    const { container } = render(<HeroDossier kanji="横" eyebrow="E" title="T" body="B" />);
    expect(container.querySelector(".pt-2")).toBeNull();
  });

  it("applies gold tone classes by default", () => {
    const { container } = render(<HeroDossier kanji="横" eyebrow="E" title="T" body="B" />);
    const dossier = container.firstChild as HTMLElement;
    expect(dossier.classList.contains("from-gold/10")).toBe(true);
    expect(dossier.classList.contains("to-gold/5")).toBe(true);
    expect(dossier.classList.contains("border-gold/30")).toBe(true);
  });

  it("applies vermillion tone classes", () => {
    const { container } = render(
      <HeroDossier kanji="横" eyebrow="E" title="T" body="B" tone="vermillion" />
    );
    const dossier = container.firstChild as HTMLElement;
    expect(dossier.classList.contains("from-east/10")).toBe(true);
    expect(dossier.classList.contains("to-east/5")).toBe(true);
    expect(dossier.classList.contains("border-east/30")).toBe(true);
  });

  it("applies indigo tone classes", () => {
    const { container } = render(
      <HeroDossier kanji="横" eyebrow="E" title="T" body="B" tone="indigo" />
    );
    const dossier = container.firstChild as HTMLElement;
    expect(dossier.classList.contains("from-west/10")).toBe(true);
    expect(dossier.classList.contains("to-west/5")).toBe(true);
    expect(dossier.classList.contains("border-west/30")).toBe(true);
  });

  it("applies gold tone label class to eyebrow by default", () => {
    render(<HeroDossier kanji="横" eyebrow="Gold Eyebrow" title="T" body="B" />);
    const eyebrow = screen.getByText("Gold Eyebrow");
    expect(eyebrow.classList.contains("text-gold")).toBe(true);
  });

  it("applies vermillion tone label class to eyebrow", () => {
    render(<HeroDossier kanji="横" eyebrow="Vermillion Eyebrow" title="T" body="B" tone="vermillion" />);
    const eyebrow = screen.getByText("Vermillion Eyebrow");
    expect(eyebrow.classList.contains("text-east")).toBe(true);
  });

  it("applies indigo tone label class to eyebrow", () => {
    render(<HeroDossier kanji="横" eyebrow="Indigo Eyebrow" title="T" body="B" tone="indigo" />);
    const eyebrow = screen.getByText("Indigo Eyebrow");
    expect(eyebrow.classList.contains("text-west")).toBe(true);
  });

  it("merges custom className onto container", () => {
    const { container } = render(
      <HeroDossier kanji="横" eyebrow="E" title="T" body="B" className="custom-class" />
    );
    const dossier = container.firstChild as HTMLElement;
    expect(dossier.classList.contains("custom-class")).toBe(true);
  });
});
