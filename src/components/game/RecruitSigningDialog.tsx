// RecruitSigningDialog.tsx — Confirmation dialog for signing a prospect to your stable

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, GraduationCap, Globe, School } from "lucide-react";

/** Defines the structure for recruit signing dialog props. */
interface RecruitSigningDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  candidate: {
    shikona?: string;
    candidateId: string;
    nationality?: string;
    age?: number;
    poolType?: string;
    archetype?: string;
    height?: number;
    weight?: number;
    visibilityBand?: string;
  } | null;
  playerHeyaName?: string;
  rosterSize?: number;
}

const POOL_ICONS: Record<string, React.ReactNode> = {
  high_school: <School className="h-4 w-4" />,
  university: <GraduationCap className="h-4 w-4" />,
  foreign: <Globe className="h-4 w-4" />,
};

/**
 * recruit signing dialog.
 *  * @param {
 *   open,
 *   onConfirm,
 *   onCancel,
 *   candidate,
 *   playerHeyaName,
 *   rosterSize,
 * } - The {
 *   open,
 *   on confirm,
 *   on cancel,
 *   candidate,
 *   player heya name,
 *   roster size,
 * }.
 */
export function RecruitSigningDialog({
  open,
  onConfirm,
  onCancel,
  candidate,
  playerHeyaName,
  rosterSize,
}: RecruitSigningDialogProps) {
  if (!candidate) return null;

  const name = candidate.visibilityBand === "obscure"
    ? "Unknown Prospect"
    : candidate.shikona || candidate.candidateId.slice(0, 8);

  const poolLabel = candidate.poolType?.replace("_", " ") ?? "recruit";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Sign {name}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You are about to submit an offer to recruit <strong>{name}</strong> to{" "}
                <strong>{playerHeyaName || "your stable"}</strong>.
              </p>

              <div className="flex flex-wrap gap-2">
                {candidate.poolType && (
                  <Badge variant="outline" className="gap-1 capitalize">
                    {POOL_ICONS[candidate.poolType]}
                    {poolLabel}
                  </Badge>
                )}
                {candidate.nationality && (
                  <Badge variant="outline">{candidate.nationality}</Badge>
                )}
                {candidate.age && (
                  <Badge variant="outline">Age {candidate.age}</Badge>
                )}
                {candidate.archetype && (
                  <Badge variant="secondary" className="capitalize">
                    {candidate.archetype.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>

              {candidate.height && candidate.weight && (
                <p className="text-xs text-muted-foreground">
                  Physical: {Math.round(candidate.height)}cm / {Math.round(candidate.weight)}kg
                </p>
              )}

              {rosterSize !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Current roster: {rosterSize} rikishi. The recruit will start at the bottom of the banzuke.
                </p>
              )}

              <p className="text-xs text-muted-foreground italic">
                Once signed, the prospect will join your stable and begin training. 
                Their development depends on your facilities and coaching.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Sign to Stable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
