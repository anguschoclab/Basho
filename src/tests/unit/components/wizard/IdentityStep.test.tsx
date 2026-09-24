import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IdentityStep } from "@/components/wizard/IdentityStep";
import { OYAKATA_BACKSTORIES } from "@/constants/ui/wizard";
import { TooltipProvider } from "@/components/ui/tooltip";

const renderWithProviders = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe("IdentityStep", () => {
  const defaultProps = {
    oyakataName: "",
    background: OYAKATA_BACKSTORIES[0].id,
    onNameChange: vi.fn(),
    onBackgroundChange: vi.fn(),
    onRandomName: vi.fn(),
    onNext: vi.fn(),
  };

  it("renders the IdentityStep component", () => {
    renderWithProviders(<IdentityStep {...defaultProps} />);
    expect(screen.getByText("Establish Your Identity")).toBeTruthy();
  });

  it("calls onNameChange when input value changes", () => {
    renderWithProviders(<IdentityStep {...defaultProps} />);
    const input = screen.getByRole("textbox", { name: /Official Elder Name/i });
    fireEvent.change(input, { target: { value: "New Name" } });
    expect(defaultProps.onNameChange).toHaveBeenCalledWith("New Name");
  });

  it("calls onRandomName when random name button is clicked", () => {
    renderWithProviders(<IdentityStep {...defaultProps} />);
    const button = screen.getByRole("button", { name: /Generate random name/i });
    fireEvent.click(button);
    expect(defaultProps.onRandomName).toHaveBeenCalled();
  });

  it("calls onBackgroundChange when a backstory is clicked", () => {
    renderWithProviders(<IdentityStep {...defaultProps} />);
    const secondBackstory = OYAKATA_BACKSTORIES[1];
    const backstoryElement = screen.getByText(secondBackstory.label);
    fireEvent.click(backstoryElement);
    expect(defaultProps.onBackgroundChange).toHaveBeenCalledWith(secondBackstory.id);
  });
});
