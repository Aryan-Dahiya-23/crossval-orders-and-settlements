import { createApp } from "./app.js";
import { readEnvironment } from "./config/environment.js";
import { loadRepositoryEnvironmentFile } from "./config/load-environment-file.js";
import { closeMongoClient, getMongoDatabase } from "./db/client.js";

const startServer = async (): Promise<void> => {
  loadRepositoryEnvironmentFile();
  const environment = readEnvironment();
  const database = await getMongoDatabase(environment.mongodb);
  await database.command({ ping: 1 });
  const app = createApp({ database, environment });

  const server = app.listen(environment.apiPort, () => {
    console.log(
      `CrossVal API listening on http://localhost:${environment.apiPort}`,
    );
  });

  let shutdownStarted = false;

  const shutdown = (signal: NodeJS.Signals): void => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;
    console.log(`Received ${signal}; closing the API server.`);
    server.close(async (error) => {
      try {
        await closeMongoClient();
      } catch {
        console.error("MongoDB shutdown failed.");
        process.exitCode = 1;
      }

      if (error !== undefined) {
        console.error("API server shutdown failed.");
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
};

try {
  await startServer();
} catch {
  console.error(
    "API startup failed. Check environment configuration and MongoDB connectivity.",
  );
  await closeMongoClient().catch(() => undefined);
  process.exitCode = 1;
}
