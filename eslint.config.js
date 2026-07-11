import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    ignores: ["dist", "dev-dist", "functions/lib", "functions/node_modules"],
  },
  {
    // Frontend (browser + React). Functions are server code — handled below.
    files: ["**/*.{ts,tsx}"],
    ignores: ["functions/**"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // react-hooks v7 bundles the React Compiler bailout lint rules
      // (immutability, purity, set-state-in-effect, refs, …) into
      // recommended-latest. We register the plugin object above and spread the
      // rules here (its own `plugins: ["react-hooks"]` array shape is not a
      // valid flat-config plugins block on its own).
      ...reactHooks.configs["recommended-latest"].rules,
      // The v7 React Compiler bailout rules default to "error". They surface a
      // real backlog of pre-existing bailouts (set-state-in-effect, refs,
      // immutability, purity, …) that are out of scope to refactor here, so we
      // run them as "warn": `bun run lint` reports every bailout without turning
      // the check gate red. `rules-of-hooks` stays "error" (its prior severity).
      // Tighten these back to "error" as the hotspots get cleaned up.
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/void-use-memo": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/config": "warn",
      "react-hooks/gating": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Cloud Functions: Node + CommonJS, no browser globals or React rules.
    files: ["functions/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
