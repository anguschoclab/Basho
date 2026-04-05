import { TooltipWrap } from "@/components/ui/tooltip-wrap";

export function AttrChip({
  label,
  attr,
}: {
  label: string;
  attr: { value: string; confidence: string; narrative: string };
}) {
  const isUnknown = attr.confidence === "unknown";
  return (
    <TooltipWrap content={attr.narrative}>
      <div className="flex items-center gap-1 cursor-help">
        <span className="text-muted-foreground">{label}:</span>
        <span
          className={
            isUnknown
              ? "text-muted-foreground/50 italic"
              : attr.confidence === "low"
                ? "text-muted-foreground"
                : "text-foreground"
          }
        >
          {isUnknown ? "?" : attr.value}
        </span>
      </div>
    </TooltipWrap>
  );
}
