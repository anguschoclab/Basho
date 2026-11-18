/**
 * GlobalEntitySearch.tsx
 *
 * Always-visible entity search in the TopNavBar — finds rikishi (active and
 * retired) and stables, navigates to /rikishi/$id or /stable/$id. Keyboard:
 * ArrowUp/Down to move, Enter to open, Escape to clear+close. Focused app-wide
 * via "/" or Cmd/Ctrl+K (searchFocusSignal). Below the md breakpoint the input
 * collapses to a Search icon button that expands it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useGame } from "@/state/game/useGame";
import { useIsMobile } from "@/hooks/use-mobile";
import { onFocusGlobalSearch } from "@/components/shared/searchFocusSignal";
import {
  searchEntities,
  type EntitySearchResults,
} from "@/presenters/projections/entitySearchProjections";
import {
  SearchResultsDropdown,
  SearchInputIcon,
  SearchClearButton,
  type FlatOption,
} from "@/components/layout/GlobalEntitySearchSections";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY: EntitySearchResults = {
  rikishi: [],
  retired: [],
  heyas: [],
  oyakata: [],
  staff: [],
  candidates: [],
};

type Navigate = ReturnType<typeof useNavigate>;

/** Flatten all buckets into a single keyboard-navigable option list. */
function buildOptions(results: EntitySearchResults): FlatOption[] {
  return [
    ...results.heyas.map((hit) => ({ kind: "heya" as const, hit })),
    ...results.rikishi.map((hit) => ({ kind: "rikishi" as const, hit })),
    ...results.retired.map((hit) => ({ kind: "rikishi" as const, hit })),
    ...results.oyakata.map((hit) => ({ kind: "oyakata" as const, hit })),
    ...results.staff.map((hit) => ({ kind: "staff" as const, hit })),
    ...results.candidates.map((hit) => ({ kind: "candidate" as const, hit })),
  ];
}

/** Route a selected hit to its destination page. */
function navigateForOption(navigate: Navigate, opt: FlatOption): void {
  switch (opt.kind) {
    case "heya":
      navigate({ to: "/stable/$id", params: { id: opt.hit.id } });
      return;
    case "oyakata":
      navigate({ to: "/oyakata/$oyakataId", params: { oyakataId: opt.hit.id } });
      return;
    case "staff":
      if (opt.hit.isPlayerOwned) navigate({ to: "/stable/staff" });
      else navigate({ to: "/stable/$id", params: { id: opt.hit.heyaId } });
      return;
    case "candidate":
      navigate({
        to: "/jsa/talent",
        search: { pool: opt.hit.pool, focus: opt.hit.candidateId },
      });
      return;
    default:
      navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: opt.hit.id } });
  }
}

export function GlobalEntitySearch() {
  const { state } = useGame();
  const world = state.world;
  const playerHeyaId = state.playerHeyaId ?? world?.playerHeyaId ?? null;
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const inputVisible = !isMobile || mobileOpen;

  // "/" or Cmd/Ctrl+K anywhere focuses the input (and expands it on mobile)
  useEffect(
    () =>
      onFocusGlobalSearch(() => {
        setMobileOpen(true);
        setOpen(true);
        // The input may have just mounted on mobile — defer focus a tick.
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 0);
      }),
    []
  );

  // Close the dropdown when clicking outside the component
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const trimmed = query.trim();
  const results = useMemo(
    () => (open && trimmed && world ? searchEntities(world, trimmed, playerHeyaId) : EMPTY),
    [open, trimmed, world, playerHeyaId]
  );

  const options = useMemo<FlatOption[]>(() => buildOptions(results), [results]);

  const select = (opt: FlatOption) => {
    navigateForOption(navigate, opt);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const clear = () => {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length === 0) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + delta + options.length) % options.length);
      return;
    }
    if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
      e.preventDefault();
      select(options[activeIndex]);
      return;
    }
    if (e.key === "Escape") {
      clear();
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", inputVisible ? "w-56 xl:w-72" : "")}>
      {!inputVisible ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Search"
          onClick={() => {
            setMobileOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <Search className="h-4 w-4" />
        </Button>
      ) : (
        <>
          <SearchInputIcon />
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={open && !!trimmed}
            aria-controls="gs-results"
            aria-activedescendant={activeIndex >= 0 ? `gs-opt-${activeIndex}` : undefined}
            aria-autocomplete="list"
            placeholder="Search wrestlers, elders & more…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => trimmed && setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-8 w-full pl-8 pr-8 text-xs"
          />
          {query && <SearchClearButton onClear={clear} />}

          {open && trimmed && (
            <SearchResultsDropdown
              options={options}
              activeIndex={activeIndex}
              trimmed={trimmed}
              onSelect={select}
              onHover={setActiveIndex}
            />
          )}
        </>
      )}
    </div>
  );
}

export default GlobalEntitySearch;
