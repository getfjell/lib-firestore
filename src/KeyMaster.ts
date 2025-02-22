/* eslint-disable no-undefined */
import {
  AllItemTypeArrays,
  Item,
  ItemProperties
} from '@fjell/core';

import LibLogger from '@/logger';

const logger = LibLogger.get('firestore', 'KeyMaster');

export const removeKey = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(item: ItemProperties<S, L1, L2, L3, L4, L5>):
      ItemProperties<S, L1, L2, L3, L4, L5> => {
  logger.default('Removing Key', { item });
  delete item.key;
  return item;
}
    
export const addKey = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
    item: Partial<Item<S, L1, L2, L3, L4, L5>>,
    doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
    keyTypes: AllItemTypeArrays<S, L1, L2, L3, L4, L5>
  ): void => {
  logger.default('Adding Key', { item });
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
          { kt: type[1], lk: doc.ref.parent.parent?.parent.parent?.id },
        ]
      });
    } else if (type.length === 3) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent.parent?.id },
          { kt: type[2], lk: doc.ref.parent.parent?.parent.parent?.parent.parent?.id },
        ]
      });
    } else if (type.length === 4) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent.parent?.id },
          { kt: type[2], lk: doc.ref.parent.parent?.parent.parent?.parent.parent?.id },
          { kt: type[3], lk: doc.ref.parent.parent?.parent.parent?.parent.parent?.parent.parent?.id },
        ]
      });
    } else if (type.length === 5) {
      Object.assign(key, {
        loc: [
          { kt: type[0], lk: doc.ref.parent.parent?.id },
          { kt: type[1], lk: doc.ref.parent.parent?.parent.parent?.id },
          { kt: type[2], lk: doc.ref.parent.parent?.parent.parent?.parent.parent?.id },
          { kt: type[3], lk: doc.ref.parent.parent?.parent.parent?.parent.parent?.parent.parent?.id },
          {
            kt: type[4],
            lk: doc.ref.parent.parent?.parent.parent?.parent.parent?.parent.parent?.parent.parent?.id,
          },
        ]
      });
    }
  } else {
    Object.assign(key, { kt: keyTypes[0], pk: doc.id });
  }
  Object.assign(item, { key });
};
  