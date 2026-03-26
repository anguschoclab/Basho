import fs from 'fs';
let code = fs.readFileSync('src/components/game/TimeControls.tsx', 'utf8');

if (!code.includes('toDurationBand')) {
  code = code.replace(
    /import \{ useToast \} from "@\/hooks\/use-toast";/g,
    `import { useToast } from "@/hooks/use-toast";\nimport { toDurationBand, DURATION_LABELS } from "@/engine/descriptorBands";`
  );

  code = code.replace(
    /toast\(\{ title: "Week advanced", description: "Training, economy, and governance have progressed." \}\);/,
    `toast({ title: "Time advanced", description: \`\${DURATION_LABELS[toDurationBand(7)]} passed.\` });`
  );

  code = code.replace(
    /toast\(\{ title: "Day advanced", description: \`Day \$\{\(world.dayIndexGlobal \|\| 0\) \+ 1\} complete.\` \}\);/,
    `toast({ title: "Time advanced", description: \`\${DURATION_LABELS[toDurationBand(1)]} passed.\` });`
  );

  fs.writeFileSync('src/components/game/TimeControls.tsx', code);
}
