import { createCoordinate as createBaseCoordinate } from '@fjell/core';
import { Coordinate, ItemTypeArray } from '@fjell/types';
import LibLogger from './logger';

const logger = LibLogger.get('Coordinate');

export const SCOPE_FIRESTORE = 'firestore';

export const createCoordinate = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(kta: ItemTypeArray<S, L1, L2, L3, L4, L5>, scopes?: string[]): Coordinate<S, L1, L2, L3, L4, L5> => {
  logger.default('createCoordinate', { kta, scopes });
  const coordinate = createBaseCoordinate(kta, [SCOPE_FIRESTORE, ...(scopes || [])]);
  return coordinate;
};

// Re-export the Coordinate type
export type { Coordinate } from '@fjell/core';
