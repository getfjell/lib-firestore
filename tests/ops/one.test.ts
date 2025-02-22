/* eslint-disable no-undefined */
import { getOneOperation } from '@/ops/one';
import { Item, ItemQuery, UUID } from '@fjell/core';
import { Definition } from '@/Definition';
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore, Query } from '@google-cloud/firestore';
import { createOperations } from '@/Operations';

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

describe('one', () => {
  type TestItem = Item<'test'>;
  let firestoreMock: jest.Mocked<Firestore>;
  let collectionRefMock: jest.Mocked<CollectionReference>;
  let documentRefMock: jest.Mocked<DocumentReference>;
  let documentSnapshotMock: jest.Mocked<DocumentSnapshot>;
  // let queryMock: jest.Mocked<Query>;

  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;

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

  describe('one', () => {
    test('should return the first item matching the query', async () => {
      const one = getOneOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = { props: { name: { value: 'test', operator: '==' } } } as ItemQuery;

      const mockDocs = [
        { id: '1', data: () => ({ name: 'test1' }) },
        { id: '2', data: () => ({ name: 'test2' }) }
      ] as unknown as DocumentSnapshot[];

      const itemsQueryMock = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValueOnce({ docs: mockDocs } as any),
      } as unknown as jest.Mocked<Query>;

      collectionRefMock.where.mockReturnValue(itemsQueryMock);
      collectionRefMock.limit.mockReturnValue(itemsQueryMock);
      collectionRefMock.offset.mockReturnValue(itemsQueryMock);

      collectionRefMock.get.mockResolvedValueOnce({ docs: mockDocs } as any);

      const result = await one(itemQuery);
      expect(result).toBeDefined();
      expect(result?.name).toBe('test1');
    });

    test('should return null if no items match the query', async () => {
      const one = getOneOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = { props: { name: { value: 'non-existent', operator: '==' } } } as ItemQuery;

      const mockDocs = [] as unknown as DocumentSnapshot[];

      const itemsQueryMock = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValueOnce({ docs: mockDocs } as any),
      } as unknown as jest.Mocked<Query>;

      collectionRefMock.where.mockReturnValue(itemsQueryMock);
      collectionRefMock.limit.mockReturnValue(itemsQueryMock);
      collectionRefMock.offset.mockReturnValue(itemsQueryMock);

      collectionRefMock.get.mockResolvedValueOnce({ docs: mockDocs } as any);

      const result = await one(itemQuery);
      expect(result).toBeNull();
    });

    test('test a query with array-contains-any', async () => {
      const one = getOneOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = { props: { name: { value: ['test1', 'test2'], operator: 'array-contains-any' } } } as ItemQuery;

      const mockDocs = [] as unknown as DocumentSnapshot[];

      const itemsQueryMock = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValueOnce({ docs: mockDocs } as any),
      } as unknown as jest.Mocked<Query>;

      collectionRefMock.where.mockReturnValue(itemsQueryMock);
      collectionRefMock.limit.mockReturnValue(itemsQueryMock);
      collectionRefMock.offset.mockReturnValue(itemsQueryMock);

      collectionRefMock.get.mockResolvedValueOnce({ docs: mockDocs } as any);

      const result = await one(itemQuery);
      expect(result).toBeDefined();
    });

    test('should return the first item matching the query with refs', async () => {
      const one = getOneOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = {
        refs: {
          ref1: { kt: 'test', pk: '1-1-1-1-1' as UUID },
          ref2: { kt: 'container', pk: '2-2-2-2-2' as UUID }
        }
      } as ItemQuery;

      const mockDocs = [
        {
          id: '1',
          data: () => ({
            name: 'test1', refs: {
              ref1: { kt: 'test', pk: '1-1-1-1-1' as UUID },
              ref2: { kt: 'container', pk: '2-2-2-2-2' as UUID }
            }
          })
        },
        {
          id: '2',
          data: () => ({
            name: 'test2', refs: {
              ref1: { kt: 'test', pk: '1-1-1-1-1' as UUID },
              ref2: { kt: 'container', pk: '2-2-2-2-2' as UUID }
            }
          })
        },
      ] as unknown as DocumentSnapshot[];

      const itemsQueryMock = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValueOnce({ docs: mockDocs } as any),
      } as unknown as jest.Mocked<Query>;

      collectionRefMock.where.mockReturnValue(itemsQueryMock);
      collectionRefMock.limit.mockReturnValue(itemsQueryMock);
      collectionRefMock.offset.mockReturnValue(itemsQueryMock);

      collectionRefMock.get.mockResolvedValueOnce({ docs: mockDocs } as any);

      const result = await one(itemQuery);
      expect(result).toBeDefined();
      expect(result?.name).toBe('test1');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref1.kt', '==', 'test');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref1.pk', '==', '1-1-1-1-1');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref2.kt', '==', 'container');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref2.pk', '==', '2-2-2-2-2');
    });

    test('should return the first item matching the query with events', async () => {
      const lib = createOperations<Item<'test'>, 'test'>(firestoreMock, definitionMock);
      const itemQuery = {
        events: {
          created: { start: new Date('2020-01-01'), end: new Date('2021-01-01') },
          updated: { start: new Date('2021-01-01'), end: new Date('2022-01-01') }
        }
      } as ItemQuery;

      const mockDocs = [
        {
          id: '1',
          data: () => ({
            name: 'test1', events: {
              created: { at: new Date('2020-06-01') },
              updated: { at: new Date('2021-06-01') }
            }
          })
        },
        {
          id: '2',
          data: () => ({
            name: 'test2', events: {
              created: { at: new Date('2020-07-01') },
              updated: { at: new Date('2021-07-01') }
            }
          })
        },
      ] as unknown as DocumentSnapshot[];

      const itemsQueryMock = {
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValueOnce({ docs: mockDocs } as any),
      } as unknown as jest.Mocked<Query>;

      collectionRefMock.where.mockReturnValue(itemsQueryMock);
      collectionRefMock.limit.mockReturnValue(itemsQueryMock);
      collectionRefMock.offset.mockReturnValue(itemsQueryMock);

      collectionRefMock.get.mockResolvedValueOnce({ docs: mockDocs } as any);

      const result = await lib.one(itemQuery);
      expect(result).toBeDefined();
      expect(result?.name).toBe('test1');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.created.at', '>=', new Date('2020-01-01'));
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.created.at', '<', new Date('2021-01-01'));
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.updated.at', '>=', new Date('2021-01-01'));
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.updated.at', '<', new Date('2022-01-01'));
    });
  });

});