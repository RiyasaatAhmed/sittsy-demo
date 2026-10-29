import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import pluginQuery from "@tanstack/eslint-plugin-query";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // TanStack Query rules, e.g. every variable used in a queryFn must be in its queryKey.
  ...pluginQuery.configs["flat/recommended-strict"],
  // Architecture: code flows one way, shared → features → app (bulletproof-react).
  // Shared folders cannot import a feature or the app; features cannot import the
  // app or each other.
  {
    files: ["src/**/*.{ts,tsx}"],
    settings: { "import/resolver": { typescript: { project: "./tsconfig.json" } } },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: ["./src/components", "./src/hooks", "./src/lib", "./src/utils"],
              from: ["./src/features", "./src/app"],
              message: "Shared code must not depend on a feature or the app layer.",
            },
            {
              target: "./src/features",
              from: "./src/app",
              message: "Features must not depend on the app layer (app composes features).",
            },
            // Features are independent: the app layer composes them.
            {
              target: "./src/features/sitter-search",
              from: "./src/features",
              except: ["./sitter-search"],
              message: "Features must not import each other; compose them in src/app.",
            },
            {
              target: "./src/features/booking",
              from: "./src/features",
              except: ["./booking"],
              message: "Features must not import each other; compose them in src/app.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
