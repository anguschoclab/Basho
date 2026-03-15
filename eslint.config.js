import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] }
  ,
  {
    files: ["src/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          "object": "Math",
          "property": "random",
          "message": "Do not use Math.random() in engine code. Use rngFromSeed/rngForWorld (src/engine/rng.ts)."
        }
      ],
      "no-restricted-syntax": [
        "error",
        {
          "selector": "NewExpression[callee.name='SeededRNG']",
          "message": "Do not construct SeededRNG directly in engine code. Use rngFromSeed/rngForWorld (src/engine/rng.ts)."
        }
      ]
    }
  }
);