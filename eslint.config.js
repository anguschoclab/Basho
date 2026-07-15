import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      ".git",
      "coverage",
      "build",
      "out",
      "public",
      "resources",
      "*.lock",
      "*.config.*",
    ],
  },
  {
    // Upgraded to strict
    extends: [js.configs.recommended, ...tseslint.configs.strict],
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

      // Standard enforcement for Fast Refresh
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      /**
       * Note: Rule silencing overrides have been removed.
       * The 'strict' preset now enforces 'error' level for:
       * - @typescript-eslint/no-explicit-any
       * - @typescript-eslint/no-unused-vars
       * - @typescript-eslint/ban-ts-comment
       * - @typescript-eslint/no-require-imports
       * - @typescript-eslint/no-empty-object-type
       * - no-empty
       */

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-case-declarations": "error",
    },
  },
  {
    /* ARCHITECTURAL BOUNDARY: ENGINE */
    files: ["src/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "Do not use Math.random() in engine code. Use rngFromSeed/rngForWorld (src/engine/rng.ts).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../components/*",
                "../pages/*",
                "../hooks/*",
                "../contexts/*",
                "../presenters/*",
                "@/components/*",
                "@/pages/*",
                "@/hooks/*",
                "@/contexts/*",
                "@/presenters/*",
              ],
              message:
                "Engine code must not import from UI or React layers to maintain architectural boundaries.",
            },
          ],
        },
      ],
    },
  },
  {
    /* TEST FILES: allow any and non-null assertions for test mocks */
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    /* ARCHITECTURAL BOUNDARY: UI/PAGES */
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/engine/types/world", "**/engine/tick/*", "**/engine/storage/*"],
              message:
                "UI components should only consume processed UIDigest. Direct access to raw engine state or systems is forbidden.",
            },
            {
              group: ["**/engine/!(types/common|worker/*)"],
              message:
                "Importing logic from src/engine/ is forbidden. Use src/presenters/ or src/engine/types/common.",
            },
          ],
        },
      ],
    },
  }
);
