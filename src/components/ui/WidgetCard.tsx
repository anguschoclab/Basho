/**
 * WidgetCard.tsx
 * ==============
 * Consistent card wrapper for dashboard widgets and page content.
 * Follows Kokugikan Noir design system.
 */

import { cn } from "@/lib/utils";

interface WidgetCardProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  hover?: boolean;
  variant?: "default" | "paper" | "glass";
}

const sizeClasses: Record<string, string> = {
  sm: "xl:col-span-3 md:col-span-2 col-span-1",
  md: "xl:col-span-4 md:col-span-2 col-span-1",
  lg: "xl:col-span-6 md:col-span-2 col-span-1",
  xl: "xl:col-span-8 md:col-span-4 col-span-1",
  full: "col-span-full",
};

const variantClasses: Record<string, string> = {
  default: "bg-card border border-border rounded",
  paper: "paper rounded",
  glass: "glass paper rounded",
};

export function WidgetCard({
  children,
  className,
  size = "md",
  hover = false,
  variant = "default",
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex flex-col h-full overflow-hidden transition-all duration-300",
        variantClasses[variant],
        hover && "hover:shadow-lg hover:border-primary/20",
        className
      )}
    >
      {children}
    </div>
  );
}
