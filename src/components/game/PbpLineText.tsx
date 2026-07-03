import { ClickableName } from "@/components/ClickableName";
import { parseEntityLinks, type ResolvedSegment } from "@/presenters/entityLinks";
import { cn } from "@/lib/utils";

interface PbpLineTextProps {
  text: string;
  className?: string;
}

function renderSegment(seg: ResolvedSegment, key: number) {
  if (seg.type === "text") {
    return <span key={key}>{seg.content}</span>;
  }

  const typeMap: Record<string, "rikishi" | "stable" | "oyakata"> = {
    rikishi: "rikishi",
    stable: "stable",
    heya: "stable",
    oyakata: "oyakata",
  };

  const clickableType = typeMap[seg.entityType] ?? "rikishi";

  return (
    <ClickableName
      key={key}
      type={clickableType}
      id={seg.entityId}
      name={seg.label}
    >
      {seg.label}
    </ClickableName>
  );
}

export function PbpLineText({ text, className }: PbpLineTextProps) {
  const segments = parseEntityLinks(text);
  return <span className={cn(className)}>{segments.map(renderSegment)}</span>;
}
