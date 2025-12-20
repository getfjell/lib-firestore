import {
  FindMethod,
  FindOperationResult,
  FindOptions,
  Item,
  LocKeyArray
} from "@fjell/types";
import { createFindWrapper } from "@fjell/core";

import { Definition } from "../Definition";
import LibLogger from "../logger";
import { Operations, Registry } from "@fjell/lib";
import { transformFirestoreError } from "../errors/firestoreErrorHandler";

const logger = LibLogger.get('ops', 'find');

export const getFindOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never>(
    definition: Definition<V, S, L1, L2, L3, L4, L5>,
    operations: Operations<V, S, L1, L2, L3, L4, L5>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    registry: Registry,
  ): FindMethod<V, S, L1, L2, L3, L4, L5> => {
  const { options } = definition;

  logger.default('getFindOperation', { definition, operations });

  return createFindWrapper(
    definition.coordinate,
    async (
      finder: string,
      finderParams: Record<string, string | number | boolean | Date | Array<string | number | boolean | Date>>,
      locations?: LocKeyArray<L1, L2, L3, L4, L5> | [],
      findOptions?: FindOptions
    ): Promise<FindOperationResult<V>> => {
      try {
        logger.default('Find', { finder, finderParams, locations, findOptions, options });

        // Note that we execute the createFinders function here because we want to make sure we're always getting the
        // most up to date methods.
        if (options.finders && options.finders[finder]) {
          const finderMethod = options.finders[finder];
          if (finderMethod) {
            // Pass findOptions to finder - finder can opt-in by returning FindOperationResult, or return V[] for legacy behavior
            // Type assertion needed because FinderMethod type from @fjell/lib may be stale
            const finderResult = await (finderMethod as any)(finderParams, locations, findOptions);
            
            // Check if finder opted-in (returned FindOperationResult) or legacy (returned V[])
            if (finderResult && typeof finderResult === 'object' && 'items' in finderResult && 'metadata' in finderResult) {
              // Finder opted-in: return as-is (createFindWrapper will validate)
              return finderResult as FindOperationResult<V>;
            } else {
              // Legacy finder: return as FindOperationResult - createFindWrapper will apply post-processing pagination
              const results = finderResult as V[];
              return {
                items: results,
                metadata: {
                  total: results.length,
                  returned: results.length,
                  offset: 0,
                  hasMore: false
                }
              };
            }
          } else {
            const availableFinders = options.finders ? Object.keys(options.finders) : [];
            logger.error(`Finder not found`, {
              component: 'lib-firestore',
              operation: 'find',
              requestedFinder: finder,
              availableFinders,
              suggestion: `Use one of: ${availableFinders.join(', ')}`,
              coordinate: JSON.stringify(definition.coordinate)
            });
            throw new Error(`Finder '${finder}' not found. Available finders: ${availableFinders.join(', ')}`);
          }
        } else {
          const availableFinders = options.finders ? Object.keys(options.finders) : [];
          logger.error(`No finders defined for library`, {
            component: 'lib-firestore',
            operation: 'find',
            requestedFinder: finder,
            finderParams,
            availableFinders,
            suggestion: availableFinders.length > 0
              ? `Use one of the available finders: ${availableFinders.join(', ')}`
              : 'Define finders in your library configuration',
            coordinate: JSON.stringify(definition.coordinate)
          });
          throw new Error(`No finders found. ${availableFinders.length > 0 ? `Available finders: ${availableFinders.join(', ')}` : 'No finders defined.'}`);
        }
      } catch (error: any) {
        // Transform Firestore errors
        throw transformFirestoreError(error, definition.coordinate.kta[0]);
      }
    });
}
