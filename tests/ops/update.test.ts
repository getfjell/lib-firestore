/* eslint-disable no-undefined */
import { Definition } from '@/Definition';
import { createOperations } from '@/Operations';
import { Item, PriKey, TypesProperties } from '@fjell/core';
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

describe('update', () => {
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
        scopes: []
      },
      options: {}
    } as unknown as jest.Mocked<Definition<TestItem, 'test'>>;
  });

  describe('update', () => {

    test('should throw an error when updating with an invalid key', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const invalidKey = { kt: 'invalid', pk: 'null' } as unknown as PriKey<'test'>;
      const item = { name: 'updatedItem' } as TypesProperties<Item<'test'>, 'test'>;

      await expect(lib.update(invalidKey, item)).rejects.toThrow('Key for Update is not a valid ItemKey');
    });
    
    test('should call preUpdate hook if defined', async () => {
      const preUpdateHook = jest.fn().mockResolvedValueOnce({ name: 'hookedItem' });
      definitionMock.options.hooks = { preUpdate: preUpdateHook };
      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);

      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;
      const item = { name: 'updatedItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        update: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'hookedItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      mockDocRef.set = jest.fn().mockResolvedValueOnce(undefined);
      mockDocRef.get = jest.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'hookedItem' })
      } as unknown as DocumentSnapshot);

      const result = await wrappedOperations.update(key, item);
      expect(result).toBeDefined();
      expect(result.name).toBe('hookedItem');
      expect(preUpdateHook).toHaveBeenCalledWith(key, item);
    });

    test('should call postUpdate hook if defined', async () => {
      const postUpdateHook = jest.fn().mockResolvedValueOnce({ name: 'hookedItem' });
      definitionMock.options.hooks = { postUpdate: postUpdateHook };
      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);
      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;
      const item = { name: 'updatedItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        update: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'hookedItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      mockDocRef.set = jest.fn().mockResolvedValueOnce(undefined);
      mockDocRef.get = jest.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'hookedItem' })
      } as unknown as DocumentSnapshot);

      const result = await wrappedOperations.update(key, item);
      expect(result).toBeDefined();
      expect(result.name).toBe('hookedItem');
      expect(postUpdateHook).toHaveBeenCalledTimes(1);
    });

    test('should call onUpdate validator if defined', async () => {
      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;
      const item = { name: 'updatedItem' } as TypesProperties<Item<'test'>, 'test'>;
      const onUpdateValidator = jest.fn().mockResolvedValueOnce(item);
      definitionMock.options.validators = { onUpdate: onUpdateValidator };
      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);

      const mockDocRef = {
        update: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'updatedItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      mockDocRef.set = jest.fn().mockResolvedValueOnce(undefined);
      mockDocRef.get = jest.fn().mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'updatedItem' })
      } as unknown as DocumentSnapshot);

      const result = await wrappedOperations.update(key, item);
      expect(result).toBeDefined();
      expect(result.name).toBe('updatedItem');
      expect(onUpdateValidator).toHaveBeenCalledWith(key, item);
    });

    test('should throw an error if document does not exist after update', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const key = { kt: 'test', pk: '1-1-1-1-1' } as PriKey<'test'>;
      const item = { name: 'updatedItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        update: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: false
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      mockDocRef.set = jest.fn().mockResolvedValueOnce(undefined);

      await expect(lib.update(key, item)).rejects.toThrow('Item not updated');

    });
  });

});