import { ComKey, generateKeyArray, isPriKey, LocKeyArray, PriKey } from "@fjell/core";

import { LocKey } from "@fjell/core";

import LibLogger from "@/logger";
import { DocumentReference } from "@google-cloud/firestore";

const logger = LibLogger.get('ReferenceFinder');

export const addReference = <S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never
>(
    base: FirebaseFirestore.Firestore | FirebaseFirestore.DocumentReference,
    keys: Array<PriKey<S> | LocKey<L1 | L2 | L3 | L4 | L5>>,
    collections: string[],
  ): FirebaseFirestore.DocumentReference => {
  logger.debug('Adding Reference', { base, keys, collections });
    
  if (keys.length === 0) {
    // If you've recursively consumed all of the keys, return the base.
    // TODO: There's one issue here, if the base is a Firestore instance, this is a weird cast
    return base as DocumentReference;
  } else {
    // Retrieve the next key and collection, and create the next base
    let nextBase: FirebaseFirestore.Firestore | FirebaseFirestore.DocumentReference;
    const key = keys.pop();
    const collection = collections.pop();
    
    if (key && collection) {
      if (isPriKey(key)) {
        const PriKey = key as PriKey<S>;
        nextBase = base.collection(collection).doc(PriKey.pk.toString());
      } else {
        const LocKey = key as LocKey<L1 | L2 | L3 | L4 | L5>;
        nextBase = base.collection(collection).doc(LocKey.lk.toString());
      }
    } else {
      logger.error('addReference should never run out of keys or collections');
      // TODO: Make this an exception type?
      throw new Error('addReference should never run out of keys or collections');
    }
    
    return addReference(nextBase, keys, collections);
  }
}

// TODO: OK, I don't like this - the pop command called in addReference has the ability to mutate the original array
// If you look at the callers of this code, it is on them to know this.  This doesn't make sense.   We need a way
// to guarantee the config doesn't get changed, but I also think that the responsibility of this method should
// be to make sure that the change isn't made.
export const getReference =
<S extends string,
L1 extends string = never,
L2 extends string = never,
L3 extends string = never,
L4 extends string = never,
L5 extends string = never>(
    key: ComKey<S, L1, L2, L3, L4, L5> | PriKey<S> | LocKeyArray<L1, L2, L3, L4, L5> | [],
    collectionNames: string[],
    firestore: FirebaseFirestore.Firestore,
  ):
  FirebaseFirestore.Firestore | FirebaseFirestore.CollectionReference | FirebaseFirestore.DocumentReference => {
  logger.debug('Getting Reference', { key, collectionNames });

  const collections: string[] = [...collectionNames];
  let reference: FirebaseFirestore.Firestore |
    FirebaseFirestore.DocumentReference | FirebaseFirestore.CollectionReference = firestore;
  const keys = generateKeyArray(key);
  reference = addReference(reference, keys, collections);

  // If there is only one collection left in the collections array, this means that
  // we received LocKeys and we need to add the last collection to the reference
  if (collections.length === 1) {
    reference = (reference as DocumentReference).collection(collections[0]);
  }

  return reference;
};

