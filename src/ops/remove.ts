/* eslint-disable indent */

import { ComKey, isValidItemKey, Item, PriKey, validateKeys } from "@fjell/core";

import { Definition } from "../Definition";
import LibLogger from "../logger";
import { Registry } from "@fjell/lib";
import { getUpdateOperation } from "./update";

const logger = LibLogger.get('ops', 'remove');

export const getRemoveOperations = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  firestore: FirebaseFirestore.Firestore,
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  registry: Registry,
) => {

  const { options } = definition;
  const { hooks } = options;
  const { coordinate } = definition;
  const { kta } = coordinate;

  const remove = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {
    logger.default('Remove', { key });

    if (!isValidItemKey(key)) {
      logger.error('Key for Remove is not a valid ItemKey: %j', key);
      throw new Error('Key for Remove is not a valid ItemKey');
    }

    const updateOperation = getUpdateOperation(firestore, definition, registry);
    // TODO: Move validate keys up.
    const item = validateKeys(await updateOperation(
      key,
      { events: { deleted: { at: new Date() } } } as unknown as Partial<Item<S, L1, L2, L3, L4, L5>>,
    ), kta);
    if (hooks?.postRemove) {
      logger.default('Running postRemove Hook', { item });
      return hooks.postRemove(item as V);
    } else {
      return item as V;
    }
  }

  return remove;
}