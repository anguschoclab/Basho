/**
 * RikishiProfileTab.tsx
 *
 * Profile tab content for rikishi profile page.
 */

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Award as AwardIcon, Info, Shield, Target, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { rngFromSeed, type SeededRNG } from "@/engine/rng";
import type { UIRikishi } from "@/presenters/uiModels";
import type { Rikishi } from "@/engine/types";
import { RankBadge } from "./RankBadge";

// ── Scout Note Generator ──────────────────────────────────────────────────────

function generateScoutNote(rikishi: UIRikishi, rawRikishi: Rikishi, rng: SeededRNG): string {
  const s = rawRikishi.stats ?? {};
  const ranked = [
    { label: "physical power", v: s.power ?? 50 },
    { label: "footwork", v: s.speed ?? 50 },
    { label: "technical precision", v: s.technique ?? 50 },
    { label: "ring endurance", v: s.stamina ?? 50 },
    { label: "lower-body stability", v: s.balance ?? 50 },
    { label: "mental composure", v: s.mental ?? 50 },
    { label: "tactical adaptability", v: s.adaptability ?? 50 },
  ].sort((a, b) => b.v - a.v);

  const top = ranked[0];
  const weak = ranked[ranked.length - 1];
  const topBand = NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(top.v));
  const weakBand = NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(weak.v));

  const phasePhrases: Record<string, string[]> = {
    prodigy: ["shows rare maturity for his age", "is drawing comparisons to historical greats"],
    young: ["is still building tournament instincts", "has room to grow into his body"],
    prime: ["is operating at peak efficiency", "brings together experience and athleticism"],
    veteran: ["leans on accumulated ring wisdom", "compensates with technical mastery"],
    aging: ["fights on sheer experience and pride", "defies age with cerebral sumo"],
    elder: ["competes on institutional prestige and guile", "represents a passing era"],
  };
  const phaseOpts = phasePhrases[rikishi.ageBand ?? "prime"] ?? phasePhrases["prime"];
  const phase = phaseOpts[rng.int(0, phaseOpts.length - 1)];

  const weakSuffix =
    weak.v < 50
      ? ` Critics note his ${weak.label} (${weakBand}) leaves room for opponents to exploit.`
      : "";

  const style = (rikishi.style ?? "hybrid").toLowerCase();

  const templates: Record<string, string[]> = {
    oshi: [
      `${rikishi.shikona} attacks from distance, favouring the thrust-and-push over belt engagement. His ${top.label} (${topBand}) powers the charge.${weakSuffix}`,
      `A committed pusher-thruster, ${rikishi.shikona} rarely concedes ground once the tachiai is won. ${rikishi.shikona} ${phase}.${weakSuffix}`,
      `${rikishi.shikona} ${phase}. The nodowa and tsuppari are his primary weapons, with ${top.label} (${topBand}) as the engine.${weakSuffix}`,
      `Forward pressure is everything for ${rikishi.shikona}. His ${top.label} (${topBand}) makes him difficult to redirect once moving.${weakSuffix}`,
      `${rikishi.shikona} commits to the charge with every bout — the tsuppari barrage is relentless, though a well-timed hatakikomi has pulled him down before. His ${top.label} (${topBand}) is not in question; the discipline of his forward walk is.${weakSuffix}`,
      `Years in the division have sharpened ${rikishi.shikona}'s timing more than his legs. He ${phase}, and that accumulated read of tachiai angles makes his pushes land with disproportionate authority.${weakSuffix}`,
      `${rikishi.shikona} shows the enthusiasm of a wrestler still learning when to commit. The nodowa is there, the tsuppari is there — but the sequencing sometimes abandons him against cagey opposition. His ${top.label} (${topBand}) is the foundation he must build from.${weakSuffix}`,
      `When ${rikishi.shikona} puts his combination attacks together — nodowa into tsuppari into hatakikomi feint — there are few in the division who can stay upright. His ${top.label} (${topBand}) means each blow carries genuine weight.${weakSuffix}`,
    ],
    yotsu: [
      `${rikishi.shikona} is a grappler first — once the mawashi is secured, he is difficult to move. ${top.label} (${topBand}) is the clear foundation of his game.${weakSuffix}`,
      `Patient inside sumo defines ${rikishi.shikona}'s approach. He ${phase}.${weakSuffix}`,
      `${rikishi.shikona} thrives in close quarters, using belt control to neutralise stronger opponents. His ${top.label} (${topBand}) shows most in sustained exchanges.${weakSuffix}`,
      `A measured, inside-game specialist, ${rikishi.shikona} ${phase}. Opponents who can keep him at arm's length find more success.${weakSuffix}`,
      `${rikishi.shikona}'s right-hand uwate is among the finest in the division — once he secures that outside grip on the mawashi, the uwatenage becomes a near-certainty. His ${top.label} (${topBand}) gives the throw genuine authority.${weakSuffix}`,
      `Size concedes nothing to ${rikishi.shikona} on the dohyo. His positioning after the tachiai is a studied thing — he neutralises heavier opponents through angle and leverage rather than force, with his ${top.label} (${topBand}) doing the quiet work.${weakSuffix}`,
      `${rikishi.shikona} finds the belt without difficulty. The question is what he does once he has it. Against oshi-dominant opponents who deny him the inside, his game loses its shape — something the better pushers in the division have already mapped.${weakSuffix}`,
      `The finishing throw repertoire that ${rikishi.shikona} carries is genuinely unusual: shitatenage, kotenage, tottari — he selects based on what the mawashi gives him rather than what he intends. He ${phase}, and that adaptability in the belt battle makes him dangerous to any style.${weakSuffix}`,
    ],
    hybrid: [
      `${rikishi.shikona} ${phase}, reading each opponent and adjusting accordingly. His ${top.label} (${topBand}) underpins the variety of his attack.${weakSuffix}`,
      `A tactical wrestler, ${rikishi.shikona} transitions between pushing and grappling based on the tachiai. ${top.label} (${topBand}) provides options.${weakSuffix}`,
      `${rikishi.shikona}'s unpredictability is his greatest weapon. He ${phase}.${weakSuffix}`,
      `Versatility is the hallmark of ${rikishi.shikona}'s game. He ${phase}, and his ${top.label} (${topBand}) keeps opponents guessing.${weakSuffix}`,
      `Scouts who prepare for one version of ${rikishi.shikona} routinely face another. He has studied opponents' tendencies and selects his approach before the gyoji even calls them to the line. His ${top.label} (${topBand}) gives each chosen strategy a genuine foundation.${weakSuffix}`,
      `There is no settled rhythm to facing ${rikishi.shikona}. He will push when you expect the belt; he will seek the mawashi when you have your heels back for a pull. Opponents find no comfortable footing against him, which is precisely the point.${weakSuffix}`,
      `${rikishi.shikona} has not yet fully committed to a preferred style, which is both his limitation and his intrigue. The tsuppari and the morozashi exist in his game without hierarchy — he ${phase}, still resolving what kind of rikishi he intends to become.${weakSuffix}`,
      `Bouts of wide tactical range make ${rikishi.shikona} a difficult assignment at any division level. He ${phase}, and the accumulated weight of his ring experience means he can reach for oshi, yotsu, or hatakikomi and execute any with conviction.${weakSuffix}`,
    ],
    defensive: [
      `${rikishi.shikona} does not win bouts — he makes opponents lose them. His ${top.label} (${topBand}) absorbs forward pressure without panic, and the counter arrives precisely when the attacker has overextended.${weakSuffix}`,
      `Patience is the defining quality of ${rikishi.shikona}'s sumo. He ${phase}, content to absorb tsuppari until the geometry of the bout opens a lane for hatakikomi or kotenage. Frustrating to fight; methodical to watch.${weakSuffix}`,
      `${rikishi.shikona} has built a game around the moment after the opponent commits. His ${top.label} (${topBand}) gives him the stability to weather a tachiai charge and still be positioned for the counter when it comes.${weakSuffix}`,
      `There are rikishi who impose their will from the initial charge, and then there is ${rikishi.shikona}. He invites pressure, manages it on his terms, and responds only when the opening is real. He ${phase}, and that cerebral approach has extended a career others would have spent by now.${weakSuffix}`,
    ],
    technical: [
      `The kimarite vocabulary that ${rikishi.shikona} employs is wider than almost anyone at his rank. His ${top.label} (${topBand}) is not raw power — it is the precision that allows him to select between tottari, kotenage, and shitatenage in the moment the mawashi grip informs him.${weakSuffix}`,
      `${rikishi.shikona} ${phase}. What distinguishes him is not any single technique but the range: he has finished bouts by fifteen different kimarite in the last two basho alone, and each felt chosen rather than improvised.${weakSuffix}`,
      `Opponents approach ${rikishi.shikona} having scouted one version of his attack and encounter a different one. His ${top.label} (${topBand}) underpins a technique library that rewards the patient student of sumo — there is always something new to file away after watching him compete.${weakSuffix}`,
      `There is an almost taxonomic quality to how ${rikishi.shikona} wins. Each bout offers a different answer to the same question of how to move a body off the dohyo: uwatenage today, hatakikomi tomorrow, tottari when the arm presents itself. He ${phase}, and the technical acuity shows no sign of narrowing.${weakSuffix}`,
    ],
  };

  const opts = templates[style] ?? templates["hybrid"];
  return opts[rng.int(0, opts.length - 1)];
}

