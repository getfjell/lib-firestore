import { Item } from '@fjell/core';
import * as Library from '@fjell/lib';
import LibLogger from './logger';

const logger = LibLogger.get('Options');

/**
 * Options type alias for firestore-specific functionality
 * Currently extends Library.Options, firestore-specific options can be added in the future
 */
export type Options<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> = Library.Options<V, S, L1, L2, L3, L4, L5>;

export const createOptions = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(libOptions?: Library.Options<V, S, L1, L2, L3, L4, L5>):
  Options<V, S, L1, L2, L3, L4, L5> => {
  logger.debug('createOptions', { libOptions });
  const options = Library.createOptions(libOptions);
  return {
    ...options
    // Add firestore-specific option handling here if needed
  };
}
