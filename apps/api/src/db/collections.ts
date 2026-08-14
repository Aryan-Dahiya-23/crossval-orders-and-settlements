import type { Collection, Db } from "mongodb";

import type {
  OrderDocument,
  SchemaMigrationDocument,
  SessionDocument,
  UserDocument,
} from "./documents.js";

export const collectionNames = {
  users: "users",
  sessions: "sessions",
  orders: "orders",
  schemaMigrations: "schema_migrations",
} as const;

export interface DatabaseCollections {
  users: Collection<UserDocument>;
  sessions: Collection<SessionDocument>;
  orders: Collection<OrderDocument>;
  schemaMigrations: Collection<SchemaMigrationDocument>;
}

export const getCollections = (database: Db): DatabaseCollections => ({
  users: database.collection<UserDocument>(collectionNames.users),
  sessions: database.collection<SessionDocument>(collectionNames.sessions),
  orders: database.collection<OrderDocument>(collectionNames.orders),
  schemaMigrations: database.collection<SchemaMigrationDocument>(
    collectionNames.schemaMigrations,
  ),
});
