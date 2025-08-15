/* eslint-disable indent */
import LibLogger from './logger';
import { Item, ItemTypeArray } from '@fjell/core';
import { Coordinate } from '@fjell/registry';
import * as Library from '@fjell/lib';
import { Registry } from '@fjell/lib';
import { Options } from './Options';
import { createDefinition } from './Definition';
import { createOperations } from './Operations';

const logger = LibLogger.get('FirestoreLibrary');

/**
 * The FirestoreLibrary interface extends the Library from @fjell/lib
 * and adds firestore-specific properties and operations.
 *
 * @template V - The type of the data model item, extending Item
 * @template S - The string literal type representing the model's key type
 * @template L1-L5 - Optional string literal types for location hierarchy levels
 */
export interface FirestoreLibrary<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends Library.Library<V, S, L1, L2, L3, L4, L5> {
  /** Firestore instance for database operations */
  firestore: FirebaseFirestore.Firestore;
}

/**
 * Creates a new FirestoreLibrary with pre-created components
 */
export const createFirestoreLibraryFromComponents = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  registry: Registry,
  coordinate: Coordinate<S, L1, L2, L3, L4, L5>,
  firestore: FirebaseFirestore.Firestore,
  operations: Library.Operations<V, S, L1, L2, L3, L4, L5>,
  options: Options<V, S, L1, L2, L3, L4, L5>
): FirestoreLibrary<V, S, L1, L2, L3, L4, L5> => {
  logger.default('createFirestoreLibraryFromComponents', { registry, coordinate, firestore, operations, options });

  return {
    registry,
    coordinate,
    firestore,
    operations,
    options
  };
};

/**
 * Creates a new FirestoreLibrary with the provided raw parameters
 */
export const createFirestoreLibrary = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  kta: ItemTypeArray<S, L1, L2, L3, L4, L5>,
  collectionNames: string[],
  firestore: FirebaseFirestore.Firestore,
  libOptions?: Library.Options<V, S, L1, L2, L3, L4, L5> | null,
  scopes: string[] | null = [],
  registry?: Registry
): FirestoreLibrary<V, S, L1, L2, L3, L4, L5> => {
  logger.default('createFirestoreLibrary', { kta, collectionNames, firestore, libOptions, scopes, registry });

  // Convert null values to proper defaults
  const actualScopes = scopes || [];
  const actualLibOptions = libOptions || {} as Library.Options<V, S, L1, L2, L3, L4, L5>;

  const definition = createDefinition(kta, actualScopes, collectionNames, actualLibOptions);
  const operations = createOperations(firestore, definition, registry!);

  return createFirestoreLibraryFromComponents(
    registry!,
    definition.coordinate,
    firestore,
    operations,
    definition.options
  );
};
