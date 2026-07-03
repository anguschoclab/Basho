export type ResolvedSegment =
  | { type: "text"; content: string }
  | { type: "link"; entityType: string; entityId: string; label: string };

const ENTITY_LINK_REGEX = /\[\[(\w+):([^\]]+):([^\]]+)\]\]/g;

export function parseEntityLinks(text: string): ResolvedSegment[] {
  const segments: ResolvedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  ENTITY_LINK_REGEX.lastIndex = 0;

  while ((match = ENTITY_LINK_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: "link",
      entityType: match[1],
      entityId: match[2],
      label: match[3],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}
