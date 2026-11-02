# Plan 04 — Synchronized PbP Timeline & Seekable Replay

## Problem

The canvas animation and the Commentary tab PbP list in `BoutNarrativeModal` are completely decoupled. The canvas runs its own RAF timer; the Commentary tab renders all lines statically at once. There is no visual connection between what you're watching and what you're reading.

Additionally, `BoutControls` only offers 1x and 2x playback speed. The progress bar is read-only (clicking it does nothing). There is no slow-motion (0.5x) option, which is valuable for appreciating dramatic throw techniques.

---

## Affected Files

| File                                                     | Change                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/components/game/boutReplay/useBoutReplay.ts`        | Expose `(phaseIndex, phaseProgress, totalDuration, elapsed)` in return value; add seek function |
| `src/components/game/boutReplay/BoutControls.tsx`        | Make progress bar seekable; add 0.5x speed button                                               |
| `src/components/game/BoutNarrativeModal.tsx`             | Subscribe to animation progress; highlight active PbpLine; auto-scroll                          |
| `src/components/game/boutReplay/boutCanvas/constants.ts` | Export `PHASE_TO_PBP_CATEGORY` mapping                                                          |
| `src/components/game/BoutReplayViewer.tsx`               | Thread `onProgressChange` callback and expose animation state ref                               |

---

## Step 1 — Expose animation progress from `useBoutReplay`

**File: `src/components/game/boutReplay/useBoutReplay.ts`**

The hook currently returns:

```typescript
return { canvasRef, isPlaying, play, pause, restart, setSpeed };
```

Extend the return shape:

```typescript
export interface BoutReplayProgress {
  phaseIndex: number; // 0–6 (maps to ReplayPhase enum index)
  phaseProgress: number; // 0–1 within current phase
  globalProgress: number; // 0–1 across the entire replay
  totalDurationMs: number; // sum of all phase durations
  elapsedMs: number; // current playhead position
}

export interface UseBoutReplayReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isPlaying: boolean;
  progress: BoutReplayProgress;
  play: () => void;
  pause: () => void;
  restart: () => void;
  setSpeed: (speed: 0.5 | 1 | 2) => void;
  seekTo: (globalProgress: number) => void; // new
}
```

Inside the hook, maintain a `progressRef` that is updated every RAF frame:

```typescript
const progressRef = useRef<BoutReplayProgress>({
  phaseIndex: 0,
  phaseProgress: 0,
  globalProgress: 0,
  totalDurationMs: 0,
  elapsedMs: 0,
});
const [progress, setProgress] = useState<BoutReplayProgress>(progressRef.current);

// Inside RAF loop, after computing phaseIndex and phaseProgress:
const totalDurationMs = phaseDurations.reduce((a, b) => a + b, 0);
const elapsedMs =
  phaseDurations.slice(0, phaseIndex).reduce((a, b) => a + b, 0) +
  phaseProgress * phaseDurations[phaseIndex];

progressRef.current = {
  phaseIndex,
  phaseProgress,
  globalProgress: elapsedMs / totalDurationMs,
  totalDurationMs,
  elapsedMs,
};

// Throttle React state update to every 100ms to avoid over-rendering
if (Date.now() - lastProgressUpdateRef.current > 100) {
  setProgress({ ...progressRef.current });
  lastProgressUpdateRef.current = Date.now();
}
```

### Seek implementation

```typescript
const seekTo = useCallback(
  (targetGlobalProgress: number) => {
    const total = phaseDurations.reduce((a, b) => a + b, 0);
    const targetMs = Math.max(0, Math.min(total, targetGlobalProgress * total));

    // Find the phase containing targetMs
    let accumulated = 0;
    let targetPhase = 0;
    let targetPhaseProgress = 0;

    for (let i = 0; i < phaseDurations.length; i++) {
      const phaseDur = phaseDurations[i];
      if (accumulated + phaseDur >= targetMs) {
        targetPhase = i;
        targetPhaseProgress = (targetMs - accumulated) / phaseDur;
        break;
      }
      accumulated += phaseDur;
      targetPhase = i;
      targetPhaseProgress = 1;
    }

    // Update animation state synchronously before next frame
    phaseIndexRef.current = targetPhase;
    phaseProgressRef.current = targetPhaseProgress;
    // Force a canvas redraw
    drawFrameImmediate();
  },
  [phaseDurations]
);
```

---

## Step 2 — Seekable progress bar + 0.5x speed

**File: `src/components/game/boutReplay/BoutControls.tsx`**

Current progress bar (read-only):

```tsx
<div className="h-1 bg-muted rounded-full">
  <div className="h-1 bg-primary rounded-full" style={{ width: `${progress * 100}%` }} />
