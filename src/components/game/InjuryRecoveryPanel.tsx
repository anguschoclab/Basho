// InjuryRecoveryPanel.tsx — Rehabilitation management for injured rikishi
// Sections live in ./InjuryRecoveryPanelSections.tsx.
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGameStore } from "@/store/gameStore";
import type { projectMedicalUIDigest } from "@/presenters/uiDigest";
import { projectGomenfuda } from "@/presenters/projections/governanceProjections";
import {
  FacilityCard,
  InjuredRikishiCard,
  WithdrawalDialog,
} from "./InjuryRecoveryPanelSections";

interface InjuryRecoveryPanelProps {
  digest: NonNullable<ReturnType<typeof projectMedicalUIDigest>>;
}

/**
 * Renders a panel showing rehabilitation progress and facility status for injured rikishi.
 *
 * @param {InjuryRecoveryPanelProps} props - The component props.
 * @param {projectMedicalUIDigest} props.digest - The medical digest data for the stable.
 * @returns {JSX.Element} The injury recovery panel UI.
 */
export function InjuryRecoveryPanel({ digest }: InjuryRecoveryPanelProps) {
  const { facilityLevel, facilityLabel, injuredRikishi } = digest;
  const sendCommand = useGameStore((s) => s.sendCommand);
  const workerWorld = useGameStore((s) => s.workerWorld);
  const playerHeyaId = workerWorld?.playerHeyaId;
  const gomenfudaProjection =
    workerWorld && playerHeyaId ? projectGomenfuda(workerWorld, playerHeyaId) : null;
  const [pendingWithdrawId, setPendingWithdrawId] = useState<string | null>(null);
  const pendingRikishi = injuredRikishi.find((r) => r.id === pendingWithdrawId);
  const gomenfudaCount = gomenfudaProjection?.count ?? 0;
  const sanctionThreshold = gomenfudaProjection?.threshold ?? 3;
  const sanctionRiskPercent = gomenfudaProjection?.sanctionRiskPercent ?? 0;

  return (
    <div className="space-y-4">
      {/* Facility Overview */}
      <FacilityCard facilityLevel={facilityLevel} facilityLabel={facilityLabel} />

      {/* Injured Roster */}
      {injuredRikishi.length === 0 ? (
        <Card>
          <EmptyState
            icon={Shield}
            iconClassName="text-success"
            title="All Clear"
            description="No injuries in your stable. Keep training smart."
            compact
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {injuredRikishi.length} Injured Wrestler{injuredRikishi.length !== 1 ? "s" : ""}
            </h3>
          </div>

          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-2">
              {injuredRikishi.map((info) => (
                <InjuredRikishiCard
                  key={info.id}
                  info={info}
                  gomenfudaProjection={gomenfudaProjection}
                  onTreat={(id) =>
                    sendCommand({ type: "TREAT_INJURY", rikishiId: id, weeks: 1 })
                  }
                  onWithdraw={setPendingWithdrawId}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Withdrawal confirmation dialog */}
      <WithdrawalDialog
        pendingRikishi={pendingRikishi}
        open={pendingWithdrawId !== null}
        onOpenChange={(open) => !open && setPendingWithdrawId(null)}
        gomenfudaCount={gomenfudaCount}
        sanctionThreshold={sanctionThreshold}
        sanctionRiskPercent={sanctionRiskPercent}
        onConfirm={() => {
          if (pendingWithdrawId) {
            sendCommand({ type: "WITHDRAW_RIKISHI", rikishiId: pendingWithdrawId });
            setPendingWithdrawId(null);
          }
        }}
      />
    </div>
  );
}
