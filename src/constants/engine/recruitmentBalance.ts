/**
 * Competitive-balance ("draft order") tuning. The recruitment bid war otherwise
 * lets the wealthiest stable win every top recruit, concentrating talent and
 * producing 5-dynasty dominance. These bound a strength-based handicap on bids.
 */
export const BALANCE_STRENGTH_SENSITIVITY = 0.12; // per-sekitori deviation from the league mean
export const BALANCE_MULTIPLIER_MIN = 0.4; // strongest stables keep at least 40% bid power
export const BALANCE_MULTIPLIER_MAX = 1.8; // weakest stables bid up to 1.8×
