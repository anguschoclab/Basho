import { useCallback, useState } from "react";

/**
 * Tracks whether the player has dismissed the SuccessionModal for the current week.
 * The modal reappears once `currentWeek` advances, matching the "Dismiss until next week" UX.
 */
export function useSuccessionDismissal(currentWeek: number) {
  const [dismissedWeek, setDismissedWeek] = useState<number | null>(null);

  const dismiss = useCallback(() => {
    setDismissedWeek(currentWeek);
  }, [currentWeek]);

  const isDismissed = dismissedWeek === currentWeek;

  return { isDismissed, dismiss };
}
