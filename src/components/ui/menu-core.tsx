import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export const withMenuItem = <P extends React.ElementType>(ItemPrimitive: P) =>
  React.forwardRef<
    React.ElementRef<P>,
    React.ComponentPropsWithoutRef<P> & {
      inset?: boolean;
    }
  >(({ className, inset, ...props }, ref) => {
    const Component = ItemPrimitive as React.ElementType;
    return (
      <Component
        ref={ref}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
          inset && "pl-8",
          className
        )}
        {...props}
      />
    );
  });

export const withMenuCheckboxItem = <P extends React.ElementType, I extends React.ElementType>(
  CheckboxItemPrimitive: P,
  ItemIndicatorPrimitive: I
) =>
  React.forwardRef<
    React.ElementRef<P>,
    React.ComponentPropsWithoutRef<P> & { checked?: boolean | "indeterminate" }
  >(({ className, children, checked, ...props }, ref) => {
    const Component = CheckboxItemPrimitive as React.ElementType;
    const Indicator = ItemIndicatorPrimitive as React.ElementType;
    return (
      <Component
        ref={ref}
        className={cn(
          "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
          className
        )}
        checked={checked}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Indicator>
            <Check className="h-4 w-4" />
          </Indicator>
        </span>
        {children}
      </Component>
    );
  });

export const withMenuRadioItem = <P extends React.ElementType, I extends React.ElementType>(
  RadioItemPrimitive: P,
  ItemIndicatorPrimitive: I
) =>
  React.forwardRef<React.ElementRef<P>, React.ComponentPropsWithoutRef<P>>(
    ({ className, children, ...props }, ref) => {
      const Component = RadioItemPrimitive as React.ElementType;
      const Indicator = ItemIndicatorPrimitive as React.ElementType;
      return (
        <Component
          ref={ref}
          className={cn(
            "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Indicator>
              <Circle className="h-2 w-2 fill-current" />
            </Indicator>
          </span>
          {children}
        </Component>
      );
    }
  );
