import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipWrapProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  className?: string;
}

/**
 * A reusable wrapper to provide consistent tooltips with standard 500ms delay.
 * quality over speed: handles asChild correctly for Radix triggers.
 */
export const TooltipWrap = React.forwardRef<HTMLDivElement, TooltipWrapProps>(
  function TooltipWrap(
    { children, content, side = "top", align = "center", delayDuration = 500, className },
    ref,
  ) {
    if (!content) {
      if (ref && React.isValidElement(children)) {
        return React.cloneElement(
          children as React.ReactElement<{ ref?: React.Ref<unknown> }>,
          { ref },
        );
      }
      return <>{children}</>;
    }

    return (
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className={className}>
          {content}
        </TooltipContent>
      </Tooltip>
    );
  },
);
TooltipWrap.displayName = "TooltipWrap";
