import { MongoServerError, type Db } from "mongodb";

import { getCollections } from "../collections.js";
import { schemaMigrationValidation } from "../validators/collection-validators.js";
import { createCollectionsMigration } from "./001-create-collections.js";
import { createIndexesMigration } from "./002-create-indexes.js";
import { addOrderSortTiebreakerMigration } from "./003-add-order-sort-tiebreaker.js";
import { applyCollectionValidation } from "./helpers.js";
import type { DatabaseMigration, MigrationRunResult } from "./types.js";

const migrations: readonly DatabaseMigration[] = [
  createCollectionsMigration,
  createIndexesMigration,
  addOrderSortTiebreakerMigration,
];

export const runMigrations = async (
  database: Db,
): Promise<MigrationRunResult> => {
  await applyCollectionValidation(database, schemaMigrationValidation);
  const { schemaMigrations } = getCollections(database);
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    const existing = await schemaMigrations.findOne(
      { _id: migration.id },
      { projection: { _id: 1 } },
    );

    if (existing !== null) {
      skipped.push(migration.id);
      continue;
    }

    await migration.up(database);

    try {
      await schemaMigrations.insertOne({
        _id: migration.id,
        description: migration.description,
        appliedAt: new Date(),
      });
      applied.push(migration.id);
    } catch (error: unknown) {
      if (error instanceof MongoServerError && error.code === 11_000) {
        skipped.push(migration.id);
        continue;
      }

      throw error;
    }
  }

  return { applied, skipped };
};
