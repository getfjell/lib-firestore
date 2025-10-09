/* eslint-disable indent */
import { DocumentData } from "@google-cloud/firestore";

import { DocumentReference, Firestore } from "@google-cloud/firestore";

import {
  ComKey,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registry: Registry,
) => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  const create = async (
    item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    options?: {
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      locations?: never;
    } | {
      key?: never;
      locations: LocKeyArray<L1, L2, L3, L4, L5>,
    }
  ): Promise<V> => {
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

    // Right before we insert this record, we need to update the events AND remove the key
    logger.default('🔥 [LIB-FIRESTORE] Creating events for item', { itemToInsert });
    itemToInsert = createEvents(itemToInsert) as Partial<Item<S, L1, L2, L3, L4, L5>>;
    logger.default('🔥 [LIB-FIRESTORE] Events created', { itemToInsert });

    logger.default('🔥 [LIB-FIRESTORE] Setting Item in Firestore', { itemToInsert });
    await docRef.set(itemToInsert);
    logger.default('🔥 [LIB-FIRESTORE] Getting Item from Firestore', { docRef: docRef.path });
    const doc = await docRef.get();
    if (!doc.exists) {
      // TODO: Make this a Firestore exception type?
      logger.error('🔥 [LIB-FIRESTORE] Item not saved to Firestore');
      throw new Error('Item not saved');
    } else {
      // Move this up.
      logger.default('🔥 [LIB-FIRESTORE] Processing document and validating keys');
      const item = validateKeys(processDoc(doc, kta), kta);
      logger.default('🔥 [LIB-FIRESTORE] Raw create operation completed', { item });
      return item as V;
    }
  }

  return create;
}