</div>
```

Replace with a real `<input type="range">`:

```tsx
interface BoutControlsProps {
  isPlaying: boolean;
  progress: number; // 0–1 globalProgress
  speed: 0.5 | 1 | 2;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (s: 0.5 | 1 | 2) => void;
  onSeek: (p: number) => void; // new
}

// Seekable slider:
<input
  type="range"
  min={0}
  max={1000}
  value={Math.round(progress * 1000)}
  onChange={(e) => onSeek(Number(e.target.value) / 1000)}
  className="w-full h-1 accent-primary cursor-pointer"
  aria-label="Replay position"
/>;
```

Speed buttons — add 0.5x:

```tsx
const SPEEDS: Array<0.5 | 1 | 2> = [0.5, 1, 2];

{
  SPEEDS.map((s) => (
    <button
      key={s}
      onClick={() => onSpeedChange(s)}
      className={cn(
        "text-xs px-2 py-0.5 rounded",
        speed === s && "bg-primary text-primary-foreground"
      )}
    >
      {s}x
    </button>
  ));
}
```

The `setSpeed` function in `useBoutReplay.ts` must accept `0.5`:

```typescript
// Change type signature:
const setSpeed = useCallback((s: 0.5 | 1 | 2) => { ... }, []);
// In RAF loop, divide delta by speed (0.5 = half speed):
const scaledDelta = delta / speed;
```

---

## Step 3 — Phase-to-PbpLine mapping

**File: `src/components/game/boutReplay/boutCanvas/constants.ts`**

Add a mapping from canvas `ReplayPhase` to `PbpLine.phase` category tags:

```typescript
// Maps canvas animation phase index to PbpLine phase tag values
export const CANVAS_PHASE_TO_PBP_PHASE: Record<number, string[]> = {
  0: ["tactical"], // ritual → tactical setup lines
  1: ["tachiai"], // tachiai phase
  2: ["clinch", "tachiai"], // clinch phase (may include tachiai follow-up)
  3: ["momentum"], // momentum phase
  4: ["momentum", "finish"], // finish approach
  5: ["finish"], // finish
  6: ["finish"], // ceremony
};
```

---

## Step 4 — Active line highlighting in `BoutNarrativeModal`

**File: `src/components/game/BoutNarrativeModal.tsx`**

The modal currently renders `pbpLines` as a static list. Subscribe to animation progress and highlight the relevant lines:

```tsx
// Receive progress from BoutReplayViewer via a ref callback or lifted state
const [animProgress, setAnimProgress] = useState<BoutReplayProgress | null>(null);

