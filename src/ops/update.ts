/* eslint-disable indent */
import { validateKeys } from "@fjell/core";

import { ComKey, isValidItemKey, Item, PriKey } from "@fjell/core";

import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { updateEvents } from "../EventCoordinator";
import { removeKey } from "../KeyMaster";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";
import * as Library from "@fjell/lib";
import { DocumentReference } from "@google-cloud/firestore";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  registry: Library.Registry,
) => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  const update = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    item: Partial<Item<S, L1, L2, L3, L4, L5>>,
  ): Promise<V> => {
    logger.default('🔥 [LIB-FIRESTORE] Raw update operation called', {
      key,
      item,
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

    // Right before this record is going to be updated, we need to update the events AND remove the key
    // TODO: Move this up.
    logger.default('🔥 [LIB-FIRESTORE] Updating events for item', { itemToUpdate });
    itemToUpdate = updateEvents(itemToUpdate) as Partial<Item<S, L1, L2, L3, L4, L5>>;
    logger.default('🔥 [LIB-FIRESTORE] Events updated', { itemToUpdate });
    
    // TODO: Move this up.
    logger.default('🔥 [LIB-FIRESTORE] Removing key from item', { itemToUpdate });
    itemToUpdate = removeKey(itemToUpdate) as Partial<Item<S, L1, L2, L3, L4, L5>>;
    logger.default('🔥 [LIB-FIRESTORE] Key removed', { itemToUpdate });

    logger.default('🔥 [LIB-FIRESTORE] Setting item in Firestore with merge', { itemToUpdate });
    await docRef.set(itemToUpdate, { merge: true });
    logger.default('🔥 [LIB-FIRESTORE] Getting updated document from Firestore');
    const doc = await docRef.get();
    if (!doc.exists) {
      logger.error('🔥 [LIB-FIRESTORE] Document not found after update');
      throw new Library.NotUpdatedError<S, L1, L2, L3, L4, L5>('update', coordinate, key);
    } else {
      // TODO: Move this up.
      logger.default('🔥 [LIB-FIRESTORE] Processing document and validating keys');
      const item = validateKeys(processDoc(doc, kta), kta);
      logger.default('🔥 [LIB-FIRESTORE] Raw update operation completed', { item });
      return item as V;
    }
  }

  return update;
}