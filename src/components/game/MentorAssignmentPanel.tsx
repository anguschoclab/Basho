/**
 * src/components/game/MentorAssignmentPanel.tsx
 * =================================================
 * UI component for assigning and removing mentors from rikishi.
 *
 * Responsibilities:
 * - Display current mentor badge if rikishi has a mentor
 * - Provide dropdown of eligible mentors for assignment
 * - Handle mentor assignment and removal actions
 * - Filter mentors by eligibility (juryo+, same heya, not injured/retired)
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, GraduationCap } from "lucide-react";
import type { Rikishi } from "@/engine/types/rikishi";

/**
 * Props for MentorAssignmentPanel component.
 */
export interface MentorAssignmentPanelProps {
  /** The apprentice rikishi ID. */
  apprenticeId: string;
  /** The current mentor ID (undefined if no mentor). */
  mentorId: string | undefined;
  /** The heya ID for filtering eligible mentors. */
  heyaId: string;
  /** Map of all rikishi in the world for mentor selection. */
  allRikishi: Map<string, Rikishi>;
  /** Callback when a mentor is assigned. */
  onAssignMentor: (mentorId: string) => void;
  /** Callback when a mentor is removed. */
  onRemoveMentor: () => void;
}

/**
 * Minimum ranks required for mentor eligibility.
 */
const MENTOR_MIN_RANKS = new Set([
  "juryo",
  "maegashira",
  "komusubi",
  "sekiwake",
  "ozeki",
  "yokozuna",
]);

/**
 * MentorAssignmentPanel component.
 *
 * Displays the current mentor status and provides UI for assigning/removing mentors.
 * Eligible mentors are filtered to sekitori in the same heya who are not injured or retired.
 *
 * @param {MentorAssignmentPanelProps} props - Component props.
 * @returns {JSX.Element} The rendered mentor assignment panel.
 *
 * @example
 * ```tsx
 * <MentorAssignmentPanel
 *   apprenticeId="app1"
 *   mentorId="mentor1"
 *   heyaId="heya1"
 *   allRikishi={world.rikishi}
 *   onAssignMentor={(id) => dispatch(assignMentor(id, apprenticeId))}
 *   onRemoveMentor={() => dispatch(removeMentor(apprenticeId))}
 * />
 * ```
 */
export function MentorAssignmentPanel({
  apprenticeId,
  mentorId,
  heyaId,
  allRikishi,
  onAssignMentor,
  onRemoveMentor,
}: MentorAssignmentPanelProps): JSX.Element {
  /**
   * Filter eligible mentors from all rikishi.
   * Mentors must be sekitori, in the same heya, and not injured/retired.
   */
  const eligibleMentors = useMemo(() => {
    return Array.from(allRikishi.values()).filter((r) => {
      // Must be sekitori
      if (!MENTOR_MIN_RANKS.has(r.rank)) return false;

      // Must be in same heya
      if (r.heyaId !== heyaId) return false;

      // Cannot be the apprentice
      if (r.id === apprenticeId) return false;

      // Must be active (not injured or retired)
      if (r.injured || r.isRetired === true) return false;

      return true;
    });
  }, [allRikishi, heyaId, apprenticeId]);

  /**
   * Get the current mentor rikishi object.
   */
  const currentMentor = mentorId ? allRikishi.get(mentorId) : undefined;

  return (
    <div className="flex flex-col gap-2 p-3 bg-muted/30 rounded border">
      <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
        <GraduationCap className="h-3.5 w-3.5" />
        Mentorship
      </div>

      {currentMentor ? (
        /**
         * Display current mentor with remove option.
         */
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-xs">
            Mentor: {currentMentor.shikona} ({currentMentor.rank})
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveMentor}
            className="h-7 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
            title="Remove mentor"
          >
            <UserMinus className="h-3 w-3 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        /**
         * Display mentor selection dropdown.
         */
        <div className="flex items-center gap-2">
          <Select onValueChange={onAssignMentor}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Assign mentor..." />
            </SelectTrigger>
            <SelectContent>
              {eligibleMentors.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">
                  No eligible mentors
                </div>
              ) : (
                eligibleMentors.map((mentor) => (
                  <SelectItem key={mentor.id} value={mentor.id} className="text-xs">
                    {mentor.shikona} ({mentor.rank})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {eligibleMentors.length === 0 && !currentMentor && (
        /**
         * Helper text when no mentors are available.
         */
        <div className="text-[10px] text-muted-foreground italic">
          Requires a sekitori in the same heya
        </div>
      )}
    </div>
  );
}
