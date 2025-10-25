import { Definition } from "../Definition";
import LibLogger from "../logger";
import { ComKey, createUpsertWrapper, Item, NotFoundError, PriKey, UpsertMethod } from "@fjell/core";
import * as Library from "@fjell/lib";

const logger = LibLogger.get('ops', 'upsert');

export const getUpsertOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(

    firestore: FirebaseFirestore.Firestore,

    definition: Definition<V, S, L1, L2, L3, L4, L5>,

    registry: Library.Registry,
    operations: Library.Operations<V, S, L1, L2, L3, L4, L5>
  ): UpsertMethod<V, S, L1, L2, L3, L4, L5> => {

  return createUpsertWrapper(
    definition.coordinate,
    async (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      itemProperties: Partial<Item<S, L1, L2, L3, L4, L5>>
    ): Promise<V> => {
      logger.default('upsert', { key, itemProperties });

      let item: V | null = null;

      // Try to get existing item or create if not found
      try {
        logger.default('Retrieving item by key', { key });
        item = await operations.get(key);
      } catch (error: any) {
        // Check if this is a NotFoundError (preserved by core wrapper)
        if (error instanceof NotFoundError) {
          // Item doesn't exist, create it
          logger.default('Item not found, creating new item', { key });
          item = await operations.create(itemProperties, { key });
        } else {
          // Re-throw other errors (connection issues, permissions, etc.)
          throw error;
        }
      }

      if (!item) {
        throw new Error(`Failed to retrieve or create item for key: ${JSON.stringify(key)}`);
      }

      // Always update the item with the new properties (this is what makes it an "upsert")
      logger.default('Updating item with properties', { key: item.key, itemProperties });
      item = await operations.update(item.key, itemProperties);
      logger.default('Item upserted successfully', { item });

      return item;
    }
  );
};
