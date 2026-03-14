// YokozunaDeliberation.tsx — Yokozuna Deliberation Council narrative scene
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Crown, Scale, Users, Star, Scroll } from "lucide-react";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

interface DeliberationProps {
  rikishi: Rikishi;
  world: WorldState;
  open: boolean;
  onClose: () => void;
  verdict: "promoted" | "denied" | "deferred";
  reasoning: string[];
}

const ELDER_NAMES = [
  "Chairman Tokitsukaze",
  "Director Kasugano",
  "Director Dewanoumi",
  "Advisor Sadogatake",
  "Elder Miyagino",
];

const DELIBERATION_DIALOGUE = {
  promoted: [
    "The council has convened to deliberate on the promotion to Yokozuna.",
    "After careful review of recent tournament performances...",
    "The candidate has demonstrated hinkaku — the dignity befitting a Yokozuna.",
    "By unanimous decision, the council recommends promotion.",
    "Let the drum sound. A new Yokozuna is born.",
  ],
  denied: [
    "The council has convened to deliberate on the promotion to Yokozuna.",
    "While the recent results are impressive...",
    "The council feels the candidate needs to demonstrate more consistency.",
    "The deliberation concludes without a recommendation for promotion.",
    "The door remains open for future consideration.",
  ],
  deferred: [
    "The council has convened to deliberate on the promotion to Yokozuna.",
    "The candidate's results warrant attention...",
    "However, the council wishes to observe one more tournament.",
    "A decision will be deferred until the next basho.",
    "Continue to demonstrate the dignity of a grand champion.",
  ],
};

export function YokozunaDeliberation({ rikishi, world, open, onClose, verdict, reasoning }: DeliberationProps) {
  const [dialogueStep, setDialogueStep] = useState(0);
  const dialogue = DELIBERATION_DIALOGUE[verdict];
  const heya = world.heyas.get(rikishi.heyaId);
  const isPlayerRikishi = rikishi.heyaId === world.playerHeyaId;

  const handleNext = () => {
    if (dialogueStep < dialogue.length - 1) {
      setDialogueStep(dialogueStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Crown className="h-5 w-5 text-amber-400" />
            横綱審議委員会
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Yokozuna Deliberation Council</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Candidate */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="h-14 w-14 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-display font-bold">
                <RikishiName id={rikishi.id} name={rikishi.shikona} />
              </p>
              <p className="text-sm text-muted-foreground">
                {heya ? <StableName id={heya.id} name={heya.name} /> : "Unknown Stable"} • Ōzeki
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span>Career: {rikishi.careerWins}-{rikishi.careerLosses}</span>
                <span>•</span>
                <span>Yūshō: {rikishi.careerRecord?.yusho ?? 0}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Council Elders */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>Present: {ELDER_NAMES.slice(0, 3 + (dialogueStep % 2)).join(", ")}</span>
          </div>

          {/* Dialogue */}
          <div className="min-h-[80px] p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
              <Scroll className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed italic">
                "{dialogue[dialogueStep]}"
              </p>
            </div>
          </div>

          {/* Verdict reveal on last step */}
          {dialogueStep === dialogue.length - 1 && (
            <div className={`p-4 rounded-lg border text-center ${
              verdict === "promoted" ? "border-amber-500/50 bg-amber-500/10" :
              verdict === "denied" ? "border-destructive/30 bg-destructive/5" :
              "border-muted bg-muted/30"
            }`}>
              <p className="text-lg font-display font-bold">
                {verdict === "promoted" ? "🎉 PROMOTION APPROVED" :
                 verdict === "denied" ? "Promotion Not Recommended" :
                 "Decision Deferred"}
              </p>
              {isPlayerRikishi && verdict === "promoted" && (
                <Badge className="mt-2 bg-amber-500 text-black">YOUR RIKISHI BECOMES YOKOZUNA!</Badge>
              )}
              {reasoning.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {reasoning.map((r, i) => (
                    <p key={i}>• {r}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleNext} className="w-full">
            {dialogueStep < dialogue.length - 1 ? "Continue" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
