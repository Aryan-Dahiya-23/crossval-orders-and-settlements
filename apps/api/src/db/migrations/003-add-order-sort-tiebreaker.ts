import { collectionNames } from "../collections.js";
import type { DatabaseMigration } from "./types.js";

export const addOrderSortTiebreakerMigration: DatabaseMigration = {
  id: "003_add_order_sort_tiebreaker",
  description: "Add ObjectId tie-breaker to the owned newest-orders index.",
  async up(database) {
    const orders = database.collection(collectionNames.orders);
    await orders.dropIndex("orders_user_created_at").catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "codeName" in error &&
        error.codeName === "IndexNotFound"
      ) {
        return;
      }
      throw error;
    });
    await orders.createIndex(
      { userId: 1, createdAt: -1, _id: -1 },
      { name: "orders_user_created_at" },
    );
  },
};
