import LibLogger from './logger';
import { Item, ItemTypeArray } from '@fjell/core';
import { Instance as BaseInstance, Coordinate } from '@fjell/registry';
import * as Library from '@fjell/lib';
import { Registry } from '@fjell/lib';
import { Options } from './Options';
import { createDefinition } from './Definition';
import { createOperations } from './Operations';

const logger = LibLogger.get('Instance');

/**
 * The Firestore Instance interface extends the base Instance from @fjell/registry
 * and adds firestore-specific properties and operations.
 *
 * @template V - The type of the data model item, extending Item
 * @template S - The string literal type representing the model's key type
 * @template L1-L5 - Optional string literal types for location hierarchy levels
 */
export interface Instance<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> extends BaseInstance<S, L1, L2, L3, L4, L5> {
  /** Firestore instance for database operations */
  firestore: FirebaseFirestore.Firestore;

  /** The operations object that provides methods for interacting with the data model */
  operations: Library.Operations<V, S, L1, L2, L3, L4, L5>;

  /** The options object that provides hooks, validators, finders, actions, and facets */
  options: Options<V, S, L1, L2, L3, L4, L5>;
}

/**
 * Creates a new Firestore Instance with pre-created components
 */
export const createInstanceFromComponents = <
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
  ): Instance<V, S, L1, L2, L3, L4, L5> => {
  logger.debug('createInstanceFromComponents', { registry, coordinate, firestore, operations, options });

  return {
    registry,
    coordinate,
    firestore,
    operations,
    options
  };
};

/**
 * Creates a new Firestore Instance with the provided raw parameters
 */
export const createInstance = <
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
  ): Instance<V, S, L1, L2, L3, L4, L5> => {
  logger.debug('createInstance', { kta, collectionNames, firestore, libOptions, scopes, registry });

  // Convert null values to proper defaults
  const actualScopes = scopes || [];
  const actualLibOptions = libOptions || {} as Library.Options<V, S, L1, L2, L3, L4, L5>;

  const definition = createDefinition(kta, actualScopes, collectionNames, actualLibOptions);
  const operations = createOperations(firestore, definition, registry!);

  return createInstanceFromComponents(
    registry!,
    definition.coordinate,
    firestore,
    operations,
    definition.options
  );
};
