import { ComKey, Item, LocKeyArray, PriKey } from '@fjell/types';
import * as Library from '@fjell/lib';
import LibLogger from './logger';
import { FirestoreReferenceDefinition } from './processing/ReferenceBuilder';

const logger = LibLogger.get('Options');

/**
 * Firestore-specific Options that uses FirestoreReferenceDefinition
 * instead of the generic ReferenceDefinition
 */
export interface Options<
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
> {
  hooks?: {
    preCreate?: (
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?:
        {
          key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
          locations?: never;
        } | {
          key?: never;
          locations: LocKeyArray<L1, L2, L3, L4, L5>,
        }
    ) => Promise<Partial<Item<S, L1, L2, L3, L4, L5>>>;
    postCreate?: (
      item: V,
    ) => Promise<V>;
    preUpdate?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    ) => Promise<Partial<Item<S, L1, L2, L3, L4, L5>>>;
    postUpdate?: (
      item: V,
    ) => Promise<V>;
    preRemove?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    ) => Promise<Partial<Item<S, L1, L2, L3, L4, L5>>>;
    postRemove?: (
      item: V,
    ) => Promise<V>;
  },
  validators?: {
    onCreate?: (
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
      options?:
        {
          key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
          locations?: never;
        } | {
          key?: never;
          locations: LocKeyArray<L1, L2, L3, L4, L5>,
        }
    ) => Promise<boolean>;
    onUpdate?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
      item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    ) => Promise<boolean>;
    onRemove?: (
      key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
    ) => Promise<boolean>;
  },
  finders?: Record<string, Library.FinderMethod<V, S, L1, L2, L3, L4, L5>>,
  actions?: Record<string, Library.ActionMethod<V, S, L1, L2, L3, L4, L5>>,
  facets?: Record<string, Library.FacetMethod<V, S, L1, L2, L3, L4, L5>>,
  allActions?: Record<string, Library.AllActionMethod<V, S, L1, L2, L3, L4, L5>>,
  allFacets?: Record<string, Library.AllFacetMethod<L1, L2, L3, L4, L5>>,
  references?: FirestoreReferenceDefinition[], // Firestore-specific!
  aggregations?: Library.AggregationDefinition[],
}

export const createOptions = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(libOptions?: Library.Options<V, S, L1, L2, L3, L4, L5>):
  Options<V, S, L1, L2, L3, L4, L5> => {
  logger.default('createOptions', { libOptions });
  
  // Convert Library options to Firestore options (references are compatible since FirestoreReferenceDefinition extends ReferenceDefinition)
  const { references, ...otherOptions } = libOptions || {};
  
  // Create base options from Library
  const baseOptions = Library.createOptions(otherOptions as Library.Options<V, S, L1, L2, L3, L4, L5>);
  
  // Return Firestore options with references (they're compatible now)
  return {
    ...baseOptions,
    references: references as FirestoreReferenceDefinition[] | undefined
  } as Options<V, S, L1, L2, L3, L4, L5>;
}
