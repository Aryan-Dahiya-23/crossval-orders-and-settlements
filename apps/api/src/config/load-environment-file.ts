import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryEnvironmentPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../.env",
);

export const loadRepositoryEnvironmentFile = (): void => {
  if (existsSync(repositoryEnvironmentPath)) {
    process.loadEnvFile(repositoryEnvironmentPath);
  }
};
