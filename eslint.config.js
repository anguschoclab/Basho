import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import reactCompiler from "eslint-plugin-react-compiler";
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
      "src/**/__audit_test__/**",
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
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      "react-compiler/react-compiler": "warn",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "no-case-declarations": "error",

      "no-useless-assignment": "warn",
      "no-unassigned-vars": "warn",
      "preserve-caught-error": "warn",
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
      "no-useless-assignment": "off",
    },
  },
  {
    /* BARREL/ROUTE FILES: react-refresh doesn't apply to pure re-export or route config files */
    files: ["src/components/ui/index.ts", "src/components/ui/sidebar.tsx", "src/routes.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
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
              group: [
                "@/engine/ai",
                "@/engine/ai/*",
                "@/engine/almanac",
                "@/engine/almanac/*",
                "@/engine/archetype",
                "@/engine/banzuke",
                "@/engine/bard",
                "@/engine/bard/*",
                "@/engine/bout",
                "@/engine/bout/*",
                "@/engine/core",
                "@/engine/core/*",
                "@/engine/descriptorBands",
                "@/engine/facilities",
                "@/engine/glossary",
                "@/engine/glossary/*",
                "@/engine/hallOfFame",
                "@/engine/historyIndex",
                "@/engine/lineage",
                "@/engine/perception",
                "@/engine/queries",
                "@/engine/rivalries",
                "@/engine/rng",
                "@/engine/saveload",
                "@/engine/selectors",
                "@/engine/shikona",
                "@/engine/shikona/*",
                "@/engine/systems",
                "@/engine/systems/*",
                "@/engine/utils",
                "@/engine/utils/*",
              ],
              message:
                "Importing logic from src/engine/ is forbidden. Use src/presenters/ for engine access.",
            },
          ],
        },
      ],
    },
  }
);
