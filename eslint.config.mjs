import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off generated enrichment helpers/results; production scripts live in scripts/.
    "generate-batch.js",
    "generate-all-batches.js",
    "generate_all_descriptions.mjs",
    "batch_*_descriptions.json",
    "listings_descriptions.json",
    "enriched-descriptions.json",
    "GENERATION_SUMMARY.txt",
  ]),
]);

export default eslintConfig;
