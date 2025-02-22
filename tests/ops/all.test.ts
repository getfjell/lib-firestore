import { Definition } from '@/Definition';
import { getAllOperation } from '@/ops/all';
import { Item, ItemQuery, UUID } from '@fjell/core';
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore, Query } from '@google-cloud/firestore';

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

describe('all', () => {
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
    definitionMock = {
      collectionNames: ['tests'],
      coordinate: {
        kta: ['test']
      }
    } as any;
    // queryMock = new (Query as any)();

    firestoreMock.collection.mockReturnValue(collectionRefMock);
    collectionRefMock.doc.mockReturnValue(documentRefMock);
    documentRefMock.get.mockResolvedValue(documentSnapshotMock);
    // @ts-ignore
    documentSnapshotMock.exists = true;
    documentSnapshotMock.data.mockReturnValue({});
  });

  describe('all', () => {
    test('should return an array of items matching the query', async () => {
      const itemQuery = { props: { name: { value: 'Test', operator: '==' } } } as ItemQuery;

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

      const all = getAllOperation<TestItem, 'test'>(firestoreMock, definitionMock);

      const result = await all(itemQuery);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
    });

    test('should return an array of items matching the query with refs', async () => {
      const all = getAllOperation<TestItem, 'test'>(firestoreMock, definitionMock);
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

      const result = await all(itemQuery);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref1.kt', '==', 'test');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref1.pk', '==', '1-1-1-1-1');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref2.kt', '==', 'container');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('refs.ref2.pk', '==', '2-2-2-2-2');
    });

    test('should return an array of items matching the query with events', async () => {
      const all = getAllOperation<TestItem, 'test'>(firestoreMock, definitionMock);
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

      const result = await all(itemQuery);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.created.at', '>=', new Date('2020-01-01'));
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.created.at', '<', new Date('2021-01-01'));
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.updated.at', '>=', new Date('2021-01-01'));
      expect(itemsQueryMock.where).toHaveBeenCalledWith('events.updated.at', '<', new Date('2022-01-01'));
    });

    test('should apply limit to the query', async () => {
      const all = getAllOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = { limit: 10 } as ItemQuery;

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

      const result = await all(itemQuery);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
      expect(itemsQueryMock.limit).toHaveBeenCalledWith(10);
    });

    test('should apply offset to the query', async () => {
      const all = getAllOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = { offset: 5 } as ItemQuery;

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

      const result = await all(itemQuery);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
      expect(itemsQueryMock.offset).toHaveBeenCalledWith(5);
    });

    test('direct to method should apply both limit and offset to the query', async () => {
      const all = getAllOperation<TestItem, 'test'>(firestoreMock, definitionMock);
      const itemQuery = { limit: 10, offset: 5 } as ItemQuery;
  
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
  
      const result = await all(itemQuery);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test1');
      expect(result[1].name).toBe('test2');
      expect(itemsQueryMock.limit).toHaveBeenCalledWith(10);
      expect(itemsQueryMock.offset).toHaveBeenCalledWith(5);
    });

  });
});