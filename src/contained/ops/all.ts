/* eslint-disable indent */
import { buildQueryWithoutPagination } from "../../QueryBuilder";
import { CollectionGroup, Query } from "@google-cloud/firestore";

import { AllMethod, AllOperationResult, AllOptions, createAllWrapper, Item, ItemQuery, LocKeyArray, validateKeys } from "@fjell/core";
import { CollectionReference } from "@google-cloud/firestore";

import { Definition } from "../../Definition";
import { processDoc } from "../../DocProcessor";
import { getReference } from "../../ReferenceFinder";
import LibLogger from "../../logger";
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

      logger.default('🔥 [LIB-FIRESTORE] Contained All operation called', { itemQuery, locations, coordinate: coordinate.kta, allOptions });

      const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

      const getCollectionGroup = (): FirebaseFirestore.CollectionGroup => {
        logger.default('Getting Collection Group', { collectionName: collectionNames[0] });
        const collectionName = collectionNames[0];
        const reference: FirebaseFirestore.CollectionGroup = firestore.collectionGroup(collectionName);
        return reference;
      };

      // Of a local key array is supplied, query the collection for that location.
      const getCollection = (loc: LocKeyArray<L1, L2, L3, L4, L5>) => {
        logger.debug('Getting collection reference', {
          collectionNames,
          locations: loc,
          locationsLength: loc.length
        });
        const colRef = (getReference(loc, collectionNames, firestore) as CollectionReference);
        logger.debug('Collection reference obtained', {
          path: (colRef as any).path || 'path not available',
          collectionId: (colRef as any).id || 'id not available',
          fullPath: (colRef as any).path
        });
        return colRef;
      }

      let colRef: CollectionReference | CollectionGroup;
      if (loc.length > 0) {
        // Query from a collection if a location is provided.
        colRef = getCollection(loc as LocKeyArray<L1, L2, L3, L4, L5>) as CollectionReference;
      } else {
        // Otherwise, query the collection group.
        colRef = getCollectionGroup() as CollectionGroup;
      }

      // Build base query WITHOUT limit/offset (for count query)
      const baseQuery: Query = buildQueryWithoutPagination(itemQuery, colRef);

      // Determine effective limit/offset (options takes precedence over query)
      const effectiveLimit = allOptions?.limit ?? itemQuery?.limit;
      const effectiveOffset = allOptions?.offset ?? itemQuery?.offset ?? 0;

      logger.default('🔥 [LIB-FIRESTORE] Contained Pagination settings', {
        effectiveLimit,
        effectiveOffset,
        optionsLimit: allOptions?.limit,
        optionsOffset: allOptions?.offset,
        queryLimit: itemQuery?.limit,
        queryOffset: itemQuery?.offset
      });

      // Execute COUNT query to get total matching documents (before pagination)
      logger.default('🔥 [LIB-FIRESTORE] Executing contained count query');
      const countSnapshot = await baseQuery.count().get();
      const total = countSnapshot.data().count;
      logger.default('🔥 [LIB-FIRESTORE] Contained count query completed', { total });

      // Apply pagination to the query
      let paginatedQuery: Query = baseQuery;
      if (effectiveOffset > 0) {
        paginatedQuery = paginatedQuery.offset(effectiveOffset);
      }
      if (effectiveLimit != null) {
        paginatedQuery = paginatedQuery.limit(effectiveLimit);
      }

      logger.default('🔥 [LIB-FIRESTORE] Executing contained Firestore query with pagination');
      const matchingItems = await paginatedQuery.get();

      logger.debug('Query executed', {
        empty: matchingItems.empty,
        size: matchingItems.size,
        docsLength: matchingItems.docs.length,
        collectionPath: (colRef as any).path || 'path not available'
      });

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

      logger.debug('Matching Items', {
        docs: items,
        docsCount: items.length
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
    }
  );
}
