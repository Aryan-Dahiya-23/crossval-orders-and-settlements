import {
  type Db,
  MongoClient,
  ServerApiVersion,
  type MongoClientOptions,
} from "mongodb";

import type { Environment } from "../config/environment.js";

export type MongoDatabaseConfig = Environment["mongodb"];

interface ClientState {
  configKey: string;
  client: MongoClient;
  connection: Promise<MongoClient>;
}

let clientState: ClientState | undefined;

const configKey = (config: MongoDatabaseConfig): string =>
  `${config.uri}\u0000${config.databaseName}`;

export const createMongoClient = (config: MongoDatabaseConfig): MongoClient => {
  const options: MongoClientOptions = {
    appName: "crossval-orders-settlements-api",
    minPoolSize: 0,
    maxPoolSize: config.maxPoolSize,
    waitQueueTimeoutMS: config.waitQueueTimeoutMs,
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMs,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  };

  return new MongoClient(config.uri, options);
};

export const getMongoClient = async (
  config: MongoDatabaseConfig,
): Promise<MongoClient> => {
  const nextKey = configKey(config);

  if (clientState !== undefined) {
    if (clientState.configKey !== nextKey) {
      throw new Error(
        "The process MongoClient is already configured for another database.",
      );
    }

    return clientState.connection;
  }

  const client = createMongoClient(config);
  const connection = client.connect().catch(async (error: unknown) => {
    clientState = undefined;
    await client.close().catch(() => undefined);
    throw error;
  });

  clientState = { configKey: nextKey, client, connection };
  return connection;
};

export const getMongoDatabase = async (
  config: MongoDatabaseConfig,
): Promise<Db> => {
  const client = await getMongoClient(config);
  return client.db(config.databaseName);
};

export const closeMongoClient = async (): Promise<void> => {
  const state = clientState;
  clientState = undefined;

  if (state === undefined) {
    return;
  }

  await state.client.close();
};
