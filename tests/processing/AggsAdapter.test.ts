import { describe, expect, it } from 'vitest';
import {
  addAggsToItem,
  removeAggsFromItem
} from '../../src/processing/AggsAdapter';
import { AggregationDefinition } from '@fjell/lib';

describe('AggsAdapter', () => {
  describe('addAggsToItem', () => {
    it('should add aggs structure for single aggregation (cardinality: one)', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        profile: {
          key: { kt: 'profile', pk: 'p1' },
          bio: 'Test bio'
        }
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['profile'],
          property: 'profile',
          cardinality: 'one'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      expect(result.aggs).toBeDefined();
      expect(result.aggs.profile).toEqual({
        key: { kt: 'profile', pk: 'p1' },
        bio: 'Test bio'
      });
      expect(result.profile).toBeUndefined(); // Removed from direct properties
      expect(result.title).toBe('My Post'); // Other properties preserved
    });

    it('should add aggs structure for single aggregation (cardinality: many)', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        comments: [
          { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' },
          { key: { kt: 'comment', pk: 'c2' }, text: 'Comment 2' }
        ]
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      expect(result.aggs).toBeDefined();
      expect(result.aggs.comments).toEqual([
        { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' },
        { key: { kt: 'comment', pk: 'c2' }, text: 'Comment 2' }
      ]);
      expect(result.comments).toBeUndefined(); // Removed from direct properties
      expect(result.title).toBe('My Post');
    });

    it('should handle multiple aggregations', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        comments: [
          { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' }
        ],
        userCount: 42
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        },
        {
          kta: ['user'],
          property: 'userCount',
          cardinality: 'one'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      expect(result.aggs).toBeDefined();
      expect(result.aggs.comments).toEqual([
        { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' }
      ]);
      expect(result.aggs.userCount).toBe(42);
      expect(result.comments).toBeUndefined();
      expect(result.userCount).toBeUndefined();
      expect(result.title).toBe('My Post');
    });

    it('should handle aggregation with undefined value', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post'
        // comments is undefined
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      // Should not add aggs if aggregation value is undefined
      expect(result.aggs).toBeUndefined();
      expect(result.title).toBe('My Post');
    });

    it('should handle aggregation with null value', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        profile: null
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['profile'],
          property: 'profile',
          cardinality: 'one'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      expect(result.aggs).toBeDefined();
      expect(result.aggs.profile).toBeNull();
      expect(result.profile).toBeUndefined();
    });

    it('should handle empty array for many aggregation', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        comments: []
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      expect(result.aggs).toBeDefined();
      expect(result.aggs.comments).toEqual([]);
      expect(result.comments).toBeUndefined();
    });

    it('should handle empty aggregations array', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post'
      };
      const aggDefs: AggregationDefinition[] = [];

      const result = addAggsToItem(item, aggDefs);

      expect(result.aggs).toBeUndefined();
      expect(result.title).toBe('My Post');
    });

    it('should preserve all original item properties except aggregations', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        content: 'Post content',
        createdAt: new Date(),
        comments: [{ key: { kt: 'comment', pk: 'c1' } }]
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = addAggsToItem(item, aggDefs);

      expect(result.title).toBe('My Post');
      expect(result.content).toBe('Post content');
      expect(result.createdAt).toBe(item.createdAt);
      expect(result.key).toEqual({ kt: 'post', pk: '1' });
      expect(result.comments).toBeUndefined();
    });
  });

  describe('removeAggsFromItem', () => {
    it('should remove aggs structure and restore direct properties', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        aggs: {
          comments: [
            { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' }
          ]
        }
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = removeAggsFromItem(item, aggDefs);

      expect(result.aggs).toBeUndefined();
      expect(result.comments).toEqual([
        { key: { kt: 'comment', pk: 'c1' }, text: 'Comment 1' }
      ]);
      expect(result.title).toBe('My Post');
    });

    it('should handle multiple aggregations', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        aggs: {
          comments: [{ key: { kt: 'comment', pk: 'c1' } }],
          userCount: 42
        }
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        },
        {
          kta: ['user'],
          property: 'userCount',
          cardinality: 'one'
        }
      ];

      const result = removeAggsFromItem(item, aggDefs);

      expect(result.aggs).toBeUndefined();
      expect(result.comments).toEqual([{ key: { kt: 'comment', pk: 'c1' } }]);
      expect(result.userCount).toBe(42);
      expect(result.title).toBe('My Post');
    });

    it('should handle items without aggs structure', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        comments: [{ key: { kt: 'comment', pk: 'c1' } }]
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = removeAggsFromItem(item, aggDefs);

      expect(result).toEqual(item);
      expect(result.aggs).toBeUndefined();
      expect(result.comments).toEqual([{ key: { kt: 'comment', pk: 'c1' } }]);
    });

    it('should preserve all original item properties', () => {
      const item: any = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        content: 'Post content',
        createdAt: new Date(),
        aggs: {
          comments: [{ key: { kt: 'comment', pk: 'c1' } }]
        }
      };
      const aggDefs: AggregationDefinition[] = [
        {
          kta: ['comment'],
          property: 'comments',
          cardinality: 'many'
        }
      ];

      const result = removeAggsFromItem(item, aggDefs);

      expect(result.title).toBe('My Post');
      expect(result.content).toBe('Post content');
      expect(result.createdAt).toBe(item.createdAt);
      expect(result.key).toEqual({ kt: 'post', pk: '1' });
      expect(result.aggs).toBeUndefined();
      expect(result.comments).toEqual([{ key: { kt: 'comment', pk: 'c1' } }]);
    });
  });
});

