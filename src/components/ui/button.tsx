import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { TooltipWrap } from "./tooltip-wrap";
import { buttonVariants } from "./button-variants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Optional tooltip text or content. */
  tooltip?: React.ReactNode;
  /** Positioning for the tooltip. Defaults to top. */
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      tooltip,
      tooltipSide = "top",
      type = "button",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const derivedProps = { type, ...props };
    if (!derivedProps["aria-label"] && typeof tooltip === "string" && tooltip.trim().length > 0) {
      derivedProps["aria-label"] = tooltip;
    }

    const button = (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...derivedProps}
      />
    );

    if (tooltip) {
      if (props.disabled) {
        // Native disabled elements swallow pointer events in browsers.
        // We wrap disabled buttons in a span that has cursor-not-allowed so the tooltip triggers properly.
        return (
          <TooltipWrap content={tooltip} side={tooltipSide}>
            <span className="inline-block cursor-not-allowed">
              <Comp
                className={cn(buttonVariants({ variant, size, className }), "pointer-events-none")}
                ref={ref}
                {...derivedProps}
              />
            </span>
          </TooltipWrap>
        );
      }
      return (
        <TooltipWrap content={tooltip} side={tooltipSide}>
          {button}
        </TooltipWrap>
      );
    }

    return button;
  }
);
Button.displayName = "Button";

export { Button };
