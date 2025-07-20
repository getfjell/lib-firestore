import { Item } from "@fjell/core";
import * as Library from "@fjell/lib";
import { Registry } from "@fjell/lib";
import { Options } from "./Options";
import { InstanceFactory as BaseInstanceFactory, Coordinate, RegistryHub } from "@fjell/registry";
import { createInstanceFromComponents, Instance } from "./Instance";
import LibLogger from "./logger";

const logger = LibLogger.get("InstanceFactory");

export type InstanceFactory<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> = (
  firestore: FirebaseFirestore.Firestore,
  operations: Library.Operations<V, S, L1, L2, L3, L4, L5>,
  options: Options<V, S, L1, L2, L3, L4, L5>
) => BaseInstanceFactory<S, L1, L2, L3, L4, L5>;

/**
 * Factory function for creating firestore instances
 */
export const createInstanceFactory = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
    firestore: FirebaseFirestore.Firestore,
    operations: Library.Operations<V, S, L1, L2, L3, L4, L5>,
    options: Options<V, S, L1, L2, L3, L4, L5>
  ): BaseInstanceFactory<S, L1, L2, L3, L4, L5> => {
  return (coordinate: Coordinate<S, L1, L2, L3, L4, L5>, context: { registry: any, registryHub?: RegistryHub }) => {
    logger.debug("Creating firestore instance", { coordinate, registry: context.registry, firestore, operations, options });

    return createInstanceFromComponents(context.registry as Registry, coordinate, firestore, operations, options) as Instance<V, S, L1, L2, L3, L4, L5>;
  };
};
