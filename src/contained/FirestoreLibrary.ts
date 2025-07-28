import { createDefinition } from '../Definition';
import { FirestoreLibrary as AbstractFirestoreLibrary } from '../FirestoreLibrary';
import { Item, ItemTypeArray } from '@fjell/core';
import { Contained, Operations, Registry } from '@fjell/lib';
import { createOperations } from './Operations';

import LibLogger from '../logger';

const logger = LibLogger.get('contained', 'FirestoreLibrary');

export interface FirestoreLibrary<
  V extends Item<S>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends AbstractFirestoreLibrary<V, S, L1, L2, L3, L4, L5> {
  operations: Operations<V, S, L1, L2, L3, L4, L5>;
}

export function createFirestoreLibrary<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  keyTypes: ItemTypeArray<S, L1, L2, L3, L4, L5>,
  collectionNames: string[],
  firestore: FirebaseFirestore.Firestore,
  libOptions: Contained.Options<V, S, L1, L2, L3, L4, L5> = {},
  scopes: string[] = [],
  registry: Registry,
): FirestoreLibrary<V, S, L1, L2, L3, L4, L5> {

  logger.debug('createFirestoreLibrary', { keyTypes, collectionNames, firestore, libOptions, scopes });

  const definition = createDefinition(keyTypes, scopes || [], collectionNames, libOptions || {});
  const operations = createOperations(firestore, definition, registry);

  return {
    coordinate: definition.coordinate,
    operations: Contained.wrapOperations(operations, definition.options as Contained.Options<V, S, L1, L2, L3, L4, L5>, definition.coordinate, registry),
    options: definition.options,
    firestore,
    registry
  } as FirestoreLibrary<V, S, L1, L2, L3, L4, L5>;

}
