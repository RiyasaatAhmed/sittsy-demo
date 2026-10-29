import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    // A module uses another module only through its entry point (../ranking),
    // never its internal files (../ranking/weights).
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["../*/*"], message: "Import another module through its entry point, e.g. ../ranking." }] },
      ],
    },
  },
]);
