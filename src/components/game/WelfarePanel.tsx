// WelfarePanel.tsx — Welfare & Compliance panel for StablePage
import type { DietRegimen } from "@/engine/types/economy";
import type { projectMedicalUIDigest } from "@/presenters/uiDigest";
import {
  ComplianceCard,
  WelfareMoraleCard,
  DietCard,
  HealthOverviewCard,
} from "./WelfarePanelSections";

/** Defines the structure for welfare panel props. */
interface WelfarePanelProps {
  onSetDiet?: (diet: DietRegimen) => void;
  digest: NonNullable<ReturnType<typeof projectMedicalUIDigest>>;
}

/**
 * welfare panel.
 */
export function WelfarePanel({ digest, onSetDiet }: WelfarePanelProps) {
  const { welfare, perception } = digest;

  return (
    <div className="space-y-4">
      <ComplianceCard welfare={welfare} />
      <WelfareMoraleCard welfare={welfare} perception={perception} />
      <DietCard welfare={welfare} onSetDiet={onSetDiet} />
      <HealthOverviewCard perception={perception} />
    </div>
  );
}
