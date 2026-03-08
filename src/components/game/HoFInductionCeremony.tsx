// HoFInductionCeremony.tsx — Hall of Fame induction narrative ceremony
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Trophy, Award, Shield, Target, Star, Scroll } from "lucide-react";
import type { HoFInductee, HoFCategory } from "@/engine/hallOfFame";
import type { WorldState } from "@/engine/types";

const CATEGORY_CEREMONY: Record<HoFCategory, { icon: React.ElementType; color: string; titleJa: string }> = {
  champion: { icon: Trophy, color: "text-amber-400", titleJa: "殿堂入り" },
  iron_man: { icon: Shield, color: "text-blue-400", titleJa: "鉄人殿堂" },
  technician: { icon: Target, color: "text-emerald-400", titleJa: "技能殿堂" },
};

const CEREMONY_STEPS: Record<HoFCategory, string[]> = {
  champion: [
    "The great hall falls silent as the drums begin their solemn rhythm.",
    "The announcer's voice echoes through the Kokugikan: 'We gather today to honor a true champion.'",
    "A career of dominance, crowned by multiple Emperor's Cups. The hallmark of a grand champion.",
    "The portrait is unveiled — forever enshrined among the immortals of sumo.",
    "The crowd erupts in applause. A legend takes their place in history.",
  ],
  iron_man: [
    "The ceremony begins with a review of an extraordinary career of endurance.",
    "'Thirty consecutive tournaments without absence — a feat of iron will and unbreakable spirit.'",
    "Through injury, through adversity, this warrior never wavered.",
    "The Iron Man plaque is mounted in the hall of eternal warriors.",
    "A standing ovation for the embodiment of perseverance.",
  ],
  technician: [
    "The master of technique enters the hall to respectful applause.",
    "'Three Ginō-shō awards — each a testament to the artistry of sumo.'",
    "Where others relied on brute force, this wrestler elevated the sport with skill and cunning.",
    "The Technique Master's scroll is presented with traditional honors.",
    "Future generations will study these movements for years to come.",
  ],
};

interface Props {
  inductee: HoFInductee;
  world: WorldState;
  open: boolean;
  onClose: () => void;
}

export function HoFInductionCeremony({ inductee, world, open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const ceremony = CATEGORY_CEREMONY[inductee.category];
  const steps = CEREMONY_STEPS[inductee.category];
  const CatIcon = ceremony.icon;
  const rikishi = world.rikishi.get(inductee.rikishiId);
  const heya = rikishi?.heyaId ? world.heyas.get(rikishi.heyaId) : null;
  const isPlayerRikishi = rikishi?.heyaId === world.playerHeyaId;

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <CatIcon className={`h-5 w-5 ${ceremony.color}`} />
            {ceremony.titleJa} — Hall of Fame Induction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inductee card */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-muted/80 to-muted/30 border">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center bg-background border-2`}>
              <CatIcon className={`h-8 w-8 ${ceremony.color}`} />
            </div>
            <div>
              <p className="text-xl font-display font-bold">{inductee.shikona}</p>
              <p className="text-sm text-muted-foreground">
                {heya ? <StableName id={heya.id} name={heya.name} /> : ""}
                {" • "}Inducted {inductee.inductionYear}
              </p>
              <div className="flex gap-2 mt-1">
                {inductee.stats.yushoCount && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Trophy className="h-3 w-3" /> {inductee.stats.yushoCount} Yūshō
                  </Badge>
                )}
                {inductee.stats.consecutiveBasho && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Shield className="h-3 w-3" /> {inductee.stats.consecutiveBasho} Basho
                  </Badge>
                )}
                {inductee.stats.ginoShoCount && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Target className="h-3 w-3" /> {inductee.stats.ginoShoCount} Ginō-shō
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Narrative */}
          <div className="min-h-[80px] p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
              <Scroll className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed italic">{steps[step]}</p>
            </div>
          </div>

          {/* Final step: career summary */}
          {step === steps.length - 1 && (
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-center">
              <p className="font-display text-lg font-bold">
                {inductee.shikona} — Immortalized
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Career: {inductee.stats.careerWins ?? 0}W - {inductee.stats.careerLosses ?? 0}L
                {inductee.stats.highestRank && ` • Highest: ${inductee.stats.highestRank}`}
              </p>
              {isPlayerRikishi && (
                <Badge className="mt-2 bg-primary">Your stable's pride!</Badge>
              )}
            </div>
          )}

          <Button onClick={handleNext} className="w-full">
            {step < steps.length - 1 ? "Continue" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
