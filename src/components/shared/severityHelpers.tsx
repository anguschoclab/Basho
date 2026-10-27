import { Badge } from "@/components/ui/badge";

const SEVERITY_COLORS: Record<string, string> = {
  serious: "text-destructive",
  moderate: "text-gold",
  minor: "text-gold",
};

export function getSeverityColor(severity: string): string {
  return SEVERITY_COLORS[severity] || "text-muted-foreground";
}

const SEVERITY_BADGES: Record<string, React.ReactNode> = {
  serious: <Badge variant="destructive">Serious</Badge>,
  moderate: <Badge className="bg-gold/20 text-gold border-gold/30">Moderate</Badge>,
  minor: <Badge variant="secondary">Minor</Badge>,
};

export function getSeverityBadge(severity: string) {
  return SEVERITY_BADGES[severity] || <Badge variant="outline">Unknown</Badge>;
}
