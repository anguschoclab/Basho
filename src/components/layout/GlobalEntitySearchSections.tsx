/**
 * GlobalEntitySearchSections.tsx
 *
 * Dropdown rendering for GlobalEntitySearch — sectioned, keyboard-navigable
 * result rows. Kept separate so GlobalEntitySearch stays within the
 * function-length budget and render logic stays out of the controller.
 */

import { Search, X, Building2, Briefcase, Star } from "lucide-react";
import type {
  RikishiSearchHit,
  HeyaSearchHit,
  OyakataSearchHit,
  StaffSearchHit,
  CandidateSearchHit,
} from "@/presenters/projections/entitySearchProjections";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FlatOption =
  | { kind: "heya"; hit: HeyaSearchHit }
  | { kind: "rikishi"; hit: RikishiSearchHit }
  | { kind: "oyakata"; hit: OyakataSearchHit }
  | { kind: "staff"; hit: StaffSearchHit }
  | { kind: "candidate"; hit: CandidateSearchHit };

function optionGroup(opt: FlatOption): string {
  if (opt.kind === "heya") return "Stables";
  if (opt.kind === "rikishi") return opt.hit.isRetired ? "Retired" : "Wrestlers";
  if (opt.kind === "oyakata") return "Oyakata";
  if (opt.kind === "staff") return "Staff";
  return "Prospects";
}

function optionKey(opt: FlatOption): string {
  return opt.kind === "candidate"
    ? `candidate-${opt.hit.candidateId}`
    : `${opt.kind}-${opt.hit.id}`;
}

function SearchOptionRow({
  opt,
  idx,
  active,
  onSelect,
  onHover,
}: {
  opt: FlatOption;
  idx: number;
  active: boolean;
  onSelect: (opt: FlatOption) => void;
  onHover: (idx: number) => void;
}) {
  return (
    <div
      id={`gs-opt-${idx}`}
      role="option"
      aria-selected={active}
      className={cn(
        "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
        active && "bg-muted"
      )}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(opt)}
      onMouseEnter={() => onHover(idx)}
    >
      {opt.kind === "heya" ? (
        <>
          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{opt.hit.name}</span>
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
            {opt.hit.rikishiCount} wrestlers
          </span>
        </>
      ) : opt.kind === "oyakata" ? (
        <>
          <SumoAvatar avatar={opt.hit.avatar} size="xs" fallback={opt.hit.name} />
          <span className="font-medium truncate">{opt.hit.name}</span>
          {opt.hit.isEmeritus && (
            <Badge variant="secondary" className="shrink-0">
              Emeritus
            </Badge>
          )}
          {opt.hit.isCaretaker && (
            <Badge variant="outline" className="shrink-0">
              Caretaker
            </Badge>
          )}
          {opt.hit.archetypeLabel && (
            <span className="text-[10px] text-muted-foreground shrink-0 capitalize hidden md:inline">
              {opt.hit.archetypeLabel.replace(/_/g, " ")}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline ml-auto">
            {opt.hit.heyaName}
          </span>
          {opt.hit.isPlayerOwned && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Your stable" />
          )}
        </>
      ) : opt.kind === "staff" ? (
        <>
          <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium truncate">{opt.hit.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{opt.hit.roleLabel}</span>
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline ml-auto">
            {opt.hit.heyaName}
          </span>
          {opt.hit.isPlayerOwned && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Your stable" />
          )}
        </>
      ) : opt.kind === "candidate" ? (
        <>
          <SumoAvatar avatar={opt.hit.avatar} size="xs" fallback={opt.hit.name} />
          <span className="font-medium truncate">{opt.hit.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {opt.hit.poolLabel} · {opt.hit.age}
          </span>
          {opt.hit.isAmateurStar && (
            <Badge variant="secondary" className="shrink-0">
              <Star className="h-2.5 w-2.5 mr-0.5" />
              Star
            </Badge>
          )}
          {opt.hit.isForeign && (
            <Badge variant="outline" className="shrink-0">
              Foreign
            </Badge>
          )}
        </>
      ) : (
        <>
          <SumoAvatar avatar={opt.hit.avatar} size="xs" fallback={opt.hit.shikona} />
          <span className="font-medium truncate">{opt.hit.shikona}</span>
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
            {opt.hit.rankLabel}
          </span>
          <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
            {opt.hit.heyaName}
          </span>
          {opt.hit.isRetired && (
            <Badge variant="secondary" className="shrink-0">
              Retired
            </Badge>
          )}
          {opt.hit.isPlayerOwned && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Your stable" />
          )}
        </>
      )}
    </div>
  );
}

export function SearchResultsDropdown({
  options,
  activeIndex,
  trimmed,
  onSelect,
  onHover,
}: {
  options: FlatOption[];
  activeIndex: number;
  trimmed: string;
  onSelect: (opt: FlatOption) => void;
  onHover: (idx: number) => void;
}) {
  return (
    <div
      id="gs-results"
      role="listbox"
      className="absolute top-full mt-1 left-0 right-0 z-50 max-h-80 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
    >
      {options.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
          No matches for &ldquo;{trimmed}&rdquo;
        </div>
      ) : (
        options.map((opt, idx) => {
          const group = optionGroup(opt);
          const showHeader = idx === 0 || optionGroup(options[idx - 1]) !== group;
          return (
            <div key={optionKey(opt)}>
              {showHeader && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {group}
                </div>
              )}
              <SearchOptionRow
                opt={opt}
                idx={idx}
                active={idx === activeIndex}
                onSelect={onSelect}
                onHover={onHover}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

export function SearchInputIcon() {
  return (
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
  );
}

export function SearchClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      aria-label="Clear search"
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
