/* eslint-disable indent */
import { buildQuery } from "@/QueryBuilder";
import { CollectionGroup, Query } from "@google-cloud/firestore";

import { Item, ItemQuery, LocKeyArray, validateKeys } from "@fjell/core";
import { CollectionReference } from "@google-cloud/firestore";

import { Definition } from "@/Definition";
import { processDoc } from "@/DocProcessor";
import { getReference } from "@/ReferenceFinder";
import LibLogger from "@/logger";
import { Registry } from "@fjell/lib";

const logger = LibLogger.get('contained', 'ops', 'all');

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

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  const getCollectionGroup = (): FirebaseFirestore.CollectionGroup => {
    logger.default('Getting Collection Group', { collectionName: collectionNames[0] });
    const collectionName = collectionNames[0];
    const reference: FirebaseFirestore.CollectionGroup = firestore.collectionGroup(collectionName);
    return reference;
  };

  // Of a local key array is supplied, query the collection for that location.
  const getCollection = (itemQuery: ItemQuery, loc: LocKeyArray<L1, L2, L3, L4, L5>) => {
    const colRef = (getReference(loc, collectionNames, firestore) as CollectionReference);
    return colRef;
  }

  const all = async (
    itemQuery: ItemQuery,
    locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = []
  ): Promise<V[]> => {

    logger.debug('All', { itemQuery, locations });
    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

    let colRef: CollectionReference | CollectionGroup;
    if (loc.length > 0) {
      // Query from a collection if a location is provided.
      colRef = getCollection(itemQuery, loc as LocKeyArray<L1, L2, L3, L4, L5>) as CollectionReference;
    } else {
      // Otherwise, query the collection group.
      colRef = getCollectionGroup() as CollectionGroup;
    }

    let firestoreQuery: Query = colRef;
    firestoreQuery = buildQuery(itemQuery, colRef);

    logger.default('Configured this Item Query', { itemQuery, firestoreQuery });

    const matchingItems = await firestoreQuery.get();

    // this.logger.default('Matching Items', { matchingItems });
    // TODO: Move this up.
    const docs = matchingItems.docs.map(doc => validateKeys(processDoc(doc, kta), kta));

    logger.default('Matching Items', { docs });
    return docs as V[];

  }

  return all;
}