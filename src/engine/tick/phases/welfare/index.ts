/**
 * welfare/index.ts
 * ================
 * Welfare phase module exports.
 */

export {
  handleCompliantTransition,
  handleWatchTransition,
  handleInvestigationTransition,
  handleSanctionedTransition,
  transitionToSanctioned,
  setComplianceStatePure,
} from "@/engine/tick/phases/welfare/transitions";
