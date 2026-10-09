import { BaseWidget } from "./BaseWidget";
import { Calendar } from "lucide-react";
import { PHASE_LABELS } from "@/constants/ui/calendar";
import { useCalendarActions } from "@/hooks/useCalendarActions";
import {
  CalendarDateBlock,
  BashoDayProgress,
  NextBashoNote,
  CalendarActions,
} from "./CalendarWidgetSections";

/** calendar widget. */
export function CalendarWidget() {
  const {
    world,
    handleAdvanceDay,
    handleAdvanceWeek,
    handleSimDay,
    handleSimFullBasho,
    navToSchedule,
    navToBasho,
  } = useCalendarActions();

  if (!world) return null;

  const phase = world.cyclePhase || "interim";
  const phaseInfo = PHASE_LABELS[phase] ?? PHASE_LABELS.interim;
  const bashoName = world.currentBashoName || "hatsu";
  const inBasho = phase === "active_basho" && !!world.currentBasho;

  // Basho day progress (1-15)
  const bashoDay = inBasho && world.currentBasho ? world.currentBasho.day : 0;

  return (
    <BaseWidget
      title="Calendar"
      icon={Calendar}
      headerContent={
        <>
          <span className={`h-2 w-2 rounded-full ${phaseInfo.dotClass}`} />
          <span className="text-[10px] font-medium text-muted-foreground">{phaseInfo.label}</span>
        </>
      }
    >
      <CalendarDateBlock world={world} bashoName={bashoName} inBasho={inBasho} />

      {inBasho && <BashoDayProgress bashoDay={bashoDay} />}

      {!inBasho && <NextBashoNote world={world} bashoName={bashoName} />}

      <CalendarActions
        inBasho={inBasho}
        handlers={{
          handleAdvanceDay,
          handleAdvanceWeek,
          handleSimDay,
          handleSimFullBasho,
          navToSchedule,
          navToBasho,
        }}
      />
    </BaseWidget>
  );
}
