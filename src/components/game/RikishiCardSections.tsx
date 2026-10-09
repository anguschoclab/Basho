/**
 * RikishiCardSections.tsx
 *
 * Sections of RikishiCard — header (avatar/identity/archetype badge),
 * citizenship/naturalization status, career prestige grid, and salary
 * breakdown.
 */

import { UIRikishi } from "../../presenters/uiModels";
import { CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { RikishiName, StableName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { Globe } from "lucide-react";
import { getCombatArchetypeDescription } from "@/presenters/engineAccess";
import { BookmarkButton } from "@/components/bookmark/BookmarkButton";

/** Avatar, shikona, heya/rank line, and archetype badge. */
export function RikishiCardHeader({ rikishi }: { rikishi: UIRikishi }) {
  return (
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <SumoAvatar
            config={rikishi.avatarConfig}
            size="md"
            showHairstyle={true}
            expression={
              rikishi.isInjured ? "intense" : rikishi.motivation > 70 ? "confident" : "neutral"
            }
            fallback={rikishi.shikona}
          />
          <div>
            <CardTitle className="text-2xl font-display text-primary">
              <RikishiName id={rikishi.id} name={rikishi.shikona} />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {rikishi.heyaId ? (
                <StableName id={rikishi.heyaId} name={rikishi.heyaName} />
              ) : (
                rikishi.heyaName
              )}{" "}
              Heya | {rikishi.rankLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BookmarkButton entityType="rikishi" entityId={rikishi.id} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="font-mono cursor-help">
                  {rikishi.archetypeName}
                </Badge>
              </TooltipTrigger>
              {rikishi.combatArchetype && (
                <TooltipContent>
                  <p className="max-w-xs">
                    {getCombatArchetypeDescription(rikishi.combatArchetype)}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </CardHeader>
  );
}

/** Citizenship / naturalization progress block (foreign rikishi only). */
export function CitizenshipSection({ rikishi }: { rikishi: UIRikishi }) {
  if (rikishi.citizenshipStatus === "native") return null;

  return (
    <div className="pt-2 border-t border-primary/5 bg-gold/5 -mx-6 px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] uppercase tracking-widest text-gold font-bold flex items-center gap-1">
          <Globe className="h-3 w-3" />{" "}
          {rikishi.citizenshipStatus === "naturalized"
            ? "Citizenship Status"
            : "Naturalization Progress"}
        </h4>
        {rikishi.citizenshipStatus === "foreign" ? (
          <span className="text-[10px] font-mono font-bold text-gold">
            {5 - rikishi.yearsToNaturalization}/5 Years
          </span>
        ) : (
          <Badge variant="outline" className="text-[10px] border-gold text-gold bg-gold/5">
            Naturalized
          </Badge>
        )}
      </div>
      {rikishi.citizenshipStatus === "foreign" && (
        <>
          <Progress
            value={((5 - rikishi.yearsToNaturalization) / 5) * 100}
            className="h-1 bg-gold/20"
          />
          <p className="text-[8px] text-gold/70 mt-1 uppercase font-bold tracking-tighter">
            {rikishi.yearsToNaturalization} year
            {rikishi.yearsToNaturalization !== 1 ? "s" : ""} until Japanese citizenship
            eligibility
          </p>
        </>
      )}
      {rikishi.citizenshipStatus === "naturalized" && (
        <p className="text-[8px] text-gold/70 mt-1 uppercase font-bold tracking-tighter">
          This rikishi is a full Japanese citizen and no longer counts against the heya's
          foreign quota.
        </p>
      )}
    </div>
  );
}

/** Career prestige — kinboshi/ginboshi earned and conceded. */
export function PrestigeSection({ rikishi }: { rikishi: UIRikishi }) {
  return (
    <div className="pt-2 border-t border-primary/5">
      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        Career Prestige
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1 p-2 rounded bg-gold/5 border border-gold/10">
          <span className="text-[10px] uppercase font-bold text-gold">Gold Stars Won</span>
          <span className="font-display text-xl font-bold">
            {rikishi.achievements.kinboshiEarned}
          </span>
        </div>
        {rikishi.achievements.ginboshiEarned > 0 && (
          <div className="flex flex-col gap-1 p-2 rounded bg-silver/5 border border-silver/10">
            <span className="text-[10px] uppercase font-bold text-silver dark:text-silver/70">
              Silver Stars Won
            </span>
            <span className="font-display text-xl font-bold">
              {rikishi.achievements.ginboshiEarned}
            </span>
          </div>
        )}
        {rikishi.rank === "yokozuna" && (
          <div className="col-span-2 flex justify-between items-center p-2 rounded bg-destructive/5 border border-destructive/10">
            <span className="text-[10px] uppercase font-bold text-destructive dark:text-destructive/70">
              Stars Conceded
            </span>
            <span className="font-display font-bold text-destructive dark:text-destructive/70">
              {rikishi.achievements.kinboshiConceded}
            </span>
          </div>
        )}
        {rikishi.rank === "ozeki" && (
          <div className="col-span-2 flex justify-between items-center p-2 rounded bg-destructive/5 border border-destructive/10">
            <span className="text-[10px] uppercase font-bold text-destructive dark:text-destructive/70">
              Silver Stars Conceded
            </span>
            <span className="font-display font-bold text-destructive dark:text-destructive/70">
              {rikishi.achievements.ginboshiConceded}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Monthly salary breakdown — base, kinboshi bonus, total. */
export function SalarySection({ rikishi }: { rikishi: UIRikishi }) {
  return (
    <div className="pt-2 border-t border-primary/5 bg-primary/5 -mx-6 px-6 py-3">
      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 text-center">
        Monthly Salary Breakdown
      </h4>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
        <div className="flex flex-col p-1 rounded bg-background/50 border border-primary/10">
          <span className="text-muted-foreground uppercase font-bold mb-1">Base</span>
          <span className="font-display font-bold text-primary-foreground">
            ¥{(rikishi.salaryBreakdown.base / 1000).toFixed(0)}k
          </span>
        </div>
        <div className="flex flex-col p-1 rounded bg-background/50 border border-primary/10">
          <span className="text-muted-foreground uppercase font-bold mb-1">Kinboshi</span>
          <span className="font-display font-bold text-gold">
            ¥{(rikishi.salaryBreakdown.kinboshiBonus / 1000).toFixed(0)}k
          </span>
        </div>
        <div className="flex flex-col p-1 rounded bg-primary/20 border border-primary/30">
          <span className="text-primary uppercase font-bold mb-1">Total</span>
          <span className="font-display font-bold text-primary">
            ¥{(rikishi.salaryBreakdown.total / 1000).toFixed(0)}k
          </span>
        </div>
      </div>
    </div>
  );
}