// Compute active line indices
const activeLineIndices = useMemo(() => {
  if (!animProgress) return new Set<number>();
  const activePbpPhases = CANVAS_PHASE_TO_PBP_PHASE[animProgress.phaseIndex] ?? [];
  const indices = new Set<number>();
  pbpLines.forEach((line, i) => {
    if (line.phase && activePbpPhases.includes(line.phase)) {
      indices.add(i);
    }
  });
  return indices;
}, [animProgress, pbpLines]);
```

Render each line with conditional highlight:

```tsx
{
  pbpLines.map((line, i) => (
    <div
      key={line.id ?? i}
      ref={activeLineIndices.has(i) ? activeLineRef : undefined}
      className={cn(
        "flex gap-2 items-start py-1 px-2 rounded transition-colors duration-300",
        activeLineIndices.has(i) ? "bg-primary/10 border-l-2 border-primary" : "opacity-60"
      )}
      style={{ animationDelay: `${i * 60}ms` }}
    >
      {/* existing phase badge + text render */}
    </div>
  ));
}
```

### Auto-scroll to active line

```tsx
const activeLineRef = useRef<HTMLDivElement>(null);
const commentaryScrollRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (activeLineRef.current && commentaryScrollRef.current) {
    activeLineRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
}, [activeLineIndices]);
```

---

## Step 5 — Thread animation progress up through `BoutReplayViewer`

**File: `src/components/game/BoutReplayViewer.tsx`**

`BoutReplayViewer` currently just renders the canvas and `BoutControls`. It needs to expose animation state upward to `BoutNarrativeModal`.

Option A (recommended): use a `onProgressUpdate` callback prop:

```tsx
interface BoutReplayViewerProps {
  // ... existing props
  onProgressUpdate?: (progress: BoutReplayProgress) => void;
}
```

Inside `BoutReplayViewer`, pass the callback to `useBoutReplay`:

```typescript
// useBoutReplay calls onProgressUpdate inside the RAF loop
// (throttled to 100ms to avoid flooding renders)
```

`BoutNarrativeModal` passes `setAnimProgress` as `onProgressUpdate`:

```tsx
<BoutReplayViewer
  result={result}
  eastRikishi={east}
  westRikishi={west}
  onProgressUpdate={setAnimProgress}
  autoPlay={autoPlay}
/>
```

---

## Step 6 — Wire seekTo through BoutReplayViewer

```tsx
// BoutReplayViewer exposes seekTo via a ref (imperative handle pattern):
export interface BoutReplayViewerHandle {
  seekTo: (progress: number) => void;
}

const BoutReplayViewer = forwardRef<BoutReplayViewerHandle, BoutReplayViewerProps>(
  (props, ref) => {
    const { seekTo, ...rest } = useBoutReplay(...);

    useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    return (
      <>
        <canvas ref={rest.canvasRef} ... />
        <BoutControls
          {...rest}
          onSeek={seekTo}
        />
      </>
    );
  }
);
```

`BoutNarrativeModal` holds a `viewerRef = useRef<BoutReplayViewerHandle>()` and passes it to `BoutReplayViewer`.

---

## Data Flow Summary

```
useBoutReplay (RAF loop)
  → setProgress (throttled, 100ms)
  → BoutReplayViewer.onProgressUpdate(progress)
  → BoutNarrativeModal.setAnimProgress(progress)
  → activeLineIndices computed from phaseIndex
  → Commentary tab highlights + scrolls to active lines

User drags scrub bar
  → BoutControls.onSeek(fraction)
  → BoutReplayViewer ref.seekTo(fraction)
  → useBoutReplay.seekTo(fraction)
  → phaseIndexRef + phaseProgressRef updated
  → canvas redraws immediately
```

---

## Testing Checklist

- [ ] Press play — active PbpLine highlight advances through Commentary tab
- [ ] Active line auto-scrolls into view without jerking
- [ ] Drag scrub bar to 50% — canvas jumps to mid-bout, highlight updates
- [ ] Drag to 95% — canvas jumps to ceremony phase
- [ ] 0.5x speed: replay runs at half speed (visibly slower)
- [ ] 2x speed: replay unchanged in behavior
- [ ] Speed change mid-playback works without visual glitch
- [ ] Lines with no `phase` tag remain visible but de-emphasized (opacity-60)
- [ ] `npx tsc --noEmit` passes
- [ ] `npx vitest run` — all 1703 tests pass

---

## Estimated Effort

3–4 days. The seek logic is the trickiest piece (computing `phaseIndex + phaseProgress` from a global fraction while the phase durations are not uniform). The highlight and auto-scroll are straightforward. The `forwardRef` / `useImperativeHandle` wiring adds a small amount of boilerplate.
