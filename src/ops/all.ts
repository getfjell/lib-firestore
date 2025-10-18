/* eslint-disable indent */
import { buildQuery } from "../QueryBuilder";
import { Query } from "@google-cloud/firestore";

import { AllMethod, createAllWrapper, Item, ItemQuery, LocKeyArray, validateKeys } from "@fjell/core";
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
   
  registry: Registry,
): AllMethod<V, S, L1, L2, L3, L4, L5> => {

  return createAllWrapper(
    definition.coordinate,
    async (itemQuery: ItemQuery, locations: LocKeyArray<L1, L2, L3, L4, L5> | []) => {
      const { collectionNames, coordinate } = definition;
      const { kta } = coordinate;

      logger.default('🔥 [LIB-FIRESTORE] All operation called', { itemQuery, locations, coordinate: coordinate.kta });

    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

    logger.default('🔥 [LIB-FIRESTORE] Getting collection reference', { loc, collectionNames });
    const colRef = (getReference(loc, collectionNames, firestore) as CollectionReference);
    logger.default('🔥 [LIB-FIRESTORE] Collection reference obtained', { colRef: colRef.path });

    let itemsQuery: Query = colRef;
    logger.default('🔥 [LIB-FIRESTORE] Building query with filters', { itemQuery });
    itemsQuery = buildQuery(itemQuery, colRef);

    logger.default('🔥 [LIB-FIRESTORE] Query built successfully', {
      itemQuery
    });

    logger.default('🔥 [LIB-FIRESTORE] Executing Firestore query');
    try {
      const matchingItems = await itemsQuery.get();
      logger.default('🔥 [LIB-FIRESTORE] Query executed successfully', {
        docCount: matchingItems.docs.length,
        empty: matchingItems.empty
      });

      // this.logger.default('Matching Items', { matchingItems });
      // TODO: Move this up.
      const docs = await Promise.all(
        matchingItems.docs.map(async (doc) => {
          const item = await processDoc(
            doc,
            kta,
            definition.options.references || [],
            definition.options.aggregations || [],
            registry
          );
          return validateKeys(item, kta);
        })
      );

      logger.default('🔥 [LIB-FIRESTORE] All operation completed', { docCount: docs.length });
      return docs as V[];
    } catch (error) {
      logger.error('🔥 [LIB-FIRESTORE] Query execution failed', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details
      });
      throw error;
    }
  });
}