function generateBadges(rikishi: UIRikishi, rawRikishi: Rikishi): string[] {
  const badges: string[] = [];
  const s = rawRikishi.stats ?? {};
  const totalBouts = (rikishi.careerWins ?? 0) + (rikishi.careerLosses ?? 0);
  const winPct = totalBouts > 30 ? (rikishi.careerWins ?? 0) / totalBouts : 0;
  const topStatVal = Math.max(
    s.power ?? 0,
    s.speed ?? 0,
    s.technique ?? 0,
    s.stamina ?? 0,
    s.balance ?? 0
  );

  if (rikishi.potentialBand === "generational") badges.push("Generational Talent");
  else if (rikishi.potentialBand === "star") badges.push("High Potential");

  if (rikishi.careerYusho >= 5) badges.push("Dynasty");
  else if (rikishi.careerYusho >= 2) badges.push("Multi-Champion");
  else if (rikishi.careerYusho === 1) badges.push("Champion");

  if (rikishi.ageBand === "prodigy") badges.push("Young Prodigy");
  else if (rikishi.ageBand === "elder") badges.push("Elder Statesman");
  else if (rikishi.ageBand === "veteran" && totalBouts > 200) badges.push("Iron Veteran");

  if ((rikishi.streak ?? 0) >= 5) badges.push("Hot Streak");
  if ((rikishi.streak ?? 0) <= -5) badges.push("Slump");

  if (winPct >= 0.68) badges.push("Elite Record");
  else if (winPct >= 0.55) badges.push("Winning Form");

  if (topStatVal >= 88) badges.push("Physical Elite");
  if (rikishi.nationality !== "Japan") badges.push("International");

  const traits = rikishi.personalityTraits ?? [];
  if (traits.some((t) => ["tenacious", "resilient", "determined"].includes(t)))
    badges.push("Iron Will");
  if (traits.some((t) => ["technical", "precise"].includes(t))) badges.push("Technician");
  if (traits.some((t) => ["charismatic", "popular", "crowd-pleaser"].includes(t)))
    badges.push("Fan Favourite");

  // Fallbacks if nothing fired
  if (badges.length === 0) {
    const style = (rikishi.style ?? "hybrid").toLowerCase();
    if (style === "oshi") badges.push("Forward Pressure");
    if (style === "yotsu") badges.push("Belt Specialist");
    if (style === "hybrid") badges.push("Versatile");
  }

  return badges.slice(0, 4);
}

