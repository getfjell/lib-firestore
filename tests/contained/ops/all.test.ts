import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllOperation } from '@/contained/ops/all';
import { Definition } from '@/Definition';
import { Item, ItemQuery, validateKeys } from '@fjell/core';
import { CollectionGroup, CollectionReference, Query } from '@google-cloud/firestore';
import { buildQuery } from '@/QueryBuilder';
import { processDoc } from '@/DocProcessor';
import { getReference } from '@/ReferenceFinder';
import { Registry } from '@fjell/lib';

// Mock dependencies
vi.mock('@/QueryBuilder', () => ({
  buildQuery: vi.fn(),
}));

vi.mock('@/DocProcessor', () => ({
  processDoc: vi.fn(),
}));

vi.mock('@/ReferenceFinder', () => ({
  getReference: vi.fn(),
}));

vi.mock('@fjell/core', async () => {
  const actual = await vi.importActual('@fjell/core');
  return {
    ...actual,
    validateKeys: vi.fn((item) => item),
  };
});

vi.mock('@/logger', () => ({
  get: vi.fn(() => ({
    debug: vi.fn(),
    default: vi.fn(),
  })),
  __esModule: true,
  default: { get: vi.fn(() => ({ debug: vi.fn(), default: vi.fn() })) }
}));

const mockBuildQuery = vi.mocked(buildQuery);
const mockProcessDoc = vi.mocked(processDoc);
const mockGetReference = vi.mocked(getReference);
const mockValidateKeys = vi.mocked(validateKeys);

interface TestItem extends Item<'test'> {
  name: string;
  value: number;
}

describe('contained/ops/all', () => {
  let mockFirestore: FirebaseFirestore.Firestore;
  let mockDefinition: Definition<TestItem, 'test'>;
  let mockRegistry: Registry;
  let mockCollectionRef: CollectionReference;
  let mockCollectionGroup: CollectionGroup;
  let mockQuery: Query;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFirestore = {
      collectionGroup: vi.fn(),
    } as unknown as FirebaseFirestore.Firestore;

    mockDefinition = {
      coordinate: {
        kta: ['test'],
        scopes: ['firestore'],
        toString: () => 'test-coordinate'
      },
      options: {
        hooks: {},
        validators: {},
        finders: {},
        actions: {},
        facets: {},
      },
      collectionNames: ['testCollection'],
    } as Definition<TestItem, 'test'>;

    mockRegistry = {
      type: 'lib',
      get: vi.fn(),
      register: vi.fn(),
      createInstance: vi.fn(),
      instanceTree: vi.fn(),
    } as unknown as Registry;

    const mockQuerySnapshot = {
      docs: [
        { id: 'doc1', data: () => ({ name: 'test1', value: 1 }) },
        { id: 'doc2', data: () => ({ name: 'test2', value: 2 }) }
      ]
    };

    mockQuery = {
      get: vi.fn().mockResolvedValue(mockQuerySnapshot),
    } as unknown as Query;

    mockCollectionRef = mockQuery as unknown as CollectionReference;
    mockCollectionGroup = mockQuery as unknown as CollectionGroup;

    (mockFirestore.collectionGroup as any).mockReturnValue(mockCollectionGroup);
    mockGetReference.mockReturnValue(mockCollectionRef);
    mockBuildQuery.mockReturnValue(mockQuery);
    mockProcessDoc.mockImplementation((doc, kta) => ({
      id: doc.id,
      ...doc.data(),
      kta
    } as any));
    mockValidateKeys.mockImplementation((item) => item as TestItem);
  });

  describe('getAllOperation', () => {
    it('should create and return an all function', () => {
      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);

      expect(typeof allOperation).toBe('function');
    });

    it('should query collection group when no location is provided', async () => {
      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);
      const itemQuery: ItemQuery = { limit: 10 };

      const result = await allOperation(itemQuery, []);

      expect(mockFirestore.collectionGroup).toHaveBeenCalledWith('testCollection');
      expect(mockBuildQuery).toHaveBeenCalledWith(itemQuery, mockCollectionGroup);
      expect(mockQuery.get).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should query specific collection when location is provided', async () => {
      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);
      const itemQuery: ItemQuery = { limit: 5 };
      const location = [{ lk: 'location1', kt: 'level1' }];

      const result = await allOperation(itemQuery, location as any);

      expect(mockGetReference).toHaveBeenCalledWith(location, ['testCollection'], mockFirestore);
      expect(mockBuildQuery).toHaveBeenCalledWith(itemQuery, mockCollectionRef);
      expect(mockQuery.get).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should process documents correctly', async () => {
      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);
      const itemQuery: ItemQuery = {};

      const result = await allOperation(itemQuery, []);

      expect(result).toHaveLength(2);
      expect(mockProcessDoc).toHaveBeenCalledTimes(2);
      expect(mockProcessDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'doc1' }),
        ['test']
      );
      expect(mockProcessDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'doc2' }),
        ['test']
      );
      expect(mockValidateKeys).toHaveBeenCalledTimes(2);
    });

    it('should handle complex item queries', async () => {
      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);
      const itemQuery: ItemQuery = {
        refs: {
          parent: { pk: 'parent-id', kt: 'parent' }
        },
        events: {
          created: { start: new Date('2023-01-01') }
        },
        limit: 20,
        offset: 10
      };

      await allOperation(itemQuery, []);

      expect(mockBuildQuery).toHaveBeenCalledWith(itemQuery, mockCollectionGroup);
    });

    it('should handle multi-level locations', async () => {
      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);
      const location = [
        { lk: 'location1', kt: 'level1' },
        { lk: 'location2', kt: 'level2' }
      ];

      await allOperation({}, location as any);

      expect(mockGetReference).toHaveBeenCalledWith(location, ['testCollection'], mockFirestore);
      expect(mockBuildQuery).toHaveBeenCalledWith({}, mockCollectionRef);
    });

    it('should return empty array when no documents found', async () => {
      const emptyQuerySnapshot = { docs: [] };
      mockQuery.get = vi.fn().mockResolvedValue(emptyQuerySnapshot);

      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);
      const result = await allOperation({}, []);

      expect(result).toEqual([]);
      expect(mockProcessDoc).not.toHaveBeenCalled();
      expect(mockValidateKeys).not.toHaveBeenCalled();
    });

    it('should handle errors from query execution', async () => {
      const queryError = new Error('Query failed');
      mockQuery.get = vi.fn().mockRejectedValue(queryError);

      const allOperation = getAllOperation(mockFirestore, mockDefinition, mockRegistry);

      await expect(allOperation({}, [])).rejects.toThrow('Query failed');
    });

    it('should use correct collection name from definition', async () => {
      const customDefinition = {
        ...mockDefinition,
        collectionNames: ['customCollection']
      };

      const allOperation = getAllOperation(mockFirestore, customDefinition, mockRegistry);
      await allOperation({}, []);

      expect(mockFirestore.collectionGroup).toHaveBeenCalledWith('customCollection');
    });

    it('should pass kta from coordinate to processDoc', async () => {
      const customDefinition = {
        ...mockDefinition,
        coordinate: {
          kta: ['customType', 'level1'],
          scopes: ['firestore'],
          toString: () => 'custom-coordinate'
        }
      } as any;

      const allOperation = getAllOperation(mockFirestore, customDefinition, mockRegistry);
      await allOperation({}, []);

      expect(mockProcessDoc).toHaveBeenCalledWith(
        expect.any(Object),
        ['customType', 'level1']
      );
    });
  });
});
