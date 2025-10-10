/* eslint-disable indent */
import { ComKey, isValidItemKey, Item, PriKey, validateKeys } from "@fjell/core";
import * as Library from "@fjell/lib";
import { DocumentReference } from "@google-cloud/firestore";
import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";

const logger = LibLogger.get('ops', 'get');

export const getGetOperation = <
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

  const get = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {

    const { collectionNames, coordinate } = definition;
    const { kta } = coordinate;

    logger.default('Get', { key, kta, collectionNames, coordinate });
    if (!isValidItemKey(key)) {
      logger.error('Key for Get is not a valid ItemKey: %j', key);
      throw new Error('Key for Get is not a valid ItemKey');
    }

    const itemKey = key;

    const docRef =
      getReference(
        itemKey as ComKey<S, L1, L2, L3, L4, L5> | PriKey<S>, collectionNames, firestore) as DocumentReference;

    const doc = await docRef.get();
    if (!doc.exists) {
      throw new Library.NotFoundError<S, L1, L2, L3, L4, L5>('get', coordinate, key);
    } else {
      return validateKeys(processDoc(doc, kta), kta) as V;
    }
  }

  return get;
}
