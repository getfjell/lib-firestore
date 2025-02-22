/* eslint-disable no-undefined */
import { Definition } from '@/Definition';
import { createOperations } from '@/Operations';
import { Item, PriKey } from '@fjell/core';
import { wrapOperations } from '@fjell/lib';
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

describe('remove', () => {
  type TestItem = Item<'test'>;
  let firestoreMock: jest.Mocked<Firestore>;
  let collectionRefMock: jest.Mocked<CollectionReference>;
  let documentRefMock: jest.Mocked<DocumentReference>;
  let documentSnapshotMock: jest.Mocked<DocumentSnapshot>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;
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

    definitionMock = {
      collectionNames: ['tests'],
      coordinate: {
        kta: ['test'],
        scopes: [],
      },
      options: {}
    } as unknown as jest.Mocked<Definition<TestItem, 'test'>>;
  });

  describe('remove', () => {
    test('should remove the item matching the key', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;

      const mockDoc = {
        exists: true,
        data: () => ({ name: 'testItem' })
      } as unknown as DocumentSnapshot;

      const mockDocRef = {
        delete: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce(mockDoc),
        set: jest.fn().mockResolvedValueOnce(mockDoc)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      const result = await lib.remove(key);
      expect(result).toBeDefined();
      expect(result.name).toBe('testItem');
      expect(mockDocRef.set).toHaveBeenCalledTimes(1);
    });

    test('should throw an error if key is invalid', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const invalidKey = { kt: 'test', pk: 'null' } as unknown as PriKey<'test'>;

      await expect(lib.remove(invalidKey)).rejects.toThrow('Key for Remove is not a valid ItemKey');
      expect(collectionRefMock.doc).not.toHaveBeenCalled();
    });

    test('should throw an error if document does not exist', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const key = { kt: 'test', pk: 'non-existent' } as unknown as PriKey<'test'>;

      const mockDoc = {
        exists: false
      } as unknown as DocumentSnapshot;

      const mockDocRef = {
        delete: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce(mockDoc),
        set: jest.fn().mockResolvedValueOnce(mockDoc)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      await expect(
        lib.remove(key))
        .rejects
        .toThrow('Item not updated for key {\"kt\":\"test\",\"pk\":\"non-existent\"} - [object Object] - update');
      expect(mockDocRef.set).toHaveBeenCalled();
      expect(mockDocRef.get).toHaveBeenCalled();
    });

    test('should call preRemove hook if defined', async () => {
      const preRemoveHook = jest.fn().mockResolvedValueOnce(undefined);
      definitionMock.options.hooks = { preRemove: preRemoveHook };
      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);
      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;

      const mockDoc = {
        exists: true,
        data: () => ({ name: 'testItem' })
      } as unknown as DocumentSnapshot;

      const mockDocRef = {
        delete: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce(mockDoc),
        set: jest.fn().mockResolvedValueOnce(mockDoc)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      const result = await wrappedOperations.remove(key);
      expect(result).toBeDefined();
      expect(result.name).toBe('testItem');
      expect(preRemoveHook).toHaveBeenCalledWith(key);
      expect(mockDocRef.set).toHaveBeenCalledTimes(1);
      expect(mockDocRef.get).toHaveBeenCalledTimes(1);
    });

    test('should call postRemove hook if defined', async () => {
      const postRemoveHook = jest.fn().mockResolvedValueOnce({ name: 'testItem' });
      definitionMock.options.hooks = { postRemove: postRemoveHook };
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;

      const mockDoc = {
        exists: true,
        data: () => ({ name: 'testItem' })
      } as unknown as DocumentSnapshot;

      const mockDocRef = {
        delete: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce(mockDoc),
        set: jest.fn().mockResolvedValueOnce(mockDoc)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      const result = await lib.remove(key);
      expect(result).toBeDefined();
      expect(result.name).toBe('testItem');
      expect(postRemoveHook).toHaveBeenCalledTimes(1);
      expect(mockDocRef.set).toHaveBeenCalledTimes(1);
      expect(mockDocRef.get).toHaveBeenCalledTimes(1);
    });

    test('should call onRemove validator if defined', async () => {
      const onRemoveValidator = jest.fn().mockResolvedValueOnce(false);
      definitionMock.options.validators = { onRemove: onRemoveValidator };
      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);

      const wrappedOperations = wrapOperations(operations, definitionMock);

      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;

      const mockDoc = {
        exists: true,
        data: () => ({ name: 'testItem' })
      } as unknown as DocumentSnapshot;

      const mockDocRef = {
        delete: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce(mockDoc),
        set: jest.fn().mockResolvedValueOnce(mockDoc)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      expect(() => wrappedOperations.remove(key))
        .rejects.toThrow('Remove Validation Failed: {"key":{"kt":"test","pk":"1-1-1-1-1"}} - [object Object] - remove');
    });

  });

});