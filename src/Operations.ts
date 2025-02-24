import { Item } from "@fjell/core";

import * as Library from "@fjell/lib";
import { Definition } from "./Definition";
import { getAllOperation } from "./ops/all";
import { getCreateOperation } from "./ops/create";
import { getFindOperation } from "./ops/find";
import { getGetOperation } from "./ops/get";
import { getOneOperation } from "./ops/one";
import { getRemoveOperations } from "./ops/remove";
import { getUpdateOperation } from "./ops/update";
import LibLogger from "./logger";

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
  // eslint-disable-next-line max-params
  ): Library.Operations<V, S, L1, L2, L3, L4, L5> => {

  logger.debug('createOperations', { firestore, definition });

  const operations = {} as Library.Operations<V, S, L1, L2, L3, L4, L5>;

  operations.all = getAllOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition);
  operations.one = getOneOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition);
  operations.create = getCreateOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition);
  operations.update = getUpdateOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition);
  operations.get = getGetOperation<V, S, L1, L2, L3, L4, L5>(firestore, definition);
  operations.remove = getRemoveOperations<V, S, L1, L2, L3, L4, L5>(firestore, definition);
  operations.find = getFindOperation<V, S, L1, L2, L3, L4, L5>(definition, operations);
  operations.upsert = () => {
    throw new Error('Not implemented');
  };

  return operations;
}