import type { Db } from "mongodb";

export interface DatabaseMigration {
  id: string;
  description: string;
  up(database: Db): Promise<void>;
}

export interface MigrationRunResult {
  applied: string[];
  skipped: string[];
}
