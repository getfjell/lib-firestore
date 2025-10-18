/* eslint-disable indent */
import { ComKey, createGetWrapper, GetMethod, isComKey, isValidItemKey, Item, NotFoundError, PriKey, validateKeys } from "@fjell/core";
import { type Registry } from "@fjell/lib";
import { DocumentReference } from "@google-cloud/firestore";
import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";
import { transformFirestoreError } from "../errors/firestoreErrorHandler";

const logger = LibLogger.get('ops', 'get');

export const getGetOperation = <
  V extends Item<S, L1, L2, L3, L4, L5>,
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  firestore: FirebaseFirestore.Firestore,
  definition: Definition<V, S, L1, L2, L3, L4, L5>,
   
  registry: Registry,
): GetMethod<V, S, L1, L2, L3, L4, L5> => {

  const { collectionNames, coordinate } = definition;
  const { kta } = coordinate;

  return createGetWrapper(
    coordinate,
    async (key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>): Promise<V> => {
      try {
        logger.default('Get', { key, kta, collectionNames, coordinate });
        
        // Runtime validation: Check if the key is valid
        if (!isValidItemKey(key)) {
          logger.error('Key for Get is not a valid ItemKey: %j', key);
          throw new Error('Key for Get is not a valid ItemKey');
        }

        const itemKey = key;

        // Handle empty loc array ComKey: use collection group query
        if (isComKey(itemKey)) {
          const comKey = itemKey as ComKey<S, L1, L2, L3, L4, L5>;
          
          if (comKey.loc.length === 0) {
            logger.debug('Using collection group query to find item by primary key across all locations', { pk: comKey.pk });
            
            // Use collection group to query across all subcollections
            // We query by the 'id' field which should contain the primary key value
            const collectionName = collectionNames[0];
            const collectionGroup = firestore.collectionGroup(collectionName);
            
            // Query for documents where the id field matches the primary key
            // The id field is typically set to the document ID during creation
            const snapshot = await collectionGroup.where('id', '==', comKey.pk).limit(1).get();
            
            if (snapshot.empty) {
              logger.debug('No document found with primary key across all locations', { pk: comKey.pk });
              throw new NotFoundError(
                `${kta[0]} not found`,
                kta[0],
                key
              );
            }
            
            // Get the first matching document (should be unique by primary key)
            const doc = snapshot.docs[0];
            logger.debug('Found document via collection group query', { path: doc.ref.path, id: doc.id });
            
            const item = await processDoc(
              doc,
              kta,
              definition.options.references || [],
              definition.options.aggregations || [],
              registry
            );
            return validateKeys(item, kta) as V;
          }
        }

        // Standard path: get document by reference
        const docRef =
          getReference(
            itemKey as ComKey<S, L1, L2, L3, L4, L5> | PriKey<S>, collectionNames, firestore) as DocumentReference;

        const doc = await docRef.get();
        if (!doc.exists) {
          throw new NotFoundError(
            `${kta[0]} not found`,
            kta[0],
            key
          );
        }

        const item = await processDoc(
          doc,
          kta,
          definition.options.references || [],
          definition.options.aggregations || [],
          registry
        );
        return validateKeys(item, kta) as V;
      } catch (error: any) {
        // Transform Firestore errors but pass through NotFoundError
        if (error instanceof NotFoundError) throw error;
        throw transformFirestoreError(error, kta[0], key);
      }
    }
  );
}
