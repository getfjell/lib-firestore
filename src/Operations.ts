/* eslint-disable indent */
import { FindOperationResult, Item } from "@fjell/core";

import * as Library from "@fjell/lib";
import { Definition } from "./Definition";
import LibLogger from "./logger";
import { getAllOperation } from "./ops/all";
import { getCreateOperation } from "./ops/create";
import { getFindOperation } from "./ops/find";
import { getGetOperation } from "./ops/get";
import { getOneOperation } from "./ops/one";
import { getRemoveOperations } from "./ops/remove";
import { getUpdateOperation } from "./ops/update";
import { getUpsertOperation } from "./ops/upsert";

const logger = LibLogger.get('Operations');

export const createOperations = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never,
>(
  firestore: FirebaseFirestore.Firestore,
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
  registry: Library.Registry,
): Library.Operations<V, S, L1, L2, L3, L4, L5> => {

  logger.default('createOperations', { firestore, definition });

  // Create implementation operations (core CRUD and query operations only)
  // These are the operations that lib-firestore actually implements
  const implOps: Library.ImplementationOperations<V, S, L1, L2, L3, L4, L5> = {
    all: getAllOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry),
    one: getOneOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry),
    create: getCreateOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry),
    update: getUpdateOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry),
    get: getGetOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry),
    remove: getRemoveOperations<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry),
    // These operations depend on the operations object itself, so we'll set them temporarily
    find: null as any,
    findOne: null as any,
    upsert: null as any,
  };

  // Set operations that depend on the operations object
  implOps.find = getFindOperation<V, S, L1, L2, L3, L4, L5>(definition, implOps as any, registry) as any;
  implOps.findOne = async (finder: string, params?: Library.OperationParams, locations?: any): Promise<V | null> => {
    const result = await implOps.find(finder, params || {}, locations) as any as FindOperationResult<V>;
    return result.items.length > 0 ? result.items[0] : null;
  };
  implOps.upsert = getUpsertOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry, implOps as any);

  // Wrap with default stub implementations for extended operations (facets, actions)
  // and add metadata dictionaries (finders, actions, facets, allActions, allFacets)
  return Library.wrapImplementationOperations(implOps, definition.options);
}
