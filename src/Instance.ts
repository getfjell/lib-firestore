import LibLogger from '@/logger';
import { Item, ItemTypeArray } from '@fjell/core';
import * as Library from '@fjell/lib';
import { Registry } from '@fjell/lib';
import { createDefinition } from './Definition';
import { createOperations } from './Operations';

const logger = LibLogger.get('Instance');

export interface Instance<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Instance<V, S, L1, L2, L3, L4, L5> {
  firestore: FirebaseFirestore.Firestore;
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
  libOptions: Library.Options<V, S, L1, L2, L3, L4, L5> = {},
  scopes: string[] = [],
  registry: Registry
): Instance<V, S, L1, L2, L3, L4, L5> {
  logger.debug('createInstance', { keyTypes, collectionNames, firestore, libOptions, scopes });
  const definition = createDefinition(keyTypes, scopes || [], collectionNames, libOptions || {});
  const operations = createOperations(firestore, definition, registry);

  return {
    definition,
    operations: Library.wrapOperations(operations, definition, registry),
    firestore,
    registry
  }
}