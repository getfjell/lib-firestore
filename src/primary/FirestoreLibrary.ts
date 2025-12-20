import { createDefinition } from '../Definition';
import { createOperations } from '../Operations';
import LibLogger from '../logger';
import { Item } from '@fjell/types';
import { Operations, Primary, Registry } from '@fjell/lib';

const logger = LibLogger.get('primary', 'FirestoreLibrary');

export interface FirestoreLibrary<
  V extends Item<S>,
  S extends string
> {
  coordinate: any;
  operations: Operations<V, S>;
  options: any;
  firestore: FirebaseFirestore.Firestore;
  registry: Registry;
}

export const createFirestoreLibrary = <
  V extends Item<S>,
  S extends string
>(
    keyType: S,
    collectionName: string,
    firestore: FirebaseFirestore.Firestore,
    libOptions: Primary.Options<V, S> = {},
    scopes: string[] = [],
    registry: Registry
  ): FirestoreLibrary<V, S> => {

  logger.default('createFirestoreLibrary', { keyType, collectionName, libOptions, scopes });

  const definition = createDefinition([keyType], scopes || [], [collectionName], libOptions || {});
  const operations = createOperations(firestore, definition, registry);

  return {
    coordinate: definition.coordinate,
    operations: Primary.wrapOperations(operations as any, definition.options as Primary.Options<V, S>, definition.coordinate as any, registry),
    options: definition.options,
    firestore,
    registry
  } as FirestoreLibrary<V, S>;

}
