import { Definition } from "@/Definition";
import * as Abstract from "@/Operations";
import { getAllOperation } from "@/contained/ops/all";
import { getOneOperation } from "@/contained/ops/one";
import { Item } from "@fjell/core";

export const createOperations = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(firestore: FirebaseFirestore.Firestore, definition: Definition<V, S, L1, L2, L3, L4, L5>) => {

  const operations = Abstract.createOperations(firestore, definition);

  return {
    ...operations,
    all: getAllOperation(firestore, definition),
    one: getOneOperation(firestore, definition),
  }
}