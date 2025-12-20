/* eslint-disable indent */
import { buildQueryWithoutPagination } from "../QueryBuilder";
import { Query } from "@google-cloud/firestore";

import { AllMethod, AllOperationResult, AllOptions, Item, ItemQuery, LocKeyArray } from "@fjell/types";
import { createAllWrapper } from "@fjell/core";
import { validateKeys } from "@fjell/validation";
import { CollectionReference } from "@google-cloud/firestore";

import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";
import { Registry } from "@fjell/lib";
import { transformFirestoreError } from "../errors/firestoreErrorHandler";

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
    async (
      itemQuery: ItemQuery,
      locations: LocKeyArray<L1, L2, L3, L4, L5> | [],
      allOptions?: AllOptions
    ): Promise<AllOperationResult<V>> => {
      const { collectionNames, coordinate } = definition;
      const { kta } = coordinate;

      logger.default('🔥 [LIB-FIRESTORE] All operation called', { itemQuery, locations, coordinate: coordinate.kta, allOptions });

    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

    logger.default('🔥 [LIB-FIRESTORE] Getting collection reference', { loc, collectionNames });
    const ref = getReference(loc, collectionNames, firestore);
    logger.default('🔥 [LIB-FIRESTORE] Reference obtained', {
      refType: ref?.constructor?.name,
      refPath: (ref as any)?.path,
      hasWhere: typeof (ref as any)?.where
    });

    // ReferenceFinder already validates it's a real CollectionReference (not a mock)
    // Just cast it - if it's invalid, buildQuery will fail with a clearer error
    const colRef = ref as CollectionReference;

    // Build base query WITHOUT limit/offset (for count query)
    logger.default('🔥 [LIB-FIRESTORE] Building query with filters', { itemQuery });
    const baseQuery: Query = buildQueryWithoutPagination(itemQuery, colRef);

    logger.default('🔥 [LIB-FIRESTORE] Query built successfully', {
      itemQuery
    });

    // Determine effective limit/offset (options takes precedence over query)
    const effectiveLimit = allOptions?.limit ?? itemQuery?.limit;
    const effectiveOffset = allOptions?.offset ?? itemQuery?.offset ?? 0;

    logger.default('🔥 [LIB-FIRESTORE] Pagination settings', {
      effectiveLimit,
      effectiveOffset,
      optionsLimit: allOptions?.limit,
      optionsOffset: allOptions?.offset,
      queryLimit: itemQuery?.limit,
      queryOffset: itemQuery?.offset
    });

    try {
      // Execute COUNT query to get total matching documents (before pagination)
      logger.default('🔥 [LIB-FIRESTORE] Executing count query');
      const countSnapshot = await baseQuery.count().get();
      const total = countSnapshot.data().count;
      logger.default('🔥 [LIB-FIRESTORE] Count query completed', { total });

      // Apply pagination to the query
      let paginatedQuery: Query = baseQuery;
      if (effectiveOffset > 0) {
        paginatedQuery = paginatedQuery.offset(effectiveOffset);
      }
      if (effectiveLimit != null) {
        paginatedQuery = paginatedQuery.limit(effectiveLimit);
      }

      logger.default('🔥 [LIB-FIRESTORE] Executing Firestore query with pagination');
      const matchingItems = await paginatedQuery.get();
      logger.default('🔥 [LIB-FIRESTORE] Query executed successfully', {
        docCount: matchingItems.docs.length,
        empty: matchingItems.empty,
        total
      });

      // this.logger.default('Matching Items', { matchingItems });
      // TODO: Move this up.
      const items = await Promise.all(
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
      ) as V[];

      logger.default('🔥 [LIB-FIRESTORE] All operation completed', {
        docCount: items.length,
        total,
        hasMore: effectiveOffset + items.length < total
      });

      // Return AllOperationResult with items and metadata
      return {
        items,
        metadata: {
          total,
          returned: items.length,
          limit: effectiveLimit,
          offset: effectiveOffset,
          hasMore: effectiveOffset + items.length < total
        }
      };
    } catch (error: any) {
      logger.error('🔥 [LIB-FIRESTORE] Query execution failed', {
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details
      });
      throw transformFirestoreError(error, kta[0]);
    }
  });
}
