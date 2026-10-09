// InstitutionPanel.tsx
// Displays Welfare Risk, Compliance State, Governance, and Oyakata Persona for a Heya.
// Canon: Beya as an institution.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata, OyakataTraits } from "@/engine/types/oyakata";
import { clamp } from "@/presenters/uiDigest";
import {
  WelfareSection,
  GovernanceSection,
  PersonaSection,
  type WelfareState,
} from "./InstitutionPanelSections";

/**
 * institution panel.
 *  * @param { heya, oyakata, oyakataQuirks, oyakataTraits } - The component props.
 */
export function InstitutionPanel({
  heya,
  oyakata,
  oyakataQuirks,
  oyakataTraits,
}: {
  heya: Heya;
  oyakata: Oyakata | null | undefined;
  oyakataQuirks: string[];
  oyakataTraits: OyakataTraits | null | undefined;
}) {
  const welfare = (heya as Heya & { welfareState?: WelfareState }).welfareState;
  const risk = clamp(Number(welfare?.welfareRisk ?? 10), 0, 100);
  const compliance = String(welfare?.complianceState ?? "compliant");

  return (
    <Card className="paper">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Institutional Health
        </CardTitle>
        <CardDescription>
          Welfare responsibility, compliance posture, and manager persona.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <WelfareSection risk={risk} compliance={compliance} welfare={welfare} />

        <Separator />

        <GovernanceSection heya={heya} />

        <Separator />

        <PersonaSection oyakata={oyakata} quirks={oyakataQuirks} traits={oyakataTraits} />
      </CardContent>
    </Card>
  );
}
