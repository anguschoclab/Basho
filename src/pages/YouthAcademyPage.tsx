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
import {
  AcademyIntakeCard,
  AcademyStaffList,
  AcademyInvestmentControl,
} from "@/components/academy";
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
  const cash = playerHeya.funds;

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

        {projection.academy && (
          <div className="space-y-4" data-testid="academy-detail-section">
            {projection.academy.prospects.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Prospect Detail</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projection.academy.prospects.map((p) => (
                    <AcademyIntakeCard
                      key={p.id}
                      prospect={p}
                      onPromote={(prospectId) =>
                        sendCommand({
                          type: "PROMOTE_INTAKE",
                          heyaId: playerHeya.id,
                          prospectId,
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projection.academy.staff.length > 0 && (
                <AcademyStaffList
                  staff={projection.academy.staff}
                  maxStaff={projection.academy.maxStaff}
                  onHire={(role) =>
                    sendCommand({
                      type: "HIRE_ACADEMY_STAFF",
                      heyaId: playerHeya.id,
                      role,
                    })
                  }
                />
              )}
              <AcademyInvestmentControl
                budget={projection.academy.budget}
                onInvest={(amount) =>
                  sendCommand({
                    type: "INVEST_ACADEMY",
                    heyaId: playerHeya.id,
                    amount,
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
