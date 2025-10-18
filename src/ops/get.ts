/* eslint-disable indent */
import { ComKey, GetMethod, isComKey, isValidItemKey, Item, PriKey, validateKeys } from "@fjell/core";
import { InvalidKeyTypeError, LocationKeyOrderError, NotFoundError, type Registry } from "@fjell/lib";
import { DocumentReference } from "@google-cloud/firestore";
import { Definition } from "../Definition";
import { processDoc } from "../DocProcessor";
import { getReference } from "../ReferenceFinder";
import LibLogger from "../logger";
import { Coordinate } from "@fjell/registry";

const logger = LibLogger.get('ops', 'get');

/**
 * Validates that the location key array in a ComKey matches the expected hierarchy
 * defined by the coordinate's key type array (kta).
 */
const validateLocationKeyOrder = <
  S extends string,
  L1 extends string = never,
  L2 extends string = never,
  L3 extends string = never,
  L4 extends string = never,
  L5 extends string = never
>(
  key: ComKey<S, L1, L2, L3, L4, L5>,
  coordinate: Coordinate<S, L1, L2, L3, L4, L5>,
  operation: string
): void => {
  const keyTypeArray = coordinate.kta;
  const expectedLocationTypes = keyTypeArray.slice(1); // Remove primary key type
  const actualLocationTypes = key.loc.map(loc => loc.kt);
  
  // Check if lengths match
  if (expectedLocationTypes.length !== actualLocationTypes.length) {
    logger.error('Location key array length mismatch', {
      expected: expectedLocationTypes.length,
      actual: actualLocationTypes.length,
      key,
      coordinate
    });
    throw new LocationKeyOrderError(operation, coordinate, key);
  }
  
  // Check if each position matches
  for (let i = 0; i < expectedLocationTypes.length; i++) {
    if (expectedLocationTypes[i] !== actualLocationTypes[i]) {
      logger.error('Location key array order mismatch', {
        position: i,
        expected: expectedLocationTypes[i],
        actual: actualLocationTypes[i],
        key,
        coordinate
      });
      throw new LocationKeyOrderError(operation, coordinate, key);
    }
  }
};

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

  const get = async (
    key: PriKey<S> | ComKey<S, L1, L2, L3, L4, L5>,
  ): Promise<V> => {

    const { collectionNames, coordinate } = definition;
    const { kta } = coordinate;

    logger.default('Get', { key, kta, collectionNames, coordinate });
    
    // Runtime validation: Check if the key is valid
    if (!isValidItemKey(key)) {
      logger.error('Key for Get is not a valid ItemKey: %j', key);
      throw new InvalidKeyTypeError('get', coordinate, key, kta.length > 1);
    }

    // Runtime validation: Check if the key type matches the library type
    const isCompositeLibrary = kta.length > 1;
    const keyIsComposite = isComKey(key);
    
    // Validate that the key type matches the library type
    if (isCompositeLibrary && !keyIsComposite) {
      // This is a composite library but received a primary key
      logger.error('Composite library received primary key', { key, coordinate });
      throw new InvalidKeyTypeError('get', coordinate, key, true);
    }
    
    if (!isCompositeLibrary && keyIsComposite) {
      // This is a primary library but received a composite key
      logger.error('Primary library received composite key', { key, coordinate });
      throw new InvalidKeyTypeError('get', coordinate, key, false);
    }
    
    // For composite keys, validate the location key array order
    if (keyIsComposite) {
      const comKey = key as ComKey<S, L1, L2, L3, L4, L5>;
      
      // Empty loc array is a special case: it means "find by primary key across all locations"
      // Skip location key order validation for empty loc arrays
      if (comKey.loc.length > 0) {
        validateLocationKeyOrder(comKey, coordinate, 'get');
      } else {
        logger.debug('Empty loc array detected - will use collection group query', { key });
      }
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
          throw new NotFoundError<S, L1, L2, L3, L4, L5>('get', coordinate, key);
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
      throw new NotFoundError<S, L1, L2, L3, L4, L5>('get', coordinate, key);
    } else {
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

  return get;
}
