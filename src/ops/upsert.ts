import { Definition } from "../Definition";
import LibLogger from "../logger";
import { ComKey, createUpsertWrapper, Item, LocKeyArray, NotFoundError, PriKey, UpdateOptions, UpsertMethod } from "@fjell/core";
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
      itemProperties: Partial<Item<S, L1, L2, L3, L4, L5>>,
      locations?: LocKeyArray<L1, L2, L3, L4, L5>,
      options?: UpdateOptions
    ): Promise<V> => {
      logger.default('upsert', { key, itemProperties, locations, options });

      let item: V | null = null;

      // Try to get existing item or create if not found
      try {
        logger.default('Retrieving item by key', { key });
        item = await operations.get(key);
      } catch (error: any) {
        // Check if this is a NotFoundError (preserved by core wrapper)
        // Check both instanceof and error code to handle cases where
        // module duplication might break instanceof checks
        const isNotFound = error instanceof NotFoundError ||
          error?.name === 'NotFoundError' ||
          error?.errorInfo?.code === 'NOT_FOUND';

        if (isNotFound) {
          // Item doesn't exist, create it
          // Note: UpdateOptions are ignored for creation
          logger.default('Item not found, creating new item', { key, errorType: error?.name, errorCode: error?.errorInfo?.code });
          item = await operations.create(itemProperties, { key });
        } else {
          // Re-throw other errors (connection issues, permissions, etc.)
          logger.error('Unexpected error during upsert get operation', {
            component: 'lib-firestore',
            operation: 'upsert',
            phase: 'get-existing',
            key: JSON.stringify(key),
            errorType: error?.constructor?.name || typeof error,
            errorMessage: error?.message,
            errorName: error?.name,
            errorCode: error?.errorInfo?.code || error?.code,
            suggestion: 'Check Firestore connectivity, permissions, and key validity',
            coordinate: JSON.stringify(definition.coordinate)
          });
          throw error;
        }
      }

      if (!item) {
        logger.error('Failed to retrieve or create item during upsert', {
          component: 'lib-firestore',
          operation: 'upsert',
          key: JSON.stringify(key),
          suggestion: 'This should not happen. Check create operation implementation and error handling.',
          coordinate: JSON.stringify(definition.coordinate)
        });
        throw new Error(`Failed to retrieve or create item for upsert with key: ${JSON.stringify(key)}`);
      }

      // Always update the item with the new properties (this is what makes it an "upsert")
      // Pass through UpdateOptions to control merge vs replace behavior
      logger.default('Updating item with properties', { key: item.key, itemProperties, options });
      item = await operations.update(item.key, itemProperties, options);
      logger.default('Item upserted successfully', { item });

      return item;
    }
  );
};
