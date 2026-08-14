import { readEnvironment } from "../config/environment.js";
import { loadRepositoryEnvironmentFile } from "../config/load-environment-file.js";
import { runDatabaseCommand } from "./cli.js";
import { closeMongoClient, getMongoDatabase } from "./client.js";
import { runMigrations } from "./migrations/index.js";
import { assertDisposableDatabase } from "./safety.js";
import { seedDevelopmentData } from "./seed-data.js";

await runDatabaseCommand("MongoDB reset", async () => {
  if (!process.argv.includes("--confirm")) {
    throw new Error("Database reset requires the explicit --confirm flag.");
  }

  loadRepositoryEnvironmentFile();
  const environment = readEnvironment();
  assertDisposableDatabase(environment.mongodb.databaseName);

  try {
    const database = await getMongoDatabase(environment.mongodb);
    await database.dropDatabase();
    await runMigrations(database);
    const orderCount = await seedDevelopmentData(database);
    console.log(
      `Reset ${environment.mongodb.databaseName} and seeded ${orderCount} development orders.`,
    );
  } finally {
    await closeMongoClient();
  }
});
