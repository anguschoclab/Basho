// YokozunaDeliberation.tsx — Yokozuna Deliberation Council narrative scene
import { Badge } from "@/components/ui/badge";
import { RikishiName, StableName } from "@/components/ClickableName";
import { Crown, Users } from "lucide-react";
import type { UIRikishi } from "@/presenters/uiModels";
// eslint-disable-next-line no-restricted-imports -- TODO: Refactor to use UIDigest instead of WorldState
import type { WorldState } from "@/engine/types/world";
import { NarrativeCeremonyDialog } from "./NarrativeCeremonyDialog";

/** Defines the structure for deliberation props. */
interface DeliberationProps {
  rikishi: UIRikishi;
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

/**
 * yokozuna deliberation.
 *  * @param { rikishi, world, open, onClose, verdict, reasoning } - The { rikishi, world, open, on close, verdict, reasoning }.
 */
export function YokozunaDeliberation({
  rikishi,
  world,
  open,
  onClose,
  verdict,
  reasoning,
}: DeliberationProps) {
  const dialogue = DELIBERATION_DIALOGUE[verdict];
  const heya = world.heyas.get(rikishi.heyaId);
  const isPlayerRikishi = rikishi.heyaId === world.playerHeyaId;

  return (
    <NarrativeCeremonyDialog
      open={open}
      onClose={onClose}
      title={
        <>
          <Crown className="h-5 w-5 text-gold" />
          横綱審議委員会
        </>
      }
      subtitle="Yokozuna Deliberation Council"
      cardContent={
        <>
          <div className="h-14 w-14 rounded-full bg-gold/20 flex items-center justify-center">
            <Crown className="h-7 w-7 text-gold" />
          </div>
          <div>
            <p className="text-lg font-display font-bold">
              <RikishiName id={rikishi.id} name={rikishi.shikona} />
            </p>
            <p className="text-sm text-muted-foreground">
              {heya ? <StableName id={heya.id} name={heya.name} /> : "Unknown Stable"} • Ōzeki
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span>Record: {rikishi.careerRecord}</span>
              <span>•</span>
              <span>Yūshō: {rikishi.careerYusho}</span>
            </div>
          </div>
        </>
      }
      middleContent={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Present: {ELDER_NAMES.join(", ")}</span>
        </div>
      }
      steps={dialogue.map((d) => `"${d}"`)}
      finalVerdictClassName={`p-4 rounded-lg border text-center ${
        verdict === "promoted"
          ? "border-gold/50 bg-gold/10"
          : verdict === "denied"
            ? "border-destructive/30 bg-destructive/5"
            : "border-muted bg-muted/30"
      }`}
      finalVerdictContent={
        <>
          <p className="text-lg font-display font-bold">
            {verdict === "promoted"
              ? "🎉 PROMOTION APPROVED"
              : verdict === "denied"
                ? "Promotion Not Recommended"
                : "Decision Deferred"}
          </p>
          {isPlayerRikishi && verdict === "promoted" && (
            <Badge className="mt-2 bg-gold text-black">YOUR RIKISHI BECOMES YOKOZUNA!</Badge>
          )}
          {reasoning.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              {reasoning.map((r, i) => (
                <p key={i}>• {r}</p>
              ))}
            </div>
          )}
        </>
      }
    />
  );
}
