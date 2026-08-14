import { readEnvironment } from "../config/environment.js";
import { loadRepositoryEnvironmentFile } from "../config/load-environment-file.js";
import { runDatabaseCommand } from "./cli.js";
import { closeMongoClient, getMongoDatabase } from "./client.js";
import { runMigrations } from "./migrations/index.js";

await runDatabaseCommand("MongoDB migration", async () => {
  loadRepositoryEnvironmentFile();
  const environment = readEnvironment();

  try {
    const database = await getMongoDatabase(environment.mongodb);
    await database.command({ ping: 1 });
    const result = await runMigrations(database);

    console.log(
      `MongoDB migrations complete for ${environment.mongodb.databaseName}: ${result.applied.length} applied, ${result.skipped.length} already present.`,
    );
  } finally {
    await closeMongoClient();
  }
});
