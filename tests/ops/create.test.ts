/* eslint-disable no-undefined */
import { Definition } from '@/Definition';
import { getCreateOperation } from '@/ops/create';
import { createOperations } from '@/Operations';
import { Item, TypesProperties, UUID } from '@fjell/core';
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore } from '@google-cloud/firestore';
import { wrapOperations } from '@fjell/lib';

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

describe('create', () => {
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
      coordinate: { kta: ['test'] },
      options: {}
    } as unknown as jest.Mocked<Definition<TestItem, 'test'>>;
  });

  describe('create', () => {
    test('should create a new item and return it', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const item = { name: 'testItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        set: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'testItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      const result = await lib.create(item);
      expect(result).toBeDefined();
      expect(result.name).toBe('testItem');
      expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({ name: 'testItem' }));
    });

    test('should call preCreate hook if defined', async () => {
      const preCreateHook = jest.fn().mockResolvedValueOnce({ name: 'hookedItem' });
      definitionMock.options = {
        hooks: {
          preCreate: preCreateHook,
        }
      };

      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);

      const item = { name: 'testItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        set: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'hookedItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      const result = await wrappedOperations.create(item);
      expect(result).toBeDefined();
      expect(result.name).toBe('hookedItem');
      expect(preCreateHook).toHaveBeenCalledWith(item, undefined);
    });

    test('should call postCreate hook if defined', async () => {
      const postCreateHook = jest.fn().mockResolvedValueOnce({ name: 'hookedItem' });
      definitionMock.options = {
        hooks: {
          postCreate: postCreateHook,
        }
      };

      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);

      const item =
        { key: { kt: 'test', pk: '1-1-1-1-1' as UUID }, name: 'testItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        set: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'testItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      const result = await wrappedOperations.create(item);
      expect(result).toBeDefined();
      expect(result.name).toBe('hookedItem');
      expect(postCreateHook).toHaveBeenCalledTimes(1);
    });

    test('should call onCreate validator if defined', async () => {
      const onCreateValidator = jest.fn().mockResolvedValueOnce(false);
      definitionMock.options = {
        validators: {
          onCreate: onCreateValidator,
        }
      };

      const operations = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const wrappedOperations = wrapOperations(operations, definitionMock);

      const item = { name: 'testItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        set: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'testItem' })
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      await expect(() => wrappedOperations
        .create(item))
        .rejects
        .toThrow('Create Validation Failed: {"item":{"name":"testItem"}} - [object Object] - create');
    });

    test('should throw an error if document does not exist after creation', async () => {
      const create = getCreateOperation(firestoreMock, definitionMock);
      const item = { name: 'testItem' } as TypesProperties<Item<'test'>, 'test'>;

      const mockDocRef = {
        set: jest.fn().mockResolvedValueOnce(undefined),
        get: jest.fn().mockResolvedValueOnce({
          exists: false
        } as unknown as DocumentSnapshot)
      } as unknown as jest.Mocked<DocumentReference>;

      collectionRefMock.doc.mockReturnValue(mockDocRef);

      await expect(create(item)).rejects.toThrow('Item not saved');
    });

  });

});