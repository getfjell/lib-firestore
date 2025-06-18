import { LocKey, PriKey } from '@fjell/core';
import type { Mock } from 'vitest';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock declarations for logger
const mockLoggerDebug = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerGet = vi.fn(() => ({
  debug: mockLoggerDebug,
  error: mockLoggerError,
}));

// @ts-ignore
vi.mock('@/logger', () => ({
  __esModule: true,
  default: {
    get: mockLoggerGet,
  },
}));

// Mock declarations for @fjell/core
const mockGenerateKeyArray = vi.fn();
const mockIsPriKey = vi.fn();

// @ts-ignore
vi.mock('@fjell/core', () => ({
  __esModule: true,
  generateKeyArray: mockGenerateKeyArray,
  isPriKey: mockIsPriKey,
  // Types like PriKey, LocKey are imported normally for use in tests
}));

// Mock declarations for @google-cloud/firestore
// These will be functions that return mock instances/objects
let mockFirestoreCollectionMethod: Mock;
let mockDocCollectionMethod: Mock;
let mockCollectionDocMethod: Mock;

const initializeFirestoreMocks = () => {
  // Functions to create mock Firestore objects with chainable methods
  const createMockDocRef = (id?: string): any => {
    const ref: any = {
      path: `mockDocPath/${id || Math.random()}`,
      id: id || `doc-${Math.random()}`
    };
    // A DocumentReference can have .collection()
    // @ts-ignore
    ref.collection = vi.fn((name) => createMockCollectionRef(name, ref.path));
    mockDocCollectionMethod = ref.collection; // Capture for assertions if needed generally
    return ref;
  };

  const createMockCollectionRef = (id?: string, basePath?: string): any => {
    const ref: any = {
      path: `${basePath || 'mockCollectionPath'}/${id || Math.random()}`,
      id: id || `col-${Math.random()}`
    };
    // A CollectionReference can have .doc()
    // @ts-ignore
    ref.doc = vi.fn((name) => createMockDocRef(name));
    mockCollectionDocMethod = ref.doc; // Capture for assertions
    return ref;
  };

  // @ts-ignore
  mockFirestoreCollectionMethod = vi.fn((name) => createMockCollectionRef(name));

  return {
    Firestore: vi.fn(() => ({ // Mock Firestore class constructor
      collection: mockFirestoreCollectionMethod,
    })),
    // DocumentReference and CollectionReference are not directly instantiated with `new` in the code,
    // but their methods are used. The functions above create objects that mimic them.
    __esModule: true,
  };
};

// @ts-ignore
vi.mock('@google-cloud/firestore', () => initializeFirestoreMocks());

// Dynamically import the module under test after mocks are set up
let addReference: any;
let getReference: any;

