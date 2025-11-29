/* eslint-disable indent */
import { ComKey, generateKeyArray, isPriKey, LocKeyArray, PriKey } from "@fjell/core";

import { LocKey } from "@fjell/core";

import LibLogger from "./logger";
import { DocumentReference } from "@google-cloud/firestore";

const logger = LibLogger.get('ReferenceFinder');

/**
 * Recursively builds a Firestore DocumentReference by traversing through collections and documents
 * using the provided keys and collection names. This method is specifically designed to work with
 * Fjell-managed documents in Firestore, which store references to other documents using a structured
 * key system (PriKey or LocKey). When a document needs to reference another document, this method
 * constructs the proper path to that document by following the reference chain.
 *
 * This method consumes keys and collections in reverse order (using pop()) to build a reference path.
 * Each key corresponds to a document ID within its respective collection.
 *
 * @template S - String type for primary keys
 * @template L1 - String type for location key level 1
 * @template L2 - String type for location key level 2
 * @template L3 - String type for location key level 3
 * @template L4 - String type for location key level 4
 * @template L5 - String type for location key level 5
 *
 * @param base - The starting point: either a Firestore instance or an existing DocumentReference
 * @param keys - Array of keys (PriKey or LocKey) that will be consumed to build the document path.
 *               WARNING: This array is mutated during execution (elements are popped off)
 * @param collections - Array of collection names corresponding to the keys.
 *                      WARNING: This array is mutated during execution (elements are popped off)
 *
 * @returns A DocumentReference pointing to the final document in the path
 *
 * @throws {Error} When the method runs out of keys or collections before completing the path
 *
 * @example
 * ```typescript
 * // Building a reference to: /users/{userId}/orders/{orderId}
 * const userKey = { pk: "user123" } as PriKey<"User">;
 * const orderKey = { pk: "order456" } as PriKey<"Order">;
 * const keys = [userKey, orderKey];
 * const collections = ["users", "orders"];
 *
 * const docRef = addReference(firestore, keys, collections);
 * // Result: DocumentReference to /users/user123/orders/order456
 * ```
 *
 * @remarks
 * **Known Issues:**
 * - The method mutates the input arrays by using pop(), which can cause unexpected behavior
 *   for callers who may not expect their arrays to be modified
 * - When base is a Firestore instance and keys array is empty, the cast to DocumentReference
 *   may not be type-safe
 * - Callers must be aware that their input arrays will be modified after calling this method
 *
 * **Behavior Details:**
 * - If keys array is empty, returns the base cast as DocumentReference (base case for recursion)
 * - For each iteration, pops one key and one collection name from their respective arrays
 * - Determines if key is a PriKey or LocKey and extracts the appropriate identifier (pk or lk)
 * - Creates a new DocumentReference by chaining collection(collectionName).doc(keyValue)
 * - Recursively calls itself with the new DocumentReference and remaining keys/collections
 */
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
  logger.debug('Adding Reference', {
    baseType: base.constructor.name,
    basePath: (base as any).path || 'no path',
    keys,
    keysLength: keys.length,
    collections,
    collectionsLength: collections.length
  });

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
        logger.debug('Adding PriKey reference', {
          collection,
          pk: PriKey.pk,
          kt: PriKey.kt
        });
        nextBase = base.collection(collection).doc(PriKey.pk.toString());
        logger.debug('Created reference', {
          path: (nextBase as any).path || 'no path'
        });
      } else {
        const LocKey = key as LocKey<L1 | L2 | L3 | L4 | L5>;
        logger.debug('Adding LocKey reference', {
          collection,
          lk: LocKey.lk,
          kt: LocKey.kt
        });
        nextBase = base.collection(collection).doc(LocKey.lk.toString());
        logger.debug('Created reference', {
          path: (nextBase as any).path || 'no path'
        });
      }
    } else {
      logger.error('addReference should never run out of keys or collections');
      // TODO: Make this an exception type?
      throw new Error('addReference should never run out of keys or collections');
    }

    return addReference(nextBase, keys, collections);
  }
}

