import type { IndexDescription } from "mongodb";

import { collectionNames } from "../collections.js";

export interface CollectionIndexDefinition {
  collectionName: string;
  indexes: readonly (IndexDescription & { name: string })[];
}

export const applicationIndexDefinitions: readonly CollectionIndexDefinition[] =
  [
    {
      collectionName: collectionNames.users,
      indexes: [
        {
          key: { email: 1 },
          name: "users_email_unique",
          unique: true,
        },
      ],
    },
    {
      collectionName: collectionNames.sessions,
      indexes: [
        {
          key: { tokenHash: 1 },
          name: "sessions_token_hash_unique",
          unique: true,
        },
        {
          key: { expiresAt: 1 },
          name: "sessions_expires_at_ttl",
          expireAfterSeconds: 0,
        },
        {
          key: { userId: 1 },
          name: "sessions_user_id",
        },
      ],
    },
    {
      collectionName: collectionNames.orders,
      indexes: [
        {
          key: { userId: 1, createdAt: -1, _id: -1 },
          name: "orders_user_created_at",
        },
        {
          key: { userId: 1, dueDate: 1, balanceDueCents: 1 },
          name: "orders_user_due_balance",
        },
        {
          key: {
            userId: 1,
            paymentCount: 1,
            dueDate: 1,
            balanceDueCents: 1,
          },
          name: "orders_user_payment_count_due_balance",
        },
        {
          key: { userId: 1, customerNameNormalized: 1, createdAt: -1 },
          name: "orders_user_customer_created_at",
        },
      ],
    },
  ];