interface RikishiProfileTabProps {
  rikishi: UIRikishi;
  rawRikishi: Rikishi;
  worldSeed: string;
}

export function RikishiProfileTab({ rikishi, rawRikishi, worldSeed }: RikishiProfileTabProps) {
  const noteRng = rngFromSeed(worldSeed, "scout-note", rikishi.id);
  const note = generateScoutNote(rikishi, rawRikishi, noteRng);
  const badges = generateBadges(rikishi, rawRikishi);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Activity className="h-5 w-5 text-primary" /> Physical Attributes
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Forcefulness",
              key: "power",
              val: rikishi.perceivedStats.power,
              raw: rawRikishi.stats?.power ?? 50,
              color: "bg-gold",
              icon: <Zap className="h-3.5 w-3.5" />,
            },
            {
              label: "Agility",
              key: "speed",
              val: rikishi.perceivedStats.speed,
              raw: rawRikishi.stats?.speed ?? 50,
              color: "bg-west",
              icon: <TrendingUp className="h-3.5 w-3.5" />,
            },
            {
              label: "Resilience",
              key: "stamina",
              val: rikishi.perceivedStats.stamina,
              raw: rawRikishi.stats?.stamina ?? 50,
              color: "bg-success",
              icon: <Shield className="h-3.5 w-3.5" />,
            },
            {
              label: "Precision",
              key: "technique",
              val: rikishi.perceivedStats.technique,
              raw: rawRikishi.stats?.technique ?? 50,
              color: "bg-purple-500",
              icon: <Target className="h-3.5 w-3.5" />,
            },
          ].map((stat, i) => (
            <TooltipWrap
              key={i}
              content={NarrativeService.describeAttribute(
                rngFromSeed(worldSeed, "ui", "rikishi-dossier"),
                stat.key,
                stat.raw
              )}
              side="top"
            >
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50 space-y-3 hover:border-primary/20 transition-colors cursor-help">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                  {stat.icon} {stat.label}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-display font-black">{stat.val}</div>
                  <Progress value={stat.raw} className={cn("h-1 flex-1 opacity-40", stat.color)} />
                </div>
              </div>
            </TooltipWrap>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <RankBadge
          rank={rikishi.rank}
          rankNumber={rikishi.rankNumber}
          side={rikishi.side}
          variant="pill"
          showJapanese
        />
        <h3 className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <AwardIcon className="h-5 w-5 text-primary" /> Notes
        </h3>
        <div className="bg-muted/20 border-2 border-dashed rounded-lg p-6 space-y-4 opacity-70">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm italic font-body leading-relaxed">"{note}"</p>
          </div>
          {badges.length > 0 && (
            <>
              <div className="h-px bg-border/40" />
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <Badge
                    key={b}
                    variant="outline"
                    className="text-[9px] font-bold uppercase tracking-widest"
                  >
                    {b}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
