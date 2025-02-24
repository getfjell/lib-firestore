import { validateKeys } from "@fjell/core";

import { ComKey, isValidItemKey, Item, PriKey, TypesProperties } from "@fjell/core";

import { Definition } from "@/Definition";
import { processDoc } from "@/DocProcessor";
import { updateEvents } from "@/EventCoordinator";
import { removeKey } from "@/KeyMaster";
import { getReference } from "@/ReferenceFinder";
import LibLogger from "@/logger";
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
  // eslint-disable-next-line max-params
  ) => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  const update = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    logger.default('Update', { key, item });

    if (!isValidItemKey(key)) {
      logger.error('Key for Update is not a valid ItemKey: %j', key);
      throw new Error('Key for Update is not a valid ItemKey');
    }

    const docRef = getReference(
      key as ComKey<S, L1, L2, L3, L4, L5> | PriKey<S>, collectionNames, firestore) as DocumentReference;
    let itemToUpdate: TypesProperties<V, S, L1, L2, L3, L4, L5> = Object.assign({}, item);

    // Right before this record is going to be updated, we need to update the events AND remove the key
    // TODO: Move this up.
    itemToUpdate = updateEvents(itemToUpdate) as TypesProperties<V, S, L1, L2, L3, L4, L5>;
    // TODO: Move this up.
    itemToUpdate = removeKey(itemToUpdate) as TypesProperties<V, S, L1, L2, L3, L4, L5>;

    await docRef.set(itemToUpdate, { merge: true });
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Library.NotUpdatedError<S, L1, L2, L3, L4, L5>('update', coordinate, key);
    } else {
      // TODO: Move this up.
      const item = validateKeys(processDoc(doc, kta), kta);
      return item as V;
    }
  }

  return update;
}