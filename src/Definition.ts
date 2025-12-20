import {
  Coordinate,
  Item,
  ItemTypeArray
} from '@fjell/types';

import * as Library from '@fjell/lib';
import { createCoordinate } from './Coordinate';
import { createOptions, Options } from './Options';
import LibLogger from './logger';

const logger = LibLogger.get('Definition');

export interface Definition<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> {
  coordinate: Coordinate<S, L1, L2, L3, L4, L5>;
  options: Options<V, S, L1, L2, L3, L4, L5>;
  collectionNames: string[];
}

export function createDefinition<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  kta: ItemTypeArray<S, L1, L2, L3, L4, L5>,
  scopes: string[],
  collectionNames: string[],
  libOptions?: Library.Options<V, S, L1, L2, L3, L4, L5>,
): Definition<V, S, L1, L2, L3, L4, L5> {
  logger.default('createDefinition', { kta, scopes, collectionNames, libOptions });
  const coordinate = createCoordinate(kta, scopes);
  const options = createOptions(libOptions);

  return {
    coordinate: coordinate as any,
    options,
    collectionNames,
  };
}

// const operations = createOperations(firestore, collectionNames, keyTypes, options, lib);

// // NOTE: This is a bit of a hack because there's a "chicken or the egg" problem here.
// // We need to create the lib before we can get the operations, but we need the operations to create the lib.
// // So we create an empty lib and then fill it in with the operations.  This is because there are operations that
// // need to invoke other operations, and, in some sense, the lib is the registry that allows operations like
// // remove to call update and globalOne to call globalAll.   (It's confusing, I know.)
// const lib = {} as Library.Definition<V, S, L1, L2, L3, L4, L5>;

// let operations = createOperations(firestore, collectionNames, keyTypes, options, lib);

// operations = Library.createOperations(lib, options);

// lib.all = (itemQuery: ItemQuery, locations: [] | LocKeyArray<L1, L2, L3, L4, L5> | undefined = []) =>
//   operations.all(itemQuery, locations);

// lib.create = (
//   item: TypesProperties<V, S, L1, L2, L3, L4, L5>,
//   options?: {
//     key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
//     locations?: never;
//   } | {
//     key: never;
//     locations: LocKeyArray<L1, L2, L3, L4, L5>,
//   }
// ) => operations.create(item, options);

// lib.find = (
//   finder: string,
//   finderParams: Record<string, string | number | boolean | Date | Array<string | number | boolean | Date>>,
//   locations: [] | LocKeyArray<L1, L2, L3, L4, L5> | undefined = []
// ) => operations.find(finder, finderParams, locations);

// lib.get = (key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>) =>
//   operations.get(key);

// lib.globalAll = (itemQuery: ItemQuery) =>
//   operations.globalAll(itemQuery);

// lib.globalOne = (itemQuery: ItemQuery) =>
//   operations.globalOne(itemQuery);

// lib.one = (itemQuery: ItemQuery, locations: [] | LocKeyArray<L1, L2, L3, L4, L5> | undefined = []) =>
//   operations.one(itemQuery, locations);

// lib.remove = (key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>) =>
//   operations.remove(key);

// lib.update = (
//   key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
//   item: TypesProperties<V, S, L1, L2, L3, L4, L5>
// ) => operations.update(key, item);

// lib.upsert = (
//   locator: {
//     key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
//     query?: never,
//     queryKey?: never;
//     locations?: never,
//   } | {
//     key?: never,
//     query: ItemQuery,
//     queryKey: ComKey<S, L1, L2, L3, L4, L5>,
//     locations?: never,
//   } | {
//     key?: never,
//     query: ItemQuery,
//     queryKey: PriKey<S>,
//     locations: LocKeyArray<L1, L2, L3, L4, L5>,
//   },
//   itemProperties: TypesProperties<V, S, L1, L2, L3, L4, L5>,
// ) => operations.upsert(locator, itemProperties);

// return lib;
