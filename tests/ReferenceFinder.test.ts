/* eslint-disable no-undefined */
import { addReference, getReference } from '@/ReferenceFinder';
import { LocKey, PriKey } from '@fjell/core';
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore } from '@google-cloud/firestore';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});
jest.mock('@google-cloud/firestore');

describe('ReferenceFinder', () => {
  let firestoreMock: jest.Mocked<Firestore>;
  let collectionRefMock: jest.Mocked<CollectionReference>;
  let documentRefMock: jest.Mocked<DocumentReference>;
  let documentSnapshotMock: jest.Mocked<DocumentSnapshot>;
  // let queryMock: jest.Mocked<Query>;

  beforeEach(() => {
    firestoreMock = new (Firestore as any)();
    collectionRefMock = new (CollectionReference as any)();
    documentRefMock = new (DocumentReference as any)();
    documentSnapshotMock = new (DocumentSnapshot as any)();
    // queryMock = new (Query as any)();

    firestoreMock.collection.mockReturnValue(collectionRefMock);
    collectionRefMock.doc.mockReturnValue(documentRefMock);
    documentRefMock.get.mockResolvedValue(documentSnapshotMock);
    // @ts-ignore
    documentSnapshotMock.exists = true;
    documentSnapshotMock.data.mockReturnValue({});
  });

  describe('getReference', () => {
    test('should return firestore instance when no key is provided', () => {
      const result = getReference([], ['tests'], firestoreMock);
      expect(result).toBe(collectionRefMock);
    });

    test('should return collection reference when a lockey is provided', () => {
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);
      const result = getReference([{ kt: 'container', lk: '1-1-1-1-1' }], ['tests', 'containners'], firestoreMock);
      expect(result).toBe(collectionRefMock);
    });

    test('should return document reference when a primary key is provided', () => {
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);

      const result = getReference({
        kt: 'test', pk: '2-2-3-2-2',
        loc: [{ kt: 'container', lk: '1-1-1-1-1' }]
      }, ['tests', 'containers'], firestoreMock);
      expect(result).toBe(documentRefMock);
    });

    test('should return nested collection reference when multiple loc keys are provided', () => {
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);

      const result = getReference([
        { kt: 'container', lk: '1-1-1-1-1' },
        { kt: 'subcontainer', lk: '2-2-2-2-2' }
      ], ['tests', 'containers', 'subcontainers'], firestoreMock);
      expect(result).toBe(collectionRefMock);
    });

    test('testing for an error that is happening in production', () => {
      const key = { kt: 'shopifyCustomer', pk: 7432708292661 } as unknown as PriKey<'shopifyCustomer'>;
      const collectionNames = ['shopifyCustomers'];

      const result = getReference(key, collectionNames, firestoreMock);
      expect(firestoreMock.collection).toHaveBeenCalledWith('shopifyCustomers');
      expect(collectionRefMock.doc).toHaveBeenCalledWith(key.pk.toString());
      expect(result).toBe(documentRefMock);
    });
  });

  describe('addReference', () => {

    test('should return base reference when addReference runs out of keys', () => {
      const baseRef = firestoreMock;
      const keys: Array<any> = [];
      const collections: string[] = ['tests'];

      const result = addReference(baseRef, keys, collections);
      expect(result).toBe(baseRef);
    });

    test('should add reference correctly when keys are provided', () => {
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);

      const baseRef = firestoreMock;
      const keys = [{ kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>];
      const collections: string[] = ['tests'];

      const result = addReference(baseRef, keys, collections);
      expect(result).toBe(documentRefMock);
    });

    test('should add nested references correctly when multiple keys are provided', () => {
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);
      collectionRefMock.doc.mockReturnValueOnce(documentRefMock);
      documentRefMock.collection.mockReturnValueOnce(collectionRefMock);

      const baseRef = firestoreMock;
      const keys = [
        { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>,
        { kt: 'subtest', lk: '2-2-2-2-2' } as LocKey<'subtest'>
      ];
      const collections: string[] = ['tests', 'subtests'];

      const result = addReference(baseRef, keys, collections);
      expect(result).toBe(documentRefMock);
    });

    test('should throw an error when addReference runs out of keys', () => {
      const baseRef = firestoreMock;
      const keys: Array<any> = [
        { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>,
        { kt: 'subtest', lk: '2-2-2-2-2' } as LocKey<'subtest'>
      ];
      const collections: string[] = ['tests'];

      expect(() => addReference(baseRef, keys, collections))
        .toThrowError('addReference should never run out of keys or collections');
    });

    // Add more tests for getReference method

    // Add more tests for getReference method
  });

});