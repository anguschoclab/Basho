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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserMinus, GraduationCap } from "lucide-react";
import type { Rikishi } from "@/engine/types/rikishi";
import { MentorshipService } from "@/engine/systems/training/MentorshipService";

/**
 * Props for MentorAssignmentPanel component.
 */
export interface MentorAssignmentPanelProps {
  /** The apprentice rikishi ID. */
  apprenticeId: string;
  /** The current mentor ID (undefined if no mentor). */
  mentorId: string | undefined;
  /** Array of rikishi in the apprentice's heya for mentor selection. */
  roster: Rikishi[];
  /** Callback when a mentor is assigned. */
  onAssignMentor: (mentorId: string) => void;
  /** Callback when a mentor is removed. */
  onRemoveMentor: () => void;
}

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
  roster,
  onAssignMentor,
  onRemoveMentor,
}: MentorAssignmentPanelProps): JSX.Element {
  /**
   * Filter eligible mentors from the heya roster.
   * Uses MentorshipService.canMentor so the UI and engine share one source of truth.
   */
  const apprentice = useMemo(() => roster.find((r) => r.id === apprenticeId), [roster, apprenticeId]);

  const eligibleMentors = useMemo(() => {
    const results: Rikishi[] = [];
    if (!apprentice) return results;
    for (const r of roster) {
      if (MentorshipService.canMentor(r, apprentice)) {
        results.push(r);
      }
    }
    return results;
  }, [roster, apprentice]);

  /**
   * Get the current mentor rikishi object.
   */
  const currentMentor = mentorId ? roster.find((r) => r.id === mentorId) : undefined;

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
            aria-label="Remove mentor"
            tooltip="Remove mentor"
            tooltipSide="top"
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
                <div className="p-2 text-xs text-muted-foreground">No eligible mentors</div>
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
