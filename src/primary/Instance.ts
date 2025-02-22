import { Instance as AbstractFirestoreInstance } from '@/Instance';
import { Item } from '@fjell/core';
import { Primary } from '@fjell/lib';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';
import LibLogger from '@/logger';

const logger = LibLogger.get('firestore', 'primary', 'Instance');

export interface Instance<
  V extends Item<S>,
  S extends string
> extends AbstractFirestoreInstance<V, S> {
  operations: Primary.Operations<V, S>;
}

// eslint-disable-next-line max-params
export function createInstance<
  V extends Item<S>,
  S extends string
>(
  keyType: S,
  collectionName: string,
  firestore: FirebaseFirestore.Firestore,
  libOptions: Primary.Options<V, S> = {},
  scopes: string[] = [],
): Instance<V, S> {

  logger.default('createInstance', { keyType, collectionName, libOptions, scopes });

  const definition = createDefinition([keyType], scopes, [collectionName], libOptions);
  const operations = createOperations(firestore, definition);

  return {
    definition,
    operations: Primary.wrapOperations(operations, definition),
    firestore
  } as Instance<V, S>;

}