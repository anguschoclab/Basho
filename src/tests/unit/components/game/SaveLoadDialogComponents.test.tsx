import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SaveSlotItem, EmptySlotItem } from "@/components/game/SaveLoadDialogComponents";
import type { SaveSlotInfo } from "@/presenters/engineAccess";

const slot: SaveSlotInfo = {
  key: "basho_save_slot_1",
  slotName: "slot_1",
  year: 2024,
  playerHeyaName: "Miyagino",
  savedAt: "2024-01-15T10:00:00Z",
  version: "1.4.0",
  isAutosave: false,
};

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("SaveSlotItem", () => {
  it("pressing Enter loads the slot in load mode", () => {
    const onLoad = vi.fn();
    renderWithProvider(
      <SaveSlotItem slot={slot} mode="load" onLoad={onLoad} onSave={vi.fn()} onDelete={vi.fn()} />
    );
    fireEvent.keyDown(screen.getByLabelText("Load save slot slot_1"), { key: "Enter" });
    expect(onLoad).toHaveBeenCalledWith("slot_1");
  });

  it("pressing Space saves to the slot in save mode", () => {
    const onSave = vi.fn();
    renderWithProvider(
      <SaveSlotItem slot={slot} mode="save" onLoad={vi.fn()} onSave={onSave} onDelete={vi.fn()} />
    );
    fireEvent.keyDown(screen.getByLabelText("Save to slot slot_1"), { key: " " });
    expect(onSave).toHaveBeenCalledWith("slot_1");
  });
});

describe("EmptySlotItem", () => {
  it("pressing Enter saves to the empty slot", () => {
    const onSave = vi.fn();
    renderWithProvider(<EmptySlotItem slotName="slot_2" onSave={onSave} />);
    fireEvent.keyDown(screen.getByLabelText("Save to empty slot slot_2"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("slot_2");
  });
});
