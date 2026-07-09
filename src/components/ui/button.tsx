import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { TooltipWrap } from "./tooltip-wrap";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded border text-[12px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 hover:scale-[1.03] active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent font-mono uppercase tracking-wider",
        "primary-gradient":
          "bg-gradient-to-br from-primary to-[hsl(44,68%,40%)] text-primary-foreground border-transparent font-mono uppercase tracking-widest shadow-[0_2px_12px_hsl(var(--primary)/0.35)]",
        destructive:
          "bg-destructive text-destructive-foreground border-transparent font-mono uppercase tracking-wider",
        outline: "border-border bg-background hover:bg-muted/50",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        ghost: "border-transparent hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3",
        lg: "h-11 rounded px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Optional tooltip text or content. */
  tooltip?: React.ReactNode;
  /** Positioning for the tooltip. Defaults to top. */
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, tooltip, tooltipSide = "top", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const derivedProps = { ...props };
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

export { Button, buttonVariants };
