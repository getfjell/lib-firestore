import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { AllItemTypeArrays } from '@fjell/core';
import { DocumentData, DocumentSnapshot, Timestamp } from '@google-cloud/firestore';
import type { OperationContext } from '@fjell/lib';

let mockAddKeyFn: any;
vi.mock('../src/KeyMaster', () => ({
  addKey: vi.fn((...args: any[]) => mockAddKeyFn(...args)),
}));

import { processDoc } from '../src/DocProcessor';

describe('DocProcessor', () => {
  let mockAddKey: Mock;
  let testContext: OperationContext;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Dynamically import createOperationContext after mocks are set up
    const { createOperationContext } = await import('@fjell/lib');
    testContext = createOperationContext();

    // Mock addKey to actually add a key to the item
    mockAddKeyFn = vi.fn((item: any, doc: any, keyTypes: any) => {
      item.key = {
        kt: keyTypes[0],
        pk: doc.id
      };
      if (keyTypes.length > 1) {
        item.key.loc = keyTypes.slice(1).map((kt: string) => ({ kt, lk: 'location-id' }));
      }
    });
    mockAddKey = (await import('../src/KeyMaster')).addKey as Mock;
  });

  describe('processDoc', () => {
    const mockDocSnapshot = (id: string, data: DocumentData | undefined): Partial<DocumentSnapshot> => ({
      data: vi.fn().mockReturnValue(data) as () => DocumentData | undefined,
      id,
      exists: data !== undefined,
      ref: { id, parent: { id: 'mockParentCollection', path: 'mock/path' } } as any,
      createTime: data ? Timestamp.now() : undefined,
      updateTime: data ? Timestamp.now() : undefined,
      readTime: data ? Timestamp.now() : undefined,
    });

    // Comment out all usages of AllItemTypeArrays in the test file
    // const keyTypes: AllItemTypeArrays<string, string> = ['typeA', 'typeB'];
    const keyTypes: AllItemTypeArrays<string, string> = ['typeA', 'typeB'] as const;

    it('should process a document correctly, converting Timestamp to Date', async () => {
      const rawDate = new Date();
      const firestoreTimestamp = Timestamp.fromDate(rawDate);
      const mockData = {
        name: 'Test Item',
        events: {
          created: { at: firestoreTimestamp, by: 'user1' },
        },
      };
      const doc = mockDocSnapshot('doc1', mockData) as DocumentSnapshot;

      const result = await processDoc(doc, keyTypes, [], [], {} as any, testContext);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events?.created?.at).toBeInstanceOf(Date);
      expect((result.events?.created?.at as Date).toISOString()).toEqual(rawDate.toISOString());
      expect(result.name).toBe('Test Item');
    });

    it('should handle documents with no events property', async () => {
      const mockData = { name: 'No Events Item' };
      const doc = mockDocSnapshot('doc2', mockData) as DocumentSnapshot;

      const result = await processDoc(doc, keyTypes, [], [], {} as any, testContext);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events).toBeUndefined();
      expect(result.name).toBe('No Events Item');
    });

    it('should handle events where at is already a Date', async () => {
      const existingDate = new Date();
      const mockData = {
        name: 'PreExisting Date Item',
        events: {
          updated: { at: existingDate, by: 'user2' },
        },
      };
      const doc = mockDocSnapshot('doc3', mockData) as DocumentSnapshot;

      const result = await processDoc(doc, keyTypes, [], [], {} as any, testContext);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.updated?.at).toEqual(existingDate);
    });

    it('should handle events where at is undefined', async () => {
      const mockData = {
        name: 'Undefined At Item',
        events: {

          deleted: { by: 'user3' } as any,
        },
      };
      const doc = mockDocSnapshot('doc4', mockData) as DocumentSnapshot;

      const result = await processDoc(doc, keyTypes, [], [], {} as any, testContext);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events?.deleted?.at).toBeUndefined();
    });

    it('should handle events object being present but empty', async () => {
      const mockData = {
        name: 'Empty Events Object',
        events: {},
      };
      const doc = mockDocSnapshot('doc5', mockData) as DocumentSnapshot;

      const result = await processDoc(doc, keyTypes, [], [], {} as any);
      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events).toEqual({});
    });

    it('should throw error when document data is undefined', async () => {
      const doc = mockDocSnapshot('doc6', undefined) as DocumentSnapshot;

      await expect(
        processDoc(doc, keyTypes, [], [], {} as any, testContext)
      ).rejects.toThrow("Document data for doc.id='doc6' is undefined.");
    });

    it('should process references when referenceDefinitions are provided', async () => {
      const mockData = {
        name: 'Item with References',
        refs: {
          author: { kt: 'author', pk: 'author123' }
        }
      };
      const doc = mockDocSnapshot('doc7', mockData) as DocumentSnapshot;

      const mockLibrary = {
        operations: {
          get: vi.fn().mockResolvedValue({
            key: { kt: 'author', pk: 'author123' },
            name: 'John Doe'
          })
        }
      };

      const mockRegistry = {
        get: vi.fn().mockReturnValue(mockLibrary)
      };

      const referenceDefinitions = [
        {
          name: 'author',
          kta: ['author']
        }
      ];

      const result = await processDoc(
        doc,
        keyTypes,
        referenceDefinitions,
        [],
        mockRegistry as any,
        testContext
      );

      expect(mockAddKey).toHaveBeenCalled();
      expect(result.name).toBe('Item with References');
      expect(result.refs?.author).toBeDefined();
      // With flattened structure, item properties are directly on the reference
      expect(result.refs?.author.name).toBe('John Doe');
      expect(result.refs?.author.key).toBeDefined();
    });

    it('should process aggregations when aggregationDefinitions are provided', async () => {
      const mockData = {
        name: 'Item with Aggregations',
      };
      const doc = mockDocSnapshot('doc8', mockData) as DocumentSnapshot;

      const mockLibrary = {
        operations: {
          all: vi.fn().mockResolvedValue([
            { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' },
            { key: { kt: 'comment', pk: 'c2' }, text: 'Comment 2' }
          ])
        }
      };

      const mockRegistry = {
        get: vi.fn().mockReturnValue(mockLibrary)
      };

      const aggregationDefinitions = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many' as const
        }
      ];

      const result = await processDoc(
        doc,
        keyTypes,
        [],
        aggregationDefinitions,
        mockRegistry as any,
        testContext
      );

      expect(mockAddKey).toHaveBeenCalled();
      expect(result.name).toBe('Item with Aggregations');
      expect(result.aggs?.comments).toBeDefined();
      expect(Array.isArray(result.aggs?.comments)).toBe(true);
      // Aggregations should be removed from direct properties
      expect(result.comments).toBeUndefined();
    });

    it('should process both references and aggregations when both are provided', async () => {
      const mockData = {
        name: 'Item with Both',
        refs: {
          author: { kt: 'author', pk: 'author123' }
        }
      };
      const doc = mockDocSnapshot('doc9', mockData) as DocumentSnapshot;

      const mockLibrary = {
        operations: {
          get: vi.fn().mockResolvedValue({
            key: { kt: 'author', pk: 'author123' },
            name: 'John Doe'
          }),
          all: vi.fn().mockResolvedValue([
            { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' }
          ])
        }
      };

      const mockRegistry = {
        get: vi.fn().mockReturnValue(mockLibrary)
      };

      const referenceDefinitions = [
        {
          name: 'author',
          kta: ['author']
        }
      ];

      const aggregationDefinitions = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many' as const
        }
      ];

      const result = await processDoc(
        doc,
        keyTypes,
        referenceDefinitions,
        aggregationDefinitions,
        mockRegistry as any,
        testContext
      );

      expect(mockAddKey).toHaveBeenCalled();
      expect(result.name).toBe('Item with Both');
      expect(result.refs?.author).toBeDefined();
      // With flattened structure, item properties are directly on the reference
      expect(result.refs?.author.name).toBe('John Doe');
      expect(result.refs?.author.key).toBeDefined();
      expect(result.aggs?.comments).toBeDefined();
      // Aggregations should be removed from direct properties
      expect(result.comments).toBeUndefined();
    });
  });
});
