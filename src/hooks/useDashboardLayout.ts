import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "dashboard-widget-order";

/** Defines the structure for widget def. */
export interface WidgetDef {
  id: string;
  /** Default order for layout */
  order: number;
  /** Grid span (1-12) - default is 4 (1/3 width) */
  span?: number;
  component: React.ComponentType;
  label: string;
}

/** Defines the structure for widget placement. */
interface WidgetPlacement {
  id: string;
  column: number; // Keep for legacy storage compat but use order primarily
  order: number;
}

/**
 * Load saved order.
 * @internal - exported for testing
 */
export function loadSavedOrder(): WidgetPlacement[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed.every(
        (p: unknown) =>
          p &&
          typeof (p as Record<string, unknown>).id === "string" &&
          typeof (p as Record<string, unknown>).order === "number" &&
          typeof (p as Record<string, unknown>).column === "number"
      );
      if (valid) {
        return parsed as WidgetPlacement[];
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Save order.
 */
function saveOrder(placements: WidgetPlacement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
}

/**
 * Use dashboard layout.
 */
export function useDashboardLayout(defaults: WidgetDef[]) {
  const [placements, setPlacements] = useState<WidgetPlacement[]>(() => {
    const saved = loadSavedOrder();
    if (saved) {
      const known = new Set(saved.map((s) => s.id));
      const extras = defaults
        .filter((d) => !known.has(d.id))
        .map((d) => ({ id: d.id, column: 0, order: d.order }));
      const validIds = new Set(defaults.map((d) => d.id));
      return [...saved.filter((s) => validIds.has(s.id)), ...extras].sort(
        (a, b) => a.order - b.order
      );
    }
    return defaults.map((d) => ({ id: d.id, column: 0, order: d.order }));
  });

  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<{ id: string } | null>(null);

  const getOrderedPlacements = useCallback((): WidgetPlacement[] => {
    return [...placements].sort((a, b) => a.order - b.order);
  }, [placements]);

  const onDragStart = useCallback((widgetId: string) => {
    dragItem.current = widgetId;
  }, []);

  const onDragOver = useCallback((widgetId: string) => {
    dragOverItem.current = { id: widgetId };
  }, []);

  const onDragEnd = useCallback(() => {
    const fromId = dragItem.current;
    const toId = dragOverItem.current?.id;
    dragItem.current = null;
    dragOverItem.current = null;

    if (!fromId || !toId || fromId === toId) return;

    setPlacements((prev) => {
      const next = [...prev].sort((a, b) => a.order - b.order);
      const fromIdx = next.findIndex((p) => p.id === fromId);
      const toIdx = next.findIndex((p) => p.id === toId);

      if (fromIdx < 0 || toIdx < 0) return prev;

      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);

      // Reassign order values
      const ordered = next.map((p, i) => ({ ...p, order: i }));
      saveOrder(ordered);
      return ordered;
    });
  }, []);

  const resetLayout = useCallback(() => {
    const fresh = defaults.map((d) => ({ id: d.id, column: 0, order: d.order }));
    setPlacements(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }, [defaults]);

  return { getOrderedPlacements, onDragStart, onDragOver, onDragEnd, resetLayout, placements };
}
