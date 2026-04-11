import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": "warn",
      "no-case-declarations": "error",
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/ban-ts-comment": "warn",
    },
  },
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
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["../components/*", "../pages/*", "../hooks/*", "../contexts/*", "../presenters/*", "@/components/*", "@/pages/*", "@/hooks/*", "@/contexts/*", "@/presenters/*"],
              "message": "Engine code must not import from UI or React layers to maintain architectural boundaries."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "patterns": [
            {
              "group": ["**/engine/types/world", "**/engine/tick/*", "**/engine/storage/*"],
              "message": "UI components should only consume processed UIDigest. Direct access to raw engine state or systems is forbidden."
            },
            {
              "group": ["**/engine/!(types/common|worker/*)"],
              "message": "Importing logic from src/engine/ is forbidden. Use src/presenters/ or src/engine/types/common."
            }
          ]
        }
      ]
    }
  }
);
