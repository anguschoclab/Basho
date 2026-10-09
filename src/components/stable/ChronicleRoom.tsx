// ChronicleRoom.tsx — stable dynasty chronicle: legacy tier, era timeline,
// and inherited training philosophy. Sections live in
// ./ChronicleRoomSections.tsx.

import { DynastyService } from "@/presenters/engineAccess";
import type { WorldState } from "@/presenters/uiDigest";
import type { Id } from "@/engine/types/common";
import {
  EmptyChronicle,
  ChronicleHeader,
  EraTimeline,
  ChronicleSideColumn,
} from "./ChronicleRoomSections";

interface ChronicleRoomProps {
  world: WorldState;
  heyaId: Id;
}

export function ChronicleRoom({ world, heyaId }: ChronicleRoomProps) {
  const report = DynastyService.generateDynastyReport(world, heyaId);
  const heya = world.heyas.get(heyaId);

  if (!report || !heya) {
    return <EmptyChronicle />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Legacy Header */}
      <ChronicleHeader report={report} heya={heya} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Era Timeline */}
        <EraTimeline eras={report.eras} />

        {/* Philosophy & Bloodlines */}
        <ChronicleSideColumn report={report} />
      </div>
    </div>
  );
}
