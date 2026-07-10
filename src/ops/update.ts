/* eslint-disable indent */
import {
  ComKey,
  Item,
  PriKey,
  UpdateMethod,
  UpdateOptions
} from "@fjell/types";
import { createUpdateWrapper, isValidItemKey } from "@fjell/core";
import { validateKeys } from "@fjell/validation";

import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { updateEvents } from "../EventCoordinator";
import { removeKey } from "../KeyMaster";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";
import * as Library from "@fjell/lib";
import { DocumentReference } from "@google-cloud/firestore";
import { stripReferenceItems } from "../processing/ReferenceBuilder";
import { removeAggsFromItem } from "../processing/AggsAdapter";
import { NotFoundError } from "@fjell/core";
import { transformFirestoreError } from "../errors/firestoreErrorHandler";

const logger = LibLogger.get('ops', 'update');

export const getUpdateOperation = <
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
): UpdateMethod<V, S, L1, L2, L3, L4, L5> => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  return createUpdateWrapper(
    coordinate,
    async (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?: UpdateOptions
    ): Promise<V> => {
      try {
        // Default to safe merge behavior
        const replace = options?.replace ?? false;
        
        logger.default('🔥 [LIB-FIRESTORE] Raw update operation called', {
          key,
          item,
          options,
          replace,
          coordinate: coordinate.kta,
          collectionNames
        });

        if (!isValidItemKey(key)) {
          logger.error('🔥 [LIB-FIRESTORE] Key for Update is not a valid ItemKey: %j', key);
          throw new Error('Key for Update is not a valid ItemKey');
        }

        logger.default('🔥 [LIB-FIRESTORE] Getting document reference', { key, collectionNames });
        const docRef = getReference(
          key as ComKey<S, L1, L2, L3, L4, L5> | PriKey<S>, collectionNames, firestore) as DocumentReference;
        logger.default('🔥 [LIB-FIRESTORE] Got document reference', { docRef: docRef.path });
        
        let itemToUpdate: Partial<Item<S, L1, L2, L3, L4, L5>> = Object.assign({}, item);

        // Right before this record is going to be updated, we need to update the events, strip reference items, and remove the key
        // Pre-write: update events, strip references, remove key
        logger.default('🔥 [LIB-FIRESTORE] Updating events for item', { itemToUpdate });
        itemToUpdate = updateEvents(itemToUpdate) as Partial<Item<S, L1, L2, L3, L4, L5>>;
        logger.default('🔥 [LIB-FIRESTORE] Events updated', { itemToUpdate });
        
        // Strip populated reference items before writing to Firestore
        logger.default('🔥 [LIB-FIRESTORE] Stripping reference items from item', { itemToUpdate });
        itemToUpdate = stripReferenceItems(itemToUpdate);
        logger.default('🔥 [LIB-FIRESTORE] Reference items stripped', { itemToUpdate });
        
        // Remove aggs structure if present (convert back to direct properties)
        const aggregations = definition.options.aggregations || [];
        if (aggregations.length > 0) {
          logger.default('🔥 [LIB-FIRESTORE] Removing aggs structure from item', { itemToUpdate });
          itemToUpdate = removeAggsFromItem(itemToUpdate, aggregations);
          logger.default('🔥 [LIB-FIRESTORE] Aggs structure removed', { itemToUpdate });
        }
        
        // Pre-write: update events, strip references, remove key
        logger.default('🔥 [LIB-FIRESTORE] Removing key from item', { itemToUpdate });
        itemToUpdate = removeKey(itemToUpdate) as Partial<Item<S, L1, L2, L3, L4, L5>>;
        logger.default('🔥 [LIB-FIRESTORE] Key removed', { itemToUpdate });

        // Perform update based on replace flag
        if (replace) {
          // FULL DOCUMENT REPLACEMENT - Use with extreme caution!
          logger.warning('⚠️  [LIB-FIRESTORE] FULL DOCUMENT REPLACEMENT MODE', {
            itemType: kta[0],
            key: { kt: key.kt, pk: key.pk },
            fieldsBeingSet: Object.keys(itemToUpdate),
            docPath: docRef.path,
            warning: 'All fields not included in update will be DELETED!',
            reason: 'UpdateOptions.replace = true was specified'
          });
          
          // Use .set() WITHOUT merge option - this REPLACES the entire document
          await docRef.set(itemToUpdate);
          logger.default('🔥 [LIB-FIRESTORE] Document replaced (full replacement)');
          
        } else {
          // PARTIAL UPDATE (MERGE) - DEFAULT SAFE BEHAVIOR
          logger.default('🔥 [LIB-FIRESTORE] Setting item in Firestore with merge (safe mode)', {
            itemToUpdate,
            fieldsBeingUpdated: Object.keys(itemToUpdate)
          });
          
          // Use .set() WITH merge: true - this preserves unspecified fields
          await docRef.set(itemToUpdate, { merge: true });
          logger.default('🔥 [LIB-FIRESTORE] Document merged successfully');
        }
        
        logger.default('🔥 [LIB-FIRESTORE] Getting updated document from Firestore');
        const doc = await docRef.get();
        if (!doc.exists) {
          logger.error('🔥 [LIB-FIRESTORE] Document not found after update');
          throw new NotFoundError(
            `Cannot update: ${kta[0]} not found`,
            kta[0],
            key
          );
        }

        // Post-write: process document and validate keys
        logger.default('🔥 [LIB-FIRESTORE] Processing document and validating keys');
        const processedItem = await processDoc(
          doc,
          kta,
          definition.options.references || [],
          definition.options.aggregations || [],
          registry
        );
        const resultItem = validateKeys(processedItem, kta);
        logger.default('🔥 [LIB-FIRESTORE] Raw update operation completed', { item: resultItem });
        return resultItem as V;
      } catch (error: any) {
        // Transform Firestore errors but pass through NotFoundError
        if (error instanceof NotFoundError) throw error;
        throw transformFirestoreError(error, kta[0], key);
      }
    }
  );
}