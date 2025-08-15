import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest';
import { getOneOperation } from '../../../src/contained/ops/one';
import { getAllOperation } from '../../../src/contained/ops/all';
import { Definition } from '../../../src/Definition';
import { Item, ItemQuery } from '@fjell/core';
import { Registry } from '@fjell/lib';

// Mock dependencies
vi.mock('../../../src/contained/ops/all', () => ({
  getAllOperation: vi.fn(),
}));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  default: vi.fn(),
}));

vi.mock('../../../src/logger', () => ({
  get: vi.fn(() => mockLogger),
  __esModule: true,
  default: { get: vi.fn(() => mockLogger) }
}));

const mockGetAllOperation = vi.mocked(getAllOperation);

interface TestItem extends Item<'test'> {
  name: string;
  value: number;
}

describe('contained/ops/one', () => {
  let mockFirestore: FirebaseFirestore.Firestore;
  let mockDefinition: Definition<TestItem, 'test'>;
  let mockRegistry: Registry;
  let mockAllFunction: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFirestore = {} as FirebaseFirestore.Firestore;

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

    mockAllFunction = vi.fn();
    mockGetAllOperation.mockReturnValue(mockAllFunction);
  });

  describe('getOneOperation', () => {
    it('should create and return a one function', () => {
      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);

      expect(typeof oneOperation).toBe('function');
      // Verify that the logger.default was called during creation
      expect(mockLogger.default).toHaveBeenCalledWith('One', expect.objectContaining({ one: expect.any(Function) }));
    });

    it('should return first item when getAllOperation returns items', async () => {
      const testItems: TestItem[] = [
        { name: 'test1', value: 1 } as TestItem,
        { name: 'test2', value: 2 } as TestItem,
        { name: 'test3', value: 3 } as TestItem,
      ];

      mockAllFunction.mockResolvedValue(testItems);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);
      const itemQuery: ItemQuery = { limit: 1 };

      const result = await oneOperation(itemQuery, []);

      expect(mockAllFunction).toHaveBeenCalledWith(itemQuery, []);
      expect(result).toBe(testItems[0]);
      expect(result).toEqual({ name: 'test1', value: 1 });
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery, locations: [] });
    });

    it('should return null when getAllOperation returns empty array', async () => {
      mockAllFunction.mockResolvedValue([]);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);
      const itemQuery: ItemQuery = {};

      const result = await oneOperation(itemQuery, []);

      expect(mockAllFunction).toHaveBeenCalledWith(itemQuery, []);
      expect(result).toBeNull();
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery, locations: [] });
    });

    it('should pass through complex item queries to getAllOperation', async () => {
      const testItems: TestItem[] = [{ name: 'found', value: 42 } as TestItem];
      mockAllFunction.mockResolvedValue(testItems);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);
      const complexItemQuery: ItemQuery = {
        refs: {
          parent: { pk: 'parent-id', kt: 'parent' }
        },
        events: {
          created: { start: new Date('2023-01-01') }
        },
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            { column: 'active', operator: '==', value: true }
          ]
        },
        limit: 1
      };

      const result = await oneOperation(complexItemQuery, []);

      expect(mockAllFunction).toHaveBeenCalledWith(complexItemQuery, []);
      expect(result).toBe(testItems[0]);
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery: complexItemQuery, locations: [] });
    });

    it('should handle default empty location array', async () => {
      const testItems: TestItem[] = [{ name: 'default-location', value: 789 } as TestItem];
      mockAllFunction.mockResolvedValue(testItems);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);

      // Call with only itemQuery, locations should default to []
      const result = await oneOperation({});

      expect(mockAllFunction).toHaveBeenCalledWith({}, []);
      expect(result).toBe(testItems[0]);
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery: {}, locations: [] });
    });

    it('should propagate errors from getAllOperation', async () => {
      const queryError = new Error('All operation failed');
      mockAllFunction.mockRejectedValue(queryError);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);

      await expect(oneOperation({}, [])).rejects.toThrow('All operation failed');
      expect(mockAllFunction).toHaveBeenCalledWith({}, []);
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery: {}, locations: [] });
    });

    it('should return first item even when many items are returned', async () => {
      // Create a large array of test items
      const manyItems: TestItem[] = Array.from({ length: 100 }, (_, i) => ({
        name: `test${i}`,
        value: i
      } as TestItem));

      mockAllFunction.mockResolvedValue(manyItems);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);
      const result = await oneOperation({}, []);

      expect(result).toBe(manyItems[0]);
      expect(result).toEqual({ name: 'test0', value: 0 });
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery: {}, locations: [] });
    });

    it('should handle different item types correctly', async () => {
      // Test with a different item type structure
      const customItems = [
        { customField: 'value1', data: { nested: true } } as any,
        { customField: 'value2', data: { nested: false } } as any
      ];

      mockAllFunction.mockResolvedValue(customItems);

      const oneOperation = getOneOperation(mockFirestore, mockDefinition, mockRegistry);
      const result = await oneOperation({}, []);

      expect(result).toBe(customItems[0]);
      expect(result).toEqual({ customField: 'value1', data: { nested: true } });
      // Verify that the logger.default was called with the operation details
      expect(mockLogger.default).toHaveBeenCalledWith('One', { itemQuery: {}, locations: [] });
    });
  });
});
