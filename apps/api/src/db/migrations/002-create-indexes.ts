import { applicationIndexDefinitions } from "../indexes/index-definitions.js";
import type { DatabaseMigration } from "./types.js";

export const createIndexesMigration: DatabaseMigration = {
  id: "002_create_indexes",
  description: "Create named application indexes.",
  async up(database) {
    for (const definition of applicationIndexDefinitions) {
      await database
        .collection(definition.collectionName)
        .createIndexes([...definition.indexes]);
    }
  },
};
