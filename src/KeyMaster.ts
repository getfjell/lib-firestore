import {
  AllItemTypeArrays,
  Item,
} from '@fjell/core';

import LibLogger from '@/logger';

const logger = LibLogger.get('KeyMaster');

/**
 * Removes the 'key' property from an item's properties.
 *
 * @template S - The primary type string
 * @template L1 - The first location type string (optional)
 * @template L2 - The second location type string (optional)
 * @template L3 - The third location type string (optional)
 * @template L4 - The fourth location type string (optional)
 * @template L5 - The fifth location type string (optional)
 * @param {Partial<Item<S, L1, L2, L3, L4, L5>>} item - The item properties from which to remove the key
 * @returns {Partial<Item<S, L1, L2, L3, L4, L5>>} The item properties with the key removed
 */
export const removeKey = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>):
  Partial<Item<S, L1, L2, L3, L4, L5>> => {
  logger.debug('Removing Key', { item });
  delete item.key;
  return item;
}

/**
 * Adds a key structure to an item based on the document snapshot and key types.
 * The key structure includes the primary key and location keys based on the document's path hierarchy.
 *
 * @template S - The primary type string
 * @template L1 - The first location type string (optional)
 * @template L2 - The second location type string (optional)
 * @template L3 - The third location type string (optional)
 * @template L4 - The fourth location type string (optional)
 * @template L5 - The fifth location type string (optional)
 * @param {Partial<Item<S, L1, L2, L3, L4, L5>>} item - The item to add the key to
 * @param {FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>} doc - The Firestore document snapshot
 * @param {AllItemTypeArrays<S, L1, L2, L3, L4, L5>} keyTypes - Array of key types defining the hierarchy
 * @returns {void}
 */
export const addKey = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: Partial<Item<S, L1, L2, L3, L4, L5>>, doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>, keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>): void => {
  logger.debug('Adding Key', { item });
  const key = {};
  if (Array.isArray(keyTypes) && keyTypes.length > 1) {
    const type = [...keyTypes];
    const pkType = type.shift();
    Object.assign(key, { kt: pkType, pk: doc.id });
    // TODO: This is a hack to get the location key - I fucking hate this
    if (type.length === 1) {
      Object.assign(key, { loc: [{ kt: type[0], lk: doc.ref.parent.parent?.id }] });
    } else if (type.length === 2) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent?.parent?.id },
        ]
      });
    } else if (type.length === 3) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent?.parent?.id },
          { kt: type[2], lk: doc.ref.parent.parent?.parent?.parent?.parent?.parent?.id },
        ]
      });
    } else if (type.length === 4) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent?.parent?.id },
          { kt: type[2], lk: doc.ref.parent.parent?.parent?.parent?.parent?.parent?.id },
          { kt: type[3], lk: doc.ref.parent.parent?.parent?.parent?.parent?.parent?.parent?.parent?.id },
        ]
      });
    } else if (type.length === 5) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent?.parent?.id },
          { kt: type[2], lk: doc.ref.parent.parent?.parent?.parent?.parent?.parent?.id },
          { kt: type[3], lk: doc.ref.parent.parent?.parent?.parent?.parent?.parent?.parent?.parent?.id },
          {
            kt: type[4],
            lk: doc.ref.parent.parent?.parent?.parent?.parent?.parent?.parent?.parent?.parent?.parent?.id,
          },
        ]
      });
    }
  } else {
    Object.assign(key, { kt: keyTypes[0], pk: doc.id });
  }
  Object.assign(item, { key });
};
