import { createApp } from "./app.js";
import { readEnvironment } from "./config/environment.js";
import { getMongoDatabase } from "./db/client.js";

const environment = readEnvironment();
const database = await getMongoDatabase(environment.mongodb);

export const app = createApp({ database, environment });
export { createApp };
export default app;
