import { createDefinition } from '@/Definition';
import { Instance as AbstractFirestoreInstance } from '@/Instance';
import { Item, ItemTypeArray } from '@fjell/core';
import { Contained, Registry } from '@fjell/lib';
import { createOperations } from './Operations';

import LibLogger from '@/logger';

const logger = LibLogger.get('contained', 'Instance');

export interface Instance<
  V extends Item<S>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends AbstractFirestoreInstance<V, S, L1, L2, L3, L4, L5> {
  operations: Contained.Operations<V, S, L1, L2, L3, L4, L5>;
}

// eslint-disable-next-line max-params
export function createInstance<
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
): Instance<V, S, L1, L2, L3, L4, L5> {

  logger.debug('createInstance', { keyTypes, collectionNames, firestore, libOptions, scopes });

  const definition = createDefinition(keyTypes, scopes || [], collectionNames, libOptions || {});
  const operations = createOperations(firestore, definition, registry);

  return {
    definition,
    operations: Contained.wrapOperations(operations, definition, registry),
    firestore,
    registry
  } as Instance<V, S, L1, L2, L3, L4, L5>;

}