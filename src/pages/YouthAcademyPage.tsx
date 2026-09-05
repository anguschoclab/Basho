/**
 * YouthAcademyPage — player-facing youth academy management page.
 *
 * Lets the player build, upgrade, invest, hire staff, promote prospects,
 * and view their youth academy development pipeline.
 */
import { AppLayout } from "@/components/layout/AppLayout";
import { useGame } from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { getPlayerHeya } from "@/presenters/engineAccess";
import { projectYouthAcademy } from "@/presenters/youthAcademyProjections";
import { YouthAcademyPanel } from "@/components/recruitment/YouthAcademyPanel";
import type { AcademyStaffRole } from "@/engine/types/academy";

export default function YouthAcademyPage() {
  const { state } = useGame();
  const world = state.world;
  const sendCommand = useGameStore((s) => s.sendCommand);

  if (!world) {
    return (
      <AppLayout pageTitle="Youth Academy">
        <title>Youth Academy — Sumo Manager Pro</title>
        <p className="text-muted-foreground text-sm p-4">No game loaded.</p>
      </AppLayout>
    );
  }

  const playerHeya = getPlayerHeya(world);
  if (!playerHeya) {
    return (
      <AppLayout pageTitle="Youth Academy">
        <title>Youth Academy — Sumo Manager Pro</title>
        <p className="text-muted-foreground text-sm p-4">No stable found.</p>
      </AppLayout>
    );
  }

  const projection = projectYouthAcademy(world, playerHeya.id);
  const cash = playerHeya.economics?.cash ?? 0;

  return (
    <AppLayout pageTitle="Youth Academy">
      <title>Youth Academy — Sumo Manager Pro</title>

      <div className="space-y-4 p-4 max-w-2xl" data-testid="youth-academy-page">
        <YouthAcademyPanel
          projection={projection}
          cash={cash}
          onBuild={() =>
            sendCommand({ type: "BUILD_YOUTH_ACADEMY", heyaId: playerHeya.id })
          }
          onUpgrade={() =>
            sendCommand({ type: "UPGRADE_YOUTH_ACADEMY", heyaId: playerHeya.id })
          }
          onInvest={(amount) =>
            sendCommand({ type: "INVEST_ACADEMY", heyaId: playerHeya.id, amount })
          }
          onHireStaff={(role: AcademyStaffRole) =>
            sendCommand({ type: "HIRE_ACADEMY_STAFF", heyaId: playerHeya.id, role })
          }
          onPromote={(prospectId) =>
            sendCommand({ type: "PROMOTE_INTAKE", heyaId: playerHeya.id, prospectId })
          }
        />
      </div>
    </AppLayout>
  );
}
