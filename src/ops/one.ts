import { createOneWrapper, Item, ItemQuery, LocKeyArray, OneMethod } from "@fjell/core";

import { Definition } from "../Definition";
import LibLogger from "../logger";
import { Registry } from "@fjell/lib";
import { getAllOperation } from "./all";

const logger = LibLogger.get('ops', 'one');

export const getOneOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never>(
    firestore: FirebaseFirestore.Firestore,
    definition: Definition<V, S, L1, L2, L3, L4, L5>,
    registry: Registry,
  ): OneMethod<V, S, L1, L2, L3, L4, L5> => {

  return createOneWrapper(
    definition.coordinate,
    async (itemQuery: ItemQuery, locations: LocKeyArray<L1, L2, L3, L4, L5> | [], allOptions?: any) => {
      logger.default('One', { itemQuery, locations, allOptions });
      const result = await getAllOperation(firestore, definition, registry)(itemQuery, locations, allOptions);
      if (result.items.length > 0) {
        return result.items[0] as V;
      } else {
        return null;
      }
    }
  );
}