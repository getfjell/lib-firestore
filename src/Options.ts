import * as Library from '@fjell/lib';
import { Item } from '@fjell/core';

export const createOptions = <
V extends Item<S, L1, L2, L3, L4, L5>,
S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never
>(libOptions?: Library.Options<V, S, L1, L2, L3, L4, L5>) => {
  const options = Library.createOptions(libOptions);
  return {
    ...options
  };
}
