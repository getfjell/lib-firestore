import { Definition } from "../Definition";
import LibLogger from "../logger";
import { ComKey, Item, LocKeyArray, PriKey } from "@fjell/core";
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
  ) => {

  const upsert = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    itemProperties: Partial<Item<S, L1, L2, L3, L4, L5>>,

    locations?: LocKeyArray<L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    logger.debug('upsert', { key, itemProperties, locations });

    // Simple upsert implementation: try to get, if not found then create
    try {
      return await operations.get(key);
    } catch {
      // If get fails, create a new item
      logger.debug('Item not found, creating new item', { key });
      return await operations.create(itemProperties, { key });
    }
  };

  return upsert;
};
