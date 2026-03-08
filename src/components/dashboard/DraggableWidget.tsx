import React, { useState, useRef } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  widgetId: string;
  column: number;
  label: string;
  isEditMode: boolean;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, column: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}

export function DraggableWidget({
  widgetId,
  column,
  label,
  isEditMode,
  onDragStart,
  onDragOver,
  onDragEnd,
  children,
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      draggable={isEditMode}
      onDragStart={(e) => {
        if (!isEditMode) return;
        setIsDragging(true);
        onDragStart(widgetId);
        e.dataTransfer.effectAllowed = "move";
        // Ghost image
        if (ref.current) {
          e.dataTransfer.setDragImage(ref.current, 20, 20);
        }
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
      }}
      onDragOver={(e) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
        onDragOver(widgetId, column);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      className={cn(
        "transition-all duration-200 relative",
        isEditMode && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40 scale-[0.98]",
        isDragOver && isEditMode && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-lg",
      )}
    >
      {isEditMode && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full z-10 flex items-center">
          <GripVertical className="h-4 w-4 text-muted-foreground/60" />
        </div>
      )}
      {children}
    </div>
  );
}

/** Empty column drop zone for dragging widgets into empty columns */
export function ColumnDropZone({
  column,
  isEditMode,
  onDragOver,
  onDragEnd,
}: {
  column: number;
  isEditMode: boolean;
  onDragOver: (id: string, column: number) => void;
  onDragEnd: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isEditMode) return null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        // Use a sentinel id for "end of column"
        onDragOver(`__col_end_${column}`, column);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
      className={cn(
        "min-h-[48px] rounded-lg border-2 border-dashed transition-colors",
        isDragOver ? "border-primary/50 bg-primary/5" : "border-border/30",
      )}
    />
  );
}
