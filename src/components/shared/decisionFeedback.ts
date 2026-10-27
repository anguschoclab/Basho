/** Short client-side acknowledgement shown in a toast the instant a decision is resolved.
 *  (The authoritative summary with real numbers is the engine's DECISION_RESOLVED event.) */
export function decisionToastMessage(optionLabel: string): string {
  return `Decision applied: ${optionLabel}. See the Event Feed for the result.`;
}
