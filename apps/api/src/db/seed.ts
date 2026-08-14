import { readEnvironment } from "../config/environment.js";
import { loadRepositoryEnvironmentFile } from "../config/load-environment-file.js";
import { runDatabaseCommand } from "./cli.js";
import { closeMongoClient, getMongoDatabase } from "./client.js";
import { runMigrations } from "./migrations/index.js";
import { seedDevelopmentData } from "./seed-data.js";

await runDatabaseCommand("MongoDB seed", async () => {
  loadRepositoryEnvironmentFile();
  const environment = readEnvironment();

  try {
    const database = await getMongoDatabase(environment.mongodb);
    await runMigrations(database);
    const orderCount = await seedDevelopmentData(database);
    console.log(
      `Seeded ${orderCount} development orders in ${environment.mongodb.databaseName}.`,
    );
  } finally {
    await closeMongoClient();
  }
});
