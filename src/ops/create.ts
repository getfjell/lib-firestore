/* eslint-disable indent */
import { DocumentData } from "@google-cloud/firestore";

import { DocumentReference, Firestore } from "@google-cloud/firestore";

import {
  ComKey,
  createCreateWrapper,
  CreateMethod,
  isComKey,
  Item,
  LocKeyArray,
  PriKey,
  validateKeys
} from "@fjell/core";

import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { createEvents } from "../EventCoordinator";
import LibLogger from "../logger";
import { getReference } from "../ReferenceFinder";
import { Registry } from "@fjell/lib";
import { CollectionReference } from "@google-cloud/firestore";
import { stripReferenceItems } from "../processing/ReferenceBuilder";
import { removeAggsFromItem } from "../processing/AggsAdapter";
import { transformFirestoreError } from "../errors/firestoreErrorHandler";

const logger = LibLogger.get('ops', 'create');

export const getCreateOperation = <
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
): CreateMethod<V, S, L1, L2, L3, L4, L5> => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  return createCreateWrapper(
    coordinate,
    async (
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?: {
        key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
        locations?: never;
      } | {
        key?: never;
        locations: LocKeyArray<L1, L2, L3, L4, L5>,
      }
    ): Promise<V> => {
      try {
        logger.default('🔥 [LIB-FIRESTORE] Raw create operation called', {
          item,
          options,
          coordinate: coordinate.kta,
          collectionNames
        });
        
        let locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = [];
        let newItemId: string | number | undefined;

        // Process Options
        if (options?.locations) {
          locations = options.locations
        }

        if (options?.key) {
          if (isComKey(options.key)) {
            locations = (options.key as ComKey<S, L1, L2, L3, L4, L5>).loc;
          }
          newItemId = (options.key as ComKey<S, L1, L2, L3, L4, L5>).pk;
        } else {
          newItemId = crypto.randomUUID();
        }
        logger.default('🔥 [LIB-FIRESTORE] Processed options', { locations, newItemId });

        const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

        logger.default('🔥 [LIB-FIRESTORE] Getting Reference', { loc });
        const reference:
          CollectionReference<DocumentData, DocumentData> |
          Firestore =
          getReference(loc, [...collectionNames], firestore) as CollectionReference<DocumentData, DocumentData> |
          Firestore;
        logger.default('🔥 [LIB-FIRESTORE] Got Reference', { reference })

        logger.default('🔥 [LIB-FIRESTORE] Getting Document with New Item ID', { newItemId: newItemId })
        const docRef: DocumentReference = reference.doc(String(newItemId));
        logger.default('🔥 [LIB-FIRESTORE] Doc Ref', { docRef: docRef.path });
        let itemToInsert: Partial<Item<S, L1, L2, L3, L4, L5>> = Object.assign({}, item);

        // Right before we insert this record, we need to update the events, strip reference items, and remove the key
        logger.default('🔥 [LIB-FIRESTORE] Creating events for item', { itemToInsert });
        itemToInsert = createEvents(itemToInsert) as Partial<Item<S, L1, L2, L3, L4, L5>>;
        logger.default('🔥 [LIB-FIRESTORE] Events created', { itemToInsert });
        
        // Strip populated reference items before writing to Firestore
        logger.default('🔥 [LIB-FIRESTORE] Stripping reference items from item', { itemToInsert });
        itemToInsert = stripReferenceItems(itemToInsert);
        logger.default('🔥 [LIB-FIRESTORE] Reference items stripped', { itemToInsert });
        
        // Remove aggs structure if present (convert back to direct properties)
        const aggregations = definition.options.aggregations || [];
        if (aggregations.length > 0) {
          logger.default('🔥 [LIB-FIRESTORE] Removing aggs structure from item', { itemToInsert });
          itemToInsert = removeAggsFromItem(itemToInsert, aggregations);
          logger.default('🔥 [LIB-FIRESTORE] Aggs structure removed', { itemToInsert });
        }

        logger.default('🔥 [LIB-FIRESTORE] Setting Item in Firestore', { itemToInsert });
        await docRef.set(itemToInsert);
        logger.default('🔥 [LIB-FIRESTORE] Getting Item from Firestore', { docRef: docRef.path });
        const doc = await docRef.get();
        if (!doc.exists) {
          logger.error('🔥 [LIB-FIRESTORE] Item not saved to Firestore', {
            component: 'lib-firestore',
            operation: 'create',
            docPath: docRef.path,
            itemData: JSON.stringify(itemToInsert),
            suggestion: 'Check Firestore write permissions, network connectivity, and quota limits',
            coordinate: JSON.stringify(definition.coordinate)
          });
          throw new Error(`Item not saved to Firestore at path: ${docRef.path}`);
        }

        // Move this up.
        logger.default('🔥 [LIB-FIRESTORE] Processing document and validating keys');
        const processedItem = await processDoc(
          doc,
          kta,
          definition.options.references || [],
          definition.options.aggregations || [],
          registry
        );
        const resultItem = validateKeys(processedItem, kta);
        logger.default('🔥 [LIB-FIRESTORE] Raw create operation completed', { item: resultItem });
        return resultItem as V;
      } catch (error: any) {
        // Transform Firestore errors
        throw transformFirestoreError(error, kta[0]);
      }
    }
  );
}
