/* eslint-disable indent */
import { Item } from "@fjell/core";

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

  const operations = {} as Library.Operations<V, S, L1, L2, L3, L4, L5>;

  operations.all = getAllOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry);
  operations.one = getOneOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry);
  operations.create = getCreateOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry);
  operations.update = getUpdateOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry);
  operations.get = getGetOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry);
  operations.remove = getRemoveOperations<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry);
  operations.find = getFindOperation<V, S, L1, L2, L3, L4, L5>(definition, operations, registry);
  operations.upsert = getUpsertOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition, registry, operations);

  operations.allFacet = async (): Promise<any> => { };
  operations.allAction = async (): Promise<any> => { };
  operations.action = async (): Promise<any> => { };
  operations.facet = async (): Promise<any> => { };
  operations.finders = { ...(definition.options.finders || {}) };
  operations.actions = { ...(definition.options.actions || {}) };
  operations.facets = { ...(definition.options.facets || {}) };
  operations.allActions = { ...(definition.options.allActions || {}) };
  operations.allFacets = { ...(definition.options.allFacets || {}) };

  return operations;
}
