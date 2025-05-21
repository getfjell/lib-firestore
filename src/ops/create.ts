import { DocumentData } from "@google-cloud/firestore";

import { DocumentReference, Firestore } from "@google-cloud/firestore";

import {
  ComKey,
  isComKey,
  Item,
  LocKeyArray,
  PriKey,
  TypesProperties,
  validateKeys
} from "@fjell/core";

import { Definition } from "@/Definition";
import { processDoc } from "@/DocProcessor";
import { createEvents } from "@/EventCoordinator";
import LibLogger from "@/logger";
import { getReference } from "@/ReferenceFinder";
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
   
  ) => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  const create = async (
    item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
    options?: {
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      locations?: never;
    } | {
      key?: never;
      locations: LocKeyArray<L1, L2, L3, L4, L5>,
    }
  ): Promise<V> => {
    let locations: LocKeyArray<L1, L2, L3, L4, L5> | [] = [];
    let newItemId: string | undefined;
    
    // Process Options
    if(options?.locations) {
      locations = options.locations
    }

    if(options?.key) {
      if(isComKey(options.key)) {
        locations = (options.key as ComKey<S, L1, L2, L3, L4, L5>).loc;
      }
      newItemId = (options.key as ComKey<S, L1, L2, L3, L4, L5>).pk;
    } else {
      newItemId = crypto.randomUUID();
    }
    logger.default('Create', { item, options });
    const loc: LocKeyArray<L1, L2, L3, L4, L5> | [] = locations;

    logger.default('Getting Reference', { loc });
    const reference:
      CollectionReference<DocumentData, DocumentData> |
      Firestore =
        getReference(loc, [...collectionNames], firestore) as CollectionReference<DocumentData, DocumentData> |
      Firestore;
    logger.default('Got Reference', { reference })

    logger.default('Getting Document with New Item ID', { newItemId: newItemId })
    const docRef: DocumentReference = reference.doc(String(newItemId));
    logger.default('Doc Ref', { docRef: docRef.path });
    let itemToInsert: TypesProperties<V, S, L1, L2, L3, L4, L5> = Object.assign({}, item);

    // Right before we insert this record, we need to update the events AND remove the key
    itemToInsert = createEvents(itemToInsert) as TypesProperties<V, S, L1, L2, L3, L4, L5>;

    logger.default('Setting Item', { itemToInsert });
    await docRef.set(itemToInsert);
    logger.default('Getting Item', { docRef: docRef.path });
    const doc = await docRef.get();
    if (!doc.exists) {
      // TODO: Make this a Firestore exception type?
      throw new Error('Item not saved');
    } else {
      // Move this up.
      const item = validateKeys(processDoc(doc, kta), kta);
      return item as V;
    }
  }

  return create;
}