/**
 * Main entry point for constructing Firestore references from Fjell key structures.
 * This method serves as the primary interface for operations that need to locate documents
 * in Firestore using Fjell's structured key system.
 *
 * This method acts as a safe wrapper around addReference by:
 * - Creating defensive copies of input arrays to prevent mutation
 * - Converting various key formats into a standardized key array
 * - Handling the special case of LocKeys that require an additional collection reference
 *
 * @template S - String type for primary keys
 * @template L1 - String type for location key level 1
 * @template L2 - String type for location key level 2
 * @template L3 - String type for location key level 3
 * @template L4 - String type for location key level 4
 * @template L5 - String type for location key level 5
 *
 * @param key - The key structure representing the document to reference. Can be:
 *              - ComKey: A composite key containing both primary and location components
 *              - PriKey: A primary key for direct document access
 *              - LocKeyArray: An array of location keys for nested document paths
 *              - []: Empty array for root-level collection access
 * @param collectionNames - Array of collection names that define the Firestore path structure.
 *                          Each collection name corresponds to a level in the document hierarchy.
 * @param firestore - The Firestore instance to build references against
 *
 * @returns One of three possible reference types:
 *          - DocumentReference: When the path resolves to a specific document
 *          - CollectionReference: When the path resolves to a collection (typically with LocKeys)
 *          - Firestore: In edge cases where no path is constructed (rare)
 *
 * @example
 * ```typescript
 * // Getting a document reference using a primary key
 * const userKey = { pk: "user123" } as PriKey<"User">;
 * const docRef = getReference(userKey, ["users"], firestore);
 * // Result: DocumentReference to /users/user123
 *
 * // Getting a collection reference using location keys
 * const locationKeys = [{ lk: "region1" }, { lk: "store1" }] as LocKeyArray<"Region", "Store">;
 * const collectionRef = getReference(locationKeys, ["regions", "stores", "products"], firestore);
 * // Result: CollectionReference to /regions/region1/stores/store1/products
 *
 * // Getting a nested document reference using composite key
 * const compositeKey = {
 *   pk: "order123",
 *   lks: [{ lk: "customer456" }]
 * } as ComKey<"Order", "Customer">;
 * const docRef = getReference(compositeKey, ["customers", "orders"], firestore);
 * // Result: DocumentReference to /customers/customer456/orders/order123
 * ```
 *
 * @remarks
 * **Safety Features:**
 * - Creates defensive copies of input arrays to prevent mutation (unlike addReference)
 * - Handles multiple key formats through the generateKeyArray utility
 * - Provides type safety through extensive generic constraints
 *
 * **Special Behavior:**
 * - When using LocKeys, the method automatically appends the final collection to create
 *   a CollectionReference rather than stopping at a DocumentReference
 * - This allows for querying collections filtered by location hierarchy
 *
 * **Usage Context:**
 * This method is the primary interface used by Fjell operations to:
 * - Locate existing documents for read/update operations
 * - Construct parent references for creating new documents
 * - Build collection references for queries within specific contexts
 */
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
    const keys = generateKeyArray(key);
    logger.debug('Generated keys array', { keys, keysLength: keys.length });

    // Special case: if no keys and exactly one collection, return collection reference directly
    if (keys.length === 0 && collections.length === 1) {
      logger.debug('No keys, returning collection reference directly', { collection: collections[0] });
      const colRef = firestore.collection(collections[0]);

      // Validate that we got a real CollectionReference, not a mock
      if (!colRef || typeof colRef.path !== 'string' || colRef.constructor.name === 'Object') {
        logger.error('CRITICAL: Firestore.collection() returned a mock object instead of CollectionReference', {
          collection: collections[0],
          colRefType: typeof colRef,
          colRefConstructor: colRef?.constructor?.name,
          hasPath: typeof (colRef as any)?.path,
          pathValue: (colRef as any)?.path,
          firestoreType: firestore?.constructor?.name,
          firestoreHasCollection: typeof firestore?.collection
        });
        throw new Error(`Firestore instance appears to be a mock. collection() returned ${colRef?.constructor?.name || typeof colRef} instead of CollectionReference. Check that GOOGLE_PROJECT_ID, GOOGLE_FIRESTORE_DATABASE, and GOOGLE_ULLR_BUCKET are set.`);
      }

      logger.debug('Collection reference created', {
        path: colRef.path,
        referenceType: colRef.constructor.name
      });
      return colRef;
    }

    let reference: FirebaseFirestore.Firestore |
      FirebaseFirestore.DocumentReference | FirebaseFirestore.CollectionReference = firestore;
    reference = addReference(reference, keys, collections);
    logger.debug('After addReference', {
      collectionsRemaining: collections.length,
      referenceType: reference.constructor.name
    });

    // If there is only one collection left in the collections array, this means that
    // we received LocKeys and we need to add the last collection to the reference
    if (collections.length === 1) {
      logger.debug('Adding final collection to reference', { collection: collections[0] });
      reference = (reference as DocumentReference).collection(collections[0]);
      logger.debug('Final collection reference path', {
        path: (reference as any).path || 'path not available'
      });
    }

    logger.debug('Returning reference', {
      finalReferenceType: reference.constructor.name,
      path: (reference as any).path || 'path not available'
    });

    return reference;
  };
