import type { Db, Document } from "mongodb";

import type { CollectionValidationDefinition } from "../validators/collection-validators.js";

export const applyCollectionValidation = async (
  database: Db,
  definition: CollectionValidationDefinition,
): Promise<void> => {
  const exists = await database
    .listCollections({ name: definition.name }, { nameOnly: true })
    .hasNext();

  const options = {
    validator: definition.validator,
    validationLevel: definition.validationLevel,
    validationAction: definition.validationAction,
  } as const;

  if (!exists) {
    await database.createCollection(definition.name, options);
    return;
  }

  await database.command({
    collMod: definition.name,
    ...options,
  } as Document);
};
