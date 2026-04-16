// HoFInductionCeremony.tsx — Hall of Fame induction narrative ceremony
import { Badge } from "@/components/ui/badge";
import { RikishiName, StableName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Trophy, Shield, Target } from "lucide-react";
import type { HoFInductee, HoFCategory } from "@/engine/hallOfFame";
import { NarrativeCeremonyDialog } from "./NarrativeCeremonyDialog";

const CATEGORY_CEREMONY: Record<
  HoFCategory,
  { icon: React.ElementType; color: string; titleJa: string }
> = {
  champion: { icon: Trophy, color: "text-gold", titleJa: "殿堂入り" },
  iron_man: { icon: Shield, color: "text-west", titleJa: "鉄人殿堂" },
  technician: { icon: Target, color: "text-success", titleJa: "技能殿堂" },
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

/** Defines the structure for props. */
interface Props {
  inductee: HoFInductee;
  heyaName: string;
  isPlayerRikishi: boolean;
  open: boolean;
  onClose: () => void;
}

/**
 * ho f induction ceremony.
 *  * @param { inductee, rikishi, heyaName, isPlayerRikishi, open, onClose } - The component props.
 */
export function HoFInductionCeremony({
  inductee,
  heyaName,
  isPlayerRikishi,
  open,
  onClose,
}: Props) {
  const ceremony = CATEGORY_CEREMONY[inductee.category];
  const steps = CEREMONY_STEPS[inductee.category];
  const CatIcon = ceremony.icon;

  return (
    <NarrativeCeremonyDialog
      open={open}
      onClose={onClose}
      title={
        <>
          <CatIcon className={`h-5 w-5 ${ceremony.color}`} />
          {ceremony.titleJa} — Hall of Fame Induction
        </>
      }
      cardClassName="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-muted/80 to-muted/30 border"
      cardContent={
        <>
          <SumoAvatar
            config={undefined}
            size="lg"
            showHairstyle={true}
            fallback={inductee.shikona}
            expression={inductee.category === "champion" ? "confident" : "determined"}
            className={`border-2 ${ceremony.color}`}
          />
          <div>
            <p className="text-xl font-display font-bold">
              <RikishiName id={inductee.rikishiId} name={inductee.shikona} />
            </p>
            <p className="text-sm text-muted-foreground">
              <StableName id={inductee.rikishiId} name={heyaName} />
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
        </>
      }
      steps={steps}
      finalVerdictClassName="p-4 rounded-lg border border-gold/30 bg-gold/5 text-center"
      finalVerdictContent={
        <>
          <p className="font-display text-lg font-bold">
            <RikishiName id={inductee.rikishiId} name={inductee.shikona} /> — Immortalized
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Career: {inductee.stats.careerWins ?? 0}W - {inductee.stats.careerLosses ?? 0}L
            {inductee.stats.highestRank && ` • Highest: ${inductee.stats.highestRank}`}
          </p>
          {isPlayerRikishi && <Badge className="mt-2 bg-primary">Your stable's pride!</Badge>}
        </>
      }
    />
  );
}
