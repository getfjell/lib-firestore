import { createFindWrapper, FindMethod, Item, LocKeyArray } from "@fjell/core";

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
      locations?: LocKeyArray<L1, L2, L3, L4, L5> | []
    ): Promise<V[]> => {
      try {
        logger.default('Find', { finder, finderParams, locations, options });

        // Note that we execute the createFinders function here because we want to make sure we're always getting the
        // most up to date methods.
        if (options.finders && options.finders[finder]) {
          const finderMethod = options.finders[finder];
          if (finderMethod) {
            return finderMethod(finderParams, locations);
          } else {
            logger.error(`Finder %s not found`, finder);
            throw new Error(`Finder ${finder} not found`);
          }
        } else {
          logger.error(
          `No finders have been defined for this lib.  Requested finder %s with params %j`, finder, finderParams);
          throw new Error(`No finders found`);
        }
      } catch (error: any) {
        // Transform Firestore errors
        throw transformFirestoreError(error, definition.coordinate.kta[0]);
      }
    });
}
