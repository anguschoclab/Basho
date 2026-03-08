import { useState, useCallback, useRef } from "react";

const STORAGE_KEY = "dashboard-widget-order";

export interface WidgetDef {
  id: string;
  /** Default column (0-based) */
  column: number;
  /** Default order within column */
  order: number;
  component: React.ComponentType;
  label: string;
}

export interface WidgetPlacement {
  id: string;
  column: number;
  order: number;
}

function loadSavedOrder(): WidgetPlacement[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((p: any) => p.id && typeof p.column === "number")) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveOrder(placements: WidgetPlacement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
}

export function useDashboardLayout(defaults: WidgetDef[], columnCount: number) {
  const [placements, setPlacements] = useState<WidgetPlacement[]>(() => {
    const saved = loadSavedOrder();
    if (saved) {
      // Merge: keep saved positions for known widgets, add new widgets at end
      const known = new Set(saved.map(s => s.id));
      const extras = defaults
        .filter(d => !known.has(d.id))
        .map(d => ({ id: d.id, column: d.column, order: d.order }));
      // Remove stale widgets that no longer exist
      const validIds = new Set(defaults.map(d => d.id));
      return [...saved.filter(s => validIds.has(s.id)), ...extras];
    }
    return defaults.map(d => ({ id: d.id, column: d.column, order: d.order }));
  });

  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<{ id: string; column: number } | null>(null);

  const getColumns = useCallback((): WidgetPlacement[][] => {
    const cols: WidgetPlacement[][] = Array.from({ length: columnCount }, () => []);
    for (const p of placements) {
      const col = Math.min(p.column, columnCount - 1);
      cols[col].push(p);
    }
    for (const col of cols) {
      col.sort((a, b) => a.order - b.order);
    }
    return cols;
  }, [placements, columnCount]);

  const onDragStart = useCallback((widgetId: string) => {
    dragItem.current = widgetId;
  }, []);

  const onDragOver = useCallback((widgetId: string, column: number) => {
    dragOverItem.current = { id: widgetId, column };
  }, []);

  const onDragEnd = useCallback(() => {
    const fromId = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;

    if (!fromId || !to || fromId === to.id) return;

    setPlacements(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(p => p.id === fromId);
      const toIdx = next.findIndex(p => p.id === to.id);
      if (fromIdx < 0 || toIdx < 0) return prev;

      // Move dragged widget to target's column
      next[fromIdx] = { ...next[fromIdx], column: to.column };

      // Build the target column's ordered list
      const colItems = next
        .filter(p => p.column === to.column)
        .sort((a, b) => a.order - b.order);

      // Remove the dragged item and insert before/at the target
      const withoutDragged = colItems.filter(p => p.id !== fromId);
      const targetPos = withoutDragged.findIndex(p => p.id === to.id);
      const insertAt = targetPos >= 0 ? targetPos : withoutDragged.length;
      withoutDragged.splice(insertAt, 0, next[fromIdx]);

      // Reassign order values
      for (let i = 0; i < withoutDragged.length; i++) {
        const idx = next.findIndex(p => p.id === withoutDragged[i].id);
        if (idx >= 0) next[idx] = { ...next[idx], order: i };
      }

      saveOrder(next);
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    const fresh = defaults.map(d => ({ id: d.id, column: d.column, order: d.order }));
    setPlacements(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }, [defaults]);

  return { getColumns, onDragStart, onDragOver, onDragEnd, resetLayout, placements };
}
