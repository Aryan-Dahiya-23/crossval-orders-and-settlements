import { applicationCollectionValidations } from "../validators/collection-validators.js";
import { applyCollectionValidation } from "./helpers.js";
import type { DatabaseMigration } from "./types.js";

export const createCollectionsMigration: DatabaseMigration = {
  id: "001_create_collections",
  description: "Create application collections and strict validators.",
  async up(database) {
    for (const definition of applicationCollectionValidations) {
      await applyCollectionValidation(database, definition);
    }
  },
};
