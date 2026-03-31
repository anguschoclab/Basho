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
import { UserPlus, GraduationCap, Globe, School, Send } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/** Defines the structure for recruit signing dialog props. */
interface RecruitSigningDialogProps {
  open: boolean;
  onConfirm: (offer: { offerType: "standard" | "aggressive", interest: "low" | "medium" | "high" | "all_in" }) => void;
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
  const [offerType, setOfferType] = useState<"standard" | "aggressive">("standard");
  const [interest, setInterest] = useState<"low" | "medium" | "high" | "all_in">("medium");

  if (!candidate) return null;

  const name = candidate.visibilityBand === "hidden"
    ? "Unknown Prospect"
    : candidate.shikona || candidate.candidateId.slice(0, 8);

  const poolLabel = candidate.poolType?.replace("_", " ") ?? "recruit";

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Recruitment Offer: {name}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-foreground/80">
                Submit a formal offer to recruit <strong>{name}</strong> to{" "}
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
              </div>

              {/* Offer Controls */}
              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Offer Strategy</Label>
                  <Select value={offerType} onValueChange={(v: any) => setOfferType(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Offer</SelectItem>
                      <SelectItem value="aggressive">Aggressive Pursuit (+Cost)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider">Interest Level</Label>
                  <Select value={interest} onValueChange={(v: any) => setInterest(v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Testing waters)</SelectItem>
                      <SelectItem value="medium">Medium (Standard)</SelectItem>
                      <SelectItem value="high">High (Strong interest)</SelectItem>
                      <SelectItem value="all_in">All In (Maximum commitment)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {rosterSize !== undefined && (
                <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
                  Stable roster: {rosterSize} rikishi. Negotiation may take 1-2 weeks.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel>Withdraw</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onConfirm({ offerType, interest })}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Submit Offer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
