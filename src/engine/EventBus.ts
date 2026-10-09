/**
 * EventBus.ts
 * ===========
 * Canonical BardEngine event factories for every simulation domain.
 * Composed facade over the domain modules in ./eventBus/ — all factories
 * delegate to logEngineEvent with the appropriate type/category/tags.
 */
import { medicalReportBase, lifecycleEvent, lifecycleAction } from "./eventBus/medical";
import {
  governanceRuling,
  welfareCompliance,
  oyakataMoodShift,
  managementDecision,
  strategyShift,
  facilityUpdate,
  rosterEvent,
  prestigeEvent,
} from "./eventBus/stable";
import { bashoStatus, boutResolved, awardConferred, rivalryHeatSpike } from "./eventBus/basho";
import { financialAlert, monthlyFinanceReport, financialAction } from "./eventBus/economy";
import { trainingUpdate, recruitDiscovered } from "./eventBus/development";

export const EventBus = {
  medicalReportBase,
  governanceRuling,
  trainingUpdate,
  financialAlert,
  awardConferred,
  lifecycleEvent,
  bashoStatus,
  welfareCompliance,
  boutResolved,
  recruitDiscovered,
  monthlyFinanceReport,
  rivalryHeatSpike,
  oyakataMoodShift,
  managementDecision,
  strategyShift,
  facilityUpdate,
  rosterEvent,
  prestigeEvent,
  lifecycleAction,
  financialAction,
};
