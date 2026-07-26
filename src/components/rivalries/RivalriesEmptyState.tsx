/**
 * RivalriesEmptyState.tsx
 *
 * Empty state component when no rivalries exist.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export function RivalriesEmptyState() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={Swords}
          title="No Rivalries Yet"
          description="Rivalries develop as rikishi meet repeatedly. Complete tournaments to see tensions form."
        />
      </CardContent>
    </Card>
  );
}