describe('ReferenceFinder', () => {
  beforeAll(async () => {
    const module = await import('../src/ReferenceFinder');
    addReference = module.addReference;
    getReference = module.getReference;
  });

  beforeEach(() => {
    // Clear all general mocks
    mockLoggerDebug.mockClear();
    mockLoggerError.mockClear();
    mockLoggerGet.mockClear();
    mockGenerateKeyArray.mockClear();
    mockIsPriKey.mockClear();

    // Firestore mocks are reset by virtue of initializeFirestoreMocks being called by Jest
    // or by clearing the top-level mock functions if they were defined outside.
    // With the current setup, vi.fn() inside createMockDocRef/createMockCollectionRef
    // will create fresh mocks for each chain, which is good.
    // We also reset the main entry points captured for general assertions if any.
    if (mockFirestoreCollectionMethod) mockFirestoreCollectionMethod.mockClear();
    if (mockDocCollectionMethod) mockDocCollectionMethod.mockClear();
    if (mockCollectionDocMethod) mockCollectionDocMethod.mockClear();
  });

  describe('addReference', () => {
    let mockBaseDocRef: any;
    let mockFirestoreTestInstance: any;

    beforeEach(() => {
      // Create fresh instances for each test to avoid interference
      const firestoreMockFactory = initializeFirestoreMocks();
      mockFirestoreTestInstance = firestoreMockFactory.Firestore(); // Get a new mocked Firestore instance
      // A mock DocumentReference for when 'base' is a DocumentReference
      mockBaseDocRef = { collection: vi.fn(), path: 'baseDoc/doc1' };
      // Ensure its collection method also returns a chainable structure
      const mockCollForBaseDoc = { doc: vi.fn().mockReturnValue({ path: 'finalStepFromBaseDoc' }) };
      mockBaseDocRef.collection.mockReturnValue(mockCollForBaseDoc);
    });

    test('should return base if keys array is empty', () => {
      const base = mockBaseDocRef;
      const result = addReference(base, [], []);
      expect(result).toBe(base);
    });

    test('should correctly build path for a single PriKey from Firestore base', () => {
      const keys: PriKey<string>[] = [{ pk: 'doc1', kt: 'pri' }];
      const collections = ['col1'];
      mockIsPriKey.mockReturnValue(true);

      const finalDoc = { path: 'col1/doc1' };
      const colRef = { doc: vi.fn().mockReturnValue(finalDoc) };
      mockFirestoreTestInstance.collection.mockReturnValue(colRef);

      const result = addReference(mockFirestoreTestInstance, [...keys], [...collections]);

      expect(mockFirestoreTestInstance.collection).toHaveBeenCalledWith('col1');
      expect(colRef.doc).toHaveBeenCalledWith('doc1');
      expect(result).toBe(finalDoc);
    });

    test('should correctly build path for a single LocKey from DocumentReference base', () => {
      const keys: LocKey<string>[] = [{ lk: 'loc1', kt: 'loc' }];
      const collections = ['subcol1'];
      mockIsPriKey.mockReturnValue(false);

      const finalDoc = { path: 'baseDoc/doc1/subcol1/loc1' };
      const subColRef = { doc: vi.fn().mockReturnValue(finalDoc) };
      mockBaseDocRef.collection.mockReturnValue(subColRef);

      const result = addReference(mockBaseDocRef, [...keys], [...collections]);

      expect(mockBaseDocRef.collection).toHaveBeenCalledWith('subcol1');
      expect(subColRef.doc).toHaveBeenCalledWith('loc1');
      expect(result).toBe(finalDoc);
    });

    test('should handle recursive calls correctly', () => {
      // Keys and collections are processed in reverse due to pop()
      // Order of processing: {pk: 'doc1'} with 'col1', then {pk: 'doc2'} with 'col2'
      const keys: PriKey<string>[] = [{ pk: 'doc2', kt: 'pri' }, { pk: 'doc1', kt: 'pri' }];
      const collections = ['col2', 'col1'];
      mockIsPriKey.mockReturnValue(true); // Assume all are PriKeys

      const finalDocRef = { path: 'col1/doc1/col2/doc2' };
      const intermediateDocRef = { collection: vi.fn(), path: 'col1/doc1' };

      const colRef2 = { doc: vi.fn().mockReturnValue(finalDocRef) };
      intermediateDocRef.collection.mockReturnValue(colRef2);

      const colRef1 = { doc: vi.fn().mockReturnValue(intermediateDocRef) };
      mockFirestoreTestInstance.collection.mockReturnValue(colRef1);

      const result = addReference(mockFirestoreTestInstance, [...keys], [...collections]);

      expect(mockFirestoreTestInstance.collection).toHaveBeenCalledWith('col1');
      expect(colRef1.doc).toHaveBeenCalledWith('doc1');
      expect(intermediateDocRef.collection).toHaveBeenCalledWith('col2');
      expect(colRef2.doc).toHaveBeenCalledWith('doc2');
      expect(result).toBe(finalDocRef);
    });

    test('should throw error if collections run out before keys', () => {
      const keys: PriKey<string>[] = [{ pk: 'doc1', kt: 'pri' }];
      const collections: string[] = [];
      mockIsPriKey.mockReturnValue(true);
      expect(() => addReference(mockFirestoreTestInstance, [...keys], [...collections]))
        .toThrow('addReference should never run out of keys or collections');
      expect(mockLoggerError).toHaveBeenCalledWith('addReference should never run out of keys or collections');
    });

    test('should throw error if keys run out before collections (and both were expected)', () => {
      // This tests the `if (key && collection)` check when one is undefined.
      const keysToTest: PriKey<string>[] = [{ pk: "doc1", kt: 'pri' }];
      const collectionsToTest: string[] = [];

      expect(() => addReference(mockFirestoreTestInstance, [...keysToTest], [...collectionsToTest]))
        .toThrow('addReference should never run out of keys or collections');
    });

    test('should mutate the input keys and collections arrays', () => {
      const keys: PriKey<string>[] = [{ pk: 'doc1', kt: 'pri' }];
      const collections = ['col1'];
      mockIsPriKey.mockReturnValue(true);

      const finalDoc = { path: 'final' };
      const colRef = { doc: vi.fn().mockReturnValue(finalDoc) };
      mockFirestoreTestInstance.collection.mockReturnValue(colRef);

      // Pass arrays directly to test mutation
      addReference(mockFirestoreTestInstance, keys, collections);

      expect(keys).toEqual([]);
      expect(collections).toEqual([]);
      expect(mockLoggerDebug).toHaveBeenCalledWith('Adding Reference', expect.anything());
    });
  });

  describe('getReference', () => {
    let firestoreInstanceForGetRef: any;

    beforeEach(() => {
      const firestoreMockFactory = initializeFirestoreMocks();
      firestoreInstanceForGetRef = firestoreMockFactory.Firestore();
      // Mock isPriKey for addReference's internal usage
      mockIsPriKey.mockImplementation((key: any) => typeof key.pk !== 'undefined');
    });

    test('should return Firestore instance if generated keys are empty and no initial collections', () => {
      mockGenerateKeyArray.mockReturnValue([]);
      const collectionNames: string[] = [];
      const result = getReference([], collectionNames, firestoreInstanceForGetRef);

      expect(mockGenerateKeyArray).toHaveBeenCalledWith([]);
      // addReference(firestore, [], []) returns firestore.
      // collections in getReference is []. length === 1 is false.
      expect(result).toBe(firestoreInstanceForGetRef);
    });

    test('should handle empty key array and one collectionName (casting Firestore to DocumentReference)', () => {
      mockGenerateKeyArray.mockReturnValue([]);
      const collectionNames = ['rootCol'];

      const finalCollectionResult = { path: 'rootColRef' };
      // This is (firestoreInstanceForGetRef as DocumentReference).collection('rootCol')
      firestoreInstanceForGetRef.collection.mockReturnValueOnce(finalCollectionResult);

      const result = getReference([], collectionNames, firestoreInstanceForGetRef);

      expect(mockGenerateKeyArray).toHaveBeenCalledWith([]);
      // addReference returns firestoreInstanceForGetRef. collections (copy) is ['rootCol'].
      // Then (firestoreInstanceForGetRef).collection('rootCol') is called.
      expect(firestoreInstanceForGetRef.collection).toHaveBeenCalledWith('rootCol');
      expect(result).toBe(finalCollectionResult);
    });

    test('should process a PriKey to a DocumentReference', () => {
      const pkInput: PriKey<string> = { pk: 'doc1', kt: 'pri' };
      const collectionNames = ['col1'];
      mockGenerateKeyArray.mockReturnValue([{ pk: 'doc1', kt: 'pri' }]); // Key from input

      const expectedDoc = { path: 'col1/doc1FromPriKey' };
      const colRef = { doc: vi.fn().mockReturnValue(expectedDoc) };
      firestoreInstanceForGetRef.collection.mockReturnValue(colRef);

      const result = getReference(pkInput, collectionNames, firestoreInstanceForGetRef);

      expect(mockGenerateKeyArray).toHaveBeenCalledWith(pkInput);
      expect(firestoreInstanceForGetRef.collection).toHaveBeenCalledWith('col1');
      expect(colRef.doc).toHaveBeenCalledWith('doc1');
      // After addReference, collections is empty. collections.length === 1 is false.
      expect(result).toBe(expectedDoc);
    });

    test('should process LocKeyArray and append final collection if collections.length is 1', () => {
      const locKeyArrayInput: LocKey<string>[] = [{ lk: 'intermediateDoc', kt: 'loc' }];
      const collectionNames = ['parentDocCollection', 'finalCollectionSegment'];
      // generateKeyArray output based on locKeyArrayInput
      mockGenerateKeyArray.mockReturnValue([{ lk: 'intermediateDoc', kt: 'loc' }]);
      // isPriKey({lk: 'intermediateDoc', kt: 'loc'}) will be false.

      // Path: addReference processes {lk: 'intermediateDoc'} and 'finalCollectionSegment'
      // firestore.collection('finalCollectionSegment').doc('intermediateDoc') -> returns intermediateDocRef
      // Then, this intermediateDocRef.collection('parentDocCollection') is called.

      const veryFinalCollection = { path: 'finalSegment/intermediateDoc/parentDocCollection' };
      const intermediateDoc = {
        path: 'finalSegment/intermediateDoc',
        collection: vi.fn().mockReturnValue(veryFinalCollection) // This is the key for the last step
      };
      const colRefForAddRef = { doc: vi.fn().mockReturnValue(intermediateDoc) };
      firestoreInstanceForGetRef.collection.mockReturnValue(colRefForAddRef); // For .collection('finalCollectionSegment')

      const result = getReference(locKeyArrayInput as any, collectionNames, firestoreInstanceForGetRef);

      expect(mockGenerateKeyArray).toHaveBeenCalledWith(locKeyArrayInput);
      // Inside addReference:
      expect(firestoreInstanceForGetRef.collection).toHaveBeenCalledWith('finalCollectionSegment');
      expect(colRefForAddRef.doc).toHaveBeenCalledWith('intermediateDoc');
      // Back in getReference, reference = intermediateDoc. collections = ['parentDocCollection']
      expect(intermediateDoc.collection).toHaveBeenCalledWith('parentDocCollection');
      expect(result).toBe(veryFinalCollection);
    });

    test('should use a copy of collectionNames and not mutate the original array', () => {
      const pkInput: PriKey<string> = { pk: 'doc1', kt: 'pri' };
      const originalCollectionNames = ['col1', 'col2']; // col2 will be left in the copy for addRef
      mockGenerateKeyArray.mockReturnValue([{ pk: 'doc1', kt: 'pri' }]);

      const finalCollFromDocRef = { path: 'docRefForCopyTest/col1' };
      const docRef = {
        path: 'docRefForCopyTest',
        collection: vi.fn().mockReturnValue(finalCollFromDocRef)
      };
      const colRef = { doc: vi.fn().mockReturnValue(docRef) };
      firestoreInstanceForGetRef.collection.mockReturnValue(colRef);

      getReference(pkInput, originalCollectionNames, firestoreInstanceForGetRef);

      expect(originalCollectionNames).toEqual(['col1', 'col2']); // Should remain unchanged
    });
  });
});
