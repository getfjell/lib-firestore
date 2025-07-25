import { createDefinition } from '@/Definition';
import { FirestoreLibrary as AbstractFirestoreLibrary } from '@/FirestoreLibrary';
import { createOperations } from '@/Operations';
import LibLogger from '@/logger';
import { Item } from '@fjell/core';
import { Operations, Primary, Registry } from '@fjell/lib';

const logger = LibLogger.get('Instance');

export interface FirestoreLibrary<
  V extends Item<S>,
  S extends string
> extends AbstractFirestoreLibrary<V, S> {
  operations: Operations<V, S>;
}

export function createFirestoreLibrary<
  V extends Item<S>,
  S extends string
>(
  keyType: S,
  collectionName: string,
  firestore: FirebaseFirestore.Firestore,
  libOptions: Primary.Options<V, S> = {},
  scopes: string[] = [],
  registry: Registry
): FirestoreLibrary<V, S> {

  logger.debug('createFirestoreLibrary', { keyType, collectionName, libOptions, scopes });

  const definition = createDefinition([keyType], scopes || [], [collectionName], libOptions || {});
  const operations = createOperations(firestore, definition, registry);

  return {
    coordinate: definition.coordinate,
    operations: Primary.wrapOperations(operations, definition.options as Primary.Options<V, S>, definition.coordinate, registry),
    options: definition.options,
    firestore,
    registry
  } as FirestoreLibrary<V, S>;

}

// Legacy exports for backwards compatibility
export const createInstance = createFirestoreLibrary;
export type Instance<
  V extends Item<S>,
  S extends string
> = FirestoreLibrary<V, S>;
