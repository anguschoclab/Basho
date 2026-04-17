/**
 * RivalriesEmptyState.tsx
 *
 * Empty state component when no rivalries exist.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Swords } from "lucide-react";

export function RivalriesEmptyState() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Swords className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display text-xl font-semibold mb-2">No Rivalries Yet</h3>
        <p className="text-muted-foreground">
          Rivalries develop as rikishi meet repeatedly. Complete tournaments to see tensions form.
        </p>
      </CardContent>
    </Card>
  );
}
