/**
 * RikishiProfileHeader.tsx
 *
 * Header section for rikishi profile page.
 * Sections live in ./RikishiProfileHeaderSections.tsx.
 */

import { Button } from "@/components/ui/button";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";
import { ArrowLeft } from "lucide-react";
import type { UIRikishi } from "@/presenters/uiModels";
import { HeaderBadges, HeaderIdentity, CareerStatsColumn } from "./RikishiProfileHeaderSections";

interface RikishiProfileHeaderProps {
  rikishi: UIRikishi;
  isOwned: boolean;
  healthBadge: string;
  isKadoban?: boolean;
  onBack: () => void;
}

/**
 * Renders the header section of a rikishi's profile, including their name, rank, avatar, and key stats.
 * Displays various badges for health, ownership, nationality, and special statuses like Kadoban.
 *
 * @param {RikishiProfileHeaderProps} props - The component props.
 * @param {UIRikishi} props.rikishi - The rikishi data to display.
 * @param {boolean} props.isOwned - Whether the rikishi is owned by the player's heya.
 * @param {string} props.healthBadge - The label for the current health status badge.
 * @param {boolean} [props.isKadoban] - Optional flag indicating if the rikishi is in Kadoban status (for Ozeki).
 * @param {() => void} props.onBack - Callback function for the back button.
 * @returns {JSX.Element} The rendered profile header.
 */
export function RikishiProfileHeader({
  rikishi,
  isOwned,
  healthBadge,
  isKadoban,
  onBack,
}: RikishiProfileHeaderProps) {
  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 h-10 px-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to stable roster
      </Button>

      {/* ═══ DOSSIER HEADER ═══ */}
      <div className="dossier-paper rounded-lg overflow-hidden shadow-2xl border-2 border-primary/10">
        <div className="bg-primary pt-12 pb-10 px-8 relative overflow-hidden text-primary-foreground hero-gradient border-b-4 border-primary">
          <div className="absolute top-0 right-0 p-8 opacity-10 font-display text-9xl font-black pointer-events-none uppercase -rotate-12 translate-x-12 -translate-y-8">
            {rikishi.rankLabel}
          </div>

          <div className="flex flex-col lg:flex-row items-start justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              <SumoAvatar
                config={rikishi.avatarConfig}
                size="lg"
                showHairstyle={true}
                expression={rikishi.isInjured ? "intense" : "determined"}
                fallback={rikishi.shikona}
                className="border-4 border-white/20 shadow-2xl"
              />
              <div className="space-y-4">
                <HeaderBadges
                  rikishi={rikishi}
                  isOwned={isOwned}
                  healthBadge={healthBadge}
                  isKadoban={isKadoban}
                />
                <HeaderIdentity rikishi={rikishi} />
              </div>
            </div>

            <CareerStatsColumn rikishi={rikishi} />
          </div>
        </div>
      </div>
    </div>
  );
}
