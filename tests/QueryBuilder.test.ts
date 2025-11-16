import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildQuery } from '../src/QueryBuilder';
import { CompoundCondition, Condition, ItemQuery } from '@fjell/core';
import { CollectionGroup, CollectionReference, Query } from '@google-cloud/firestore';

// Mock the logger
vi.mock('../src/logger', () => ({
  get: vi.fn(() => ({
    debug: vi.fn(),
    default: vi.fn(),
  })),
  __esModule: true,
  default: { get: vi.fn(() => ({ debug: vi.fn(), default: vi.fn() })) }
}));

describe('QueryBuilder', () => {
  let mockQuery: Query;
  let mockCollectionRef: CollectionReference;
  let mockCollectionGroup: CollectionGroup;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock query that chains properly
    mockQuery = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
    } as unknown as Query;

    mockCollectionRef = mockQuery as unknown as CollectionReference;
    mockCollectionGroup = mockQuery as unknown as CollectionGroup;
  });

  describe('buildQuery', () => {
    it('should build a basic query with delete filter', () => {
      const itemQuery: ItemQuery = {};

      const result = buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(result).toBe(mockQuery);
    });

    it('should add reference queries for ComKey references', () => {
      const itemQuery: ItemQuery = {
        refs: {
          testRef: {
            pk: 'test-pk',
            kt: 'test-kt',
            loc: [
              { lk: 'loc1', kt: 'loc-kt1' },
              { lk: 'loc2', kt: 'loc-kt2' },
              { lk: 'loc3', kt: 'loc-kt3' },
              { lk: 'loc4', kt: 'loc-kt4' },
              { lk: 'loc5', kt: 'loc-kt5' }
            ]
          }
        }
      };

      buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.pk', '==', 'test-pk');
      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.kt', '==', 'test-kt');
      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.loc.0.lk', '==', 'loc1');
      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.loc.0.kt', '==', 'loc-kt1');
      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.loc.1.lk', '==', 'loc2');
    });

    it('should add reference queries for PriKey references', () => {
      const itemQuery: ItemQuery = {
        refs: {
          testRef: {
            pk: 'test-pk',
            kt: 'test-kt'
          }
        }
      };

      buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.pk', '==', 'test-pk');
      expect(mockQuery.where).toHaveBeenCalledWith('refs.testRef.key.kt', '==', 'test-kt');
    });

    it('should add event queries with start, end, and by filters', () => {
      const startDate = new Date('2023-01-01T00:00:00.000Z');
      const endDate = new Date('2023-12-31T23:59:59.999Z');
      const updateDate = new Date('2023-06-01T00:00:00.000Z');

      const itemQuery: ItemQuery = {
        events: {
          created: {
            start: startDate,
            end: endDate,
            by: 'user123'
          },
          updated: {
            start: updateDate
          }
        }
      };

      buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.where).toHaveBeenCalledWith('events.created.at', '>=', new Date(startDate));
      expect(mockQuery.where).toHaveBeenCalledWith('events.created.at', '<', new Date(endDate));
      expect(mockQuery.where).toHaveBeenCalledWith('events.created.by.pk', '==', 'user123');
      expect(mockQuery.where).toHaveBeenCalledWith('events.updated.at', '>=', new Date(updateDate));
    });

    it('should add compound conditions with AND logic', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          { column: 'name', operator: '==', value: 'test' } as Condition,
          { column: 'age', operator: '>', value: 18 } as Condition
        ]
      };

      const itemQuery: ItemQuery = {
        compoundCondition
      };

      buildQuery(itemQuery, mockCollectionRef);

      // Verify mockQuery.where was called with individual conditions for AND logic
      expect(mockQuery.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(mockQuery.where).toHaveBeenCalledWith('name', '==', 'test');
      expect(mockQuery.where).toHaveBeenCalledWith('age', '>', 18);
    });

    it('should add compound conditions with OR logic', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'OR',
        conditions: [
          { column: 'status', operator: '==', value: 'active' } as Condition,
          { column: 'status', operator: '==', value: 'pending' } as Condition
        ]
      };

      const itemQuery: ItemQuery = {
        compoundCondition
      };

      // OR conditions should throw an error in Firestore v7
      expect(() => {
        buildQuery(itemQuery, mockCollectionRef);
      }).toThrow('OR conditions require Firestore SDK v10+ or composite indexes. Consider upgrading @google-cloud/firestore to v10.1.0 or higher.');
    });

    it('should add nested compound conditions', () => {
      const nestedCondition: CompoundCondition = {
        compoundType: 'OR',
        conditions: [
          { column: 'type', operator: '==', value: 'A' } as Condition,
          { column: 'type', operator: '==', value: 'B' } as Condition
        ]
      };

      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          { column: 'active', operator: '==', value: true } as Condition,
          nestedCondition
        ]
      };

      const itemQuery: ItemQuery = {
        compoundCondition
      };

      // Nested OR conditions should throw an error in Firestore v7
      expect(() => {
        buildQuery(itemQuery, mockCollectionRef);
      }).toThrow('OR conditions within AND are not supported in Firestore v7');
    });

    it('should apply limit to query', () => {
      const itemQuery: ItemQuery = {
        limit: 10
      };

      buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should apply offset to query', () => {
      const itemQuery: ItemQuery = {
        offset: 5
      };

      buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.offset).toHaveBeenCalledWith(5);
    });

    it('should apply orderBy to query', () => {
      const itemQuery: ItemQuery = {
        orderBy: [
          { field: 'name', direction: 'asc' },
          { field: 'createdAt', direction: 'desc' }
        ]
      };

      buildQuery(itemQuery, mockCollectionRef);

      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
      expect(mockQuery.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should handle complex query with all options', () => {
      const itemQuery: ItemQuery = {
        refs: {
          parent: { pk: 'parent-id', kt: 'parent' }
        },
        events: {
          created: { start: new Date('2023-01-01T00:00:00.000Z') }
        },
        compoundCondition: {
          compoundType: 'AND',
          conditions: [
            { column: 'status', operator: '==', value: 'active' } as Condition
          ]
        },
        limit: 20,
        offset: 10,
        orderBy: [{ field: 'name', direction: 'asc' }]
      };

      const result = buildQuery(itemQuery, mockCollectionRef);

      // Verify all types of filters were applied
      expect(mockQuery.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(mockQuery.where).toHaveBeenCalledWith('refs.parent.key.pk', '==', 'parent-id');
      expect(mockQuery.where).toHaveBeenCalledWith('refs.parent.key.kt', '==', 'parent');
      expect(mockQuery.where).toHaveBeenCalledWith('events.created.at', '>=', new Date('2023-01-01T00:00:00.000Z'));
      expect(mockQuery.where).toHaveBeenCalledWith('status', '==', 'active');
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.offset).toHaveBeenCalledWith(10);
      expect(mockQuery.orderBy).toHaveBeenCalledWith('name', 'asc');
      expect(result).toBe(mockQuery);
    });

    it('should work with CollectionGroup', () => {
      const itemQuery: ItemQuery = {
        limit: 5
      };

      const result = buildQuery(itemQuery, mockCollectionGroup);

      expect(mockQuery.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result).toBe(mockQuery);
    });

    it('should handle conditions with default == operator', () => {
      const compoundCondition: CompoundCondition = {
        compoundType: 'AND',
        conditions: [
          { column: 'name', value: 'test' } as Condition  // No operator specified
        ]
      };

      const itemQuery: ItemQuery = {
        compoundCondition
      };

      buildQuery(itemQuery, mockCollectionRef);

      // Verify mockQuery.where was called with individual condition
      expect(mockQuery.where).toHaveBeenCalledWith('events.deleted.at', '==', null);
      expect(mockQuery.where).toHaveBeenCalledWith('name', '==', 'test');
    });

    it('should handle product type OR query', () => {
      // This test verifies that OR compound queries throw an error in Firestore v7
      const compoundCondition: CompoundCondition = {
        compoundType: 'OR',
        conditions: [
          { column: 'product_type', operator: '==', value: 'Wood Veneer' } as Condition,
          { column: 'product_type', operator: '==', value: 'Stock Graphics' } as Condition
        ]
      };

      const itemQuery: ItemQuery = {
        compoundCondition
      };

      // OR conditions should throw an error in Firestore v7
      expect(() => {
        buildQuery(itemQuery, mockCollectionRef);
      }).toThrow('OR conditions require Firestore SDK v10+ or composite indexes. Consider upgrading @google-cloud/firestore to v10.1.0 or higher.');
    });
  });
});
