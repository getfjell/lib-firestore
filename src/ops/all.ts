/* eslint-disable indent */
import { buildQuery } from "../QueryBuilder";
import { Query } from "@google-cloud/firestore";

import { Item, ItemQuery, LocKeyArray, validateKeys } from "@fjell/core";
import { CollectionReference } from "@google-cloud/firestore";

import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";
import { Registry } from "@fjell/lib";

const logger = LibLogger.get('ops', 'all');

export const getAllOperation = <
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registry: Registry,
) => {

  const all = async (
    itemQuery: ItemQuery,
    locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = []
  ): Promise<V[]> => {

    const { collectionNames, coordinate } = definition;
    const { kta } = coordinate;

    logger.default('All', { itemQuery, locations });
    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

    const colRef = (getReference(loc, collectionNames, firestore) as CollectionReference);

    let itemsQuery: Query = colRef;
    itemsQuery = buildQuery(itemQuery, colRef);

    logger.default('Configured this Item Query', { itemQuery, itemsQuery });

    const matchingItems = await itemsQuery.get();

    // this.logger.default('Matching Items', { matchingItems });
    // TODO: Move this up.
    const docs = matchingItems.docs.map(doc => validateKeys(processDoc(doc, kta), kta));

    logger.default('All', { docs });
    return docs as V[];
  }

  return all;
}
