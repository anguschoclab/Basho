/**
 * src/components/recap/TournamentCeremony.tsx
 *
 * Cinematic display for post-basho champion reveals and special prizes.
 * Features high-fidelity heraldry, yūshō calligraphy, and medal displays.
 * Section components live in ./TournamentCeremonySections.tsx.
 */

import type { BashoResult } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import {
  ChampionSection,
  JunYushoCard,
  KinboshiCard,
  SpecialPrizesSection,
} from "./TournamentCeremonySections";

interface TournamentCeremonyProps {
  lastBasho: BashoResult;
  champion: { rikishi: UIRikishi; heyaName: string } | null;
  isPlayerChampion: boolean;
  junYusho: Array<{ rikishi: UIRikishi; heyaName: string }>;
  kinboshi: Array<{ winner: UIRikishi; loser: UIRikishi }>;
  ginoSho: UIRikishi | null;
  shukunSho: UIRikishi | null;
  kantoSho: UIRikishi | null;
}

export function TournamentCeremony({
  lastBasho,
  champion,
  isPlayerChampion,
  junYusho,
  kinboshi,
  ginoSho,
  shukunSho,
  kantoSho,
}: TournamentCeremonyProps) {
  if (!lastBasho) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* ═══ YŪSHŌ CHAMPION ═══ */}
      {champion && (
        <ChampionSection champion={champion} isPlayerChampion={isPlayerChampion} />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ═══ JUN-YŪSHŌ (RUNNER-UP) ═══ */}
        <JunYushoCard junYusho={junYusho} />

        {/* ═══ KINBOSHI (GOLD STARS) ═══ */}
        <KinboshiCard kinboshi={kinboshi} />
      </div>

      {/* ═══ SPECIAL PRIZES (SANSŌ) ═══ */}
      <SpecialPrizesSection ginoSho={ginoSho} shukunSho={shukunSho} kantoSho={kantoSho} />
    </div>
  );
}
