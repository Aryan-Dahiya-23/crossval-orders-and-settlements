import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const serviceFiles = ["apps/api/**/*.ts", "packages/contracts/**/*.ts"];
const webFiles = ["apps/web/**/*.{js,mjs,cjs,ts,jsx,tsx}"];

const scopeConfigs = (configs, files) =>
  configs.map((config) => ({
    ...config,
    files,
  }));

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/next-env.d.ts",
  ]),
  ...scopeConfigs(tseslint.configs.recommended, serviceFiles),
  ...scopeConfigs(nextVitals, webFiles),
  ...scopeConfigs(nextTypeScript, webFiles),
  {
    files: serviceFiles,
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
