const fs = require('fs');

const file = 'src/components/dashboard/TrainingWidget.tsx';
let content = fs.readFileSync(file, 'utf8');

const constants = `
const INTENSITY_OPTIONS: TrainingIntensity[] = ["conservative", "balanced", "intensive", "punishing"];
const FOCUS_OPTIONS: TrainingFocus[] = ["neutral", "power", "speed", "technique", "balance"];
const RECOVERY_OPTIONS: RecoveryEmphasis[] = ["low", "normal", "high"];
`;

// Looking for the target map to extract to constant array
const useMemoContent = `
  const multiplierData = useMemo(() => [
    { label: "Growth", value: intensityInfo.growth, icon: Zap, color: "bg-primary" },
    { label: "Fatigue", value: intensityInfo.fatigue, icon: Activity, color: intensityInfo.fatigue > 1.2 ? "bg-destructive" : "bg-warning" },
    { label: "Recovery", value: recoveryInfo.fatigueDecay, icon: Shield, color: "bg-success" },
  ], [intensityInfo.growth, intensityInfo.fatigue, recoveryInfo.fatigueDecay]);
`;

// It might be easier to just avoid redefining the array and fix the problem since the issue was object reference.
// The review specifically points out:
// In TrainingWidget, the code maps over an inline array of newly constructed objects ({ label: "Intensity", value: ... }) and passes the whole object as a prop m={m} to the memoized MultiplierBar. Because m is a brand new object reference on every render, React.memo fails to prevent re-renders here. Passing primitive props directly (e.g., label={m.label} value={m.value}) would have been the correct optimization approach.

// I have already replaced `m={m}` with primitive props `label={m.label} value={m.value} icon={m.icon} color={m.color}`.
// We can also extract the loop entirely and define the components, let's verify if my change worked.
