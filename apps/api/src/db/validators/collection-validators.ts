import type { Document } from "mongodb";

import { collectionNames } from "../collections.js";

export interface CollectionValidationDefinition {
  name: string;
  validator: Document;
  validationLevel: "strict";
  validationAction: "error";
}

const dateOnlyPattern = "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";
const uuidPattern =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";
const sha256Pattern = "^[0-9a-f]{64}$";
const maximumMoneyCents = 999_999_999;

export const schemaMigrationValidation: CollectionValidationDefinition = {
  name: collectionNames.schemaMigrations,
  validationLevel: "strict",
  validationAction: "error",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "description", "appliedAt"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "string", minLength: 1, maxLength: 100 },
        description: { bsonType: "string", minLength: 1, maxLength: 300 },
        appliedAt: { bsonType: "date" },
      },
    },
  },
};

export const applicationCollectionValidations: readonly CollectionValidationDefinition[] =
  [
    {
      name: collectionNames.users,
      validationLevel: "strict",
      validationAction: "error",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["_id", "email", "passwordHash", "createdAt", "updatedAt"],
          additionalProperties: false,
          properties: {
            _id: { bsonType: "objectId" },
            email: {
              bsonType: "string",
              minLength: 3,
              maxLength: 254,
              pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
            },
            passwordHash: { bsonType: "string", minLength: 20, maxLength: 512 },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" },
          },
        },
      },
    },
    {
      name: collectionNames.sessions,
      validationLevel: "strict",
      validationAction: "error",
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["_id", "userId", "tokenHash", "expiresAt", "createdAt"],
          additionalProperties: false,
          properties: {
            _id: { bsonType: "objectId" },
            userId: { bsonType: "objectId" },
            tokenHash: { bsonType: "string", pattern: sha256Pattern },
            expiresAt: { bsonType: "date" },
            createdAt: { bsonType: "date" },
          },
        },
      },
    },
    {
      name: collectionNames.orders,
      validationLevel: "strict",
      validationAction: "error",
      validator: {
        $and: [
          {
            $jsonSchema: {
              bsonType: "object",
              required: [
                "_id",
                "userId",
                "customerName",
                "customerNameNormalized",
                "dueDate",
                "lineItems",
                "totalAmountCents",
                "balanceDueCents",
                "paymentCount",
                "payments",
                "createdAt",
                "updatedAt",
              ],
              additionalProperties: false,
              properties: {
                _id: { bsonType: "objectId" },
                userId: { bsonType: "objectId" },
                customerName: {
                  bsonType: "string",
                  minLength: 1,
                  maxLength: 200,
                },
                customerNameNormalized: {
                  bsonType: "string",
                  minLength: 1,
                  maxLength: 200,
                },
                dueDate: { bsonType: "string", pattern: dateOnlyPattern },
                lineItems: {
                  bsonType: "array",
                  minItems: 1,
                  maxItems: 100,
                  items: {
                    bsonType: "object",
                    required: [
                      "_id",
                      "description",
                      "quantity",
                      "unitPriceCents",
                      "position",
                    ],
                    additionalProperties: false,
                    properties: {
                      _id: { bsonType: "objectId" },
                      description: {
                        bsonType: "string",
                        minLength: 1,
                        maxLength: 500,
                      },
                      quantity: {
                        bsonType: "int",
                        minimum: 1,
                        maximum: 1_000_000,
                      },
                      unitPriceCents: {
                        bsonType: "int",
                        minimum: 1,
                        maximum: maximumMoneyCents,
                      },
                      position: {
                        bsonType: "int",
                        minimum: 0,
                        maximum: 99,
                      },
                    },
                  },
                },
                totalAmountCents: {
                  bsonType: "int",
                  minimum: 1,
                  maximum: maximumMoneyCents,
                },
                balanceDueCents: {
                  bsonType: "int",
                  minimum: 0,
                  maximum: maximumMoneyCents,
                },
                paymentCount: {
                  bsonType: "int",
                  minimum: 0,
                  maximum: 1_000,
                },
                payments: {
                  bsonType: "array",
                  maxItems: 1_000,
                  items: {
                    bsonType: "object",
                    required: [
                      "_id",
                      "amountCents",
                      "paymentDate",
                      "note",
                      "idempotencyKey",
                      "requestFingerprint",
                      "createdAt",
                    ],
                    additionalProperties: false,
                    properties: {
                      _id: { bsonType: "objectId" },
                      amountCents: {
                        bsonType: "int",
                        minimum: 1,
                        maximum: maximumMoneyCents,
                      },
                      paymentDate: {
                        bsonType: "string",
                        pattern: dateOnlyPattern,
                      },
                      note: {
                        bsonType: ["string", "null"],
                        maxLength: 500,
                      },
                      idempotencyKey: {
                        bsonType: "string",
                        pattern: uuidPattern,
                      },
                      requestFingerprint: {
                        bsonType: "string",
                        pattern: sha256Pattern,
                      },
                      createdAt: { bsonType: "date" },
                    },
                  },
                },
                createdAt: { bsonType: "date" },
                updatedAt: { bsonType: "date" },
              },
            },
          },
          {
            $expr: {
              $and: [
                { $lte: ["$balanceDueCents", "$totalAmountCents"] },
                { $eq: ["$paymentCount", { $size: "$payments" }] },
                {
                  $eq: [
                    { $subtract: ["$totalAmountCents", "$balanceDueCents"] },
                    { $sum: "$payments.amountCents" },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  ];
