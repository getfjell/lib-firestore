import { createDefinition } from '@/Definition';
import { Instance as AbstractFirestoreInstance } from '@/Instance';
import { createOperations } from '@/Operations';
import LibLogger from '@/logger';
import { Item } from '@fjell/core';
import { Primary, Registry } from '@fjell/lib';

const logger = LibLogger.get('Instance');

export interface Instance<
  V extends Item<S>,
  S extends string
> extends AbstractFirestoreInstance<V, S> {
  operations: Primary.Operations<V, S>;
}

export function createInstance<
  V extends Item<S>,
  S extends string
>(
  keyType: S,
  collectionName: string,
  firestore: FirebaseFirestore.Firestore,
  libOptions: Primary.Options<V, S> = {},
  scopes: string[] = [],
  registry: Registry
): Instance<V, S> {

  logger.debug('createInstance', { keyType, collectionName, libOptions, scopes });

  const definition = createDefinition([keyType], scopes || [], [collectionName], libOptions || {});
  const operations = createOperations(firestore, definition, registry);

  return {
    coordinate: definition.coordinate,
    operations: Primary.wrapOperations(operations, definition.options as Primary.Options<V, S>, definition.coordinate, registry),
    options: definition.options,
    firestore,
    registry
  } as Instance<V, S>;

}
