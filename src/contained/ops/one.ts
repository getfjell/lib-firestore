import { Item, LocKeyArray } from "@fjell/core";

import { ItemQuery } from "@fjell/core";

import { Definition } from "../../Definition";
import LibLogger from "../../logger";
import { Registry } from "@fjell/lib";
import { getAllOperation } from "./all";

const logger = LibLogger.get('contained', 'ops', 'one');

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
  ) => {

  const one = async (
    itemQuery: ItemQuery,
    locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = []
  ): Promise<V | null> => {
    logger.debug('One', { itemQuery, locations });

    const items = await getAllOperation(firestore, definition, registry)(itemQuery, locations);
    if (items.length > 0) {
      return items[0] as V;
    } else {
      return null;
    }
  }

  logger.debug('One', { one });

  return one;
}
