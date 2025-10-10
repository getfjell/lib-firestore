import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFirestoreReference, FirestoreReferenceDefinition, stripReferenceItems } from '../../src/processing/ReferenceBuilder';
import { Item, PriKey } from '@fjell/core';
import { createOperationContext } from '@fjell/lib';

describe('Firestore ReferenceBuilder', () => {
  describe('buildFirestoreReference', () => {
    let mockRegistry: any;
    let mockLibrary: any;

    beforeEach(() => {
      mockLibrary = {
        operations: {
          get: vi.fn()
        }
      };
      mockRegistry = {
        get: vi.fn().mockReturnValue(mockLibrary)
      };
    });

    it('should build a reference from refs property', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      const referencedItem = {
        key: { kt: 'user', pk: 'user123' },
        name: 'John Doe',
        email: 'john@example.com'
      };

      mockLibrary.operations.get.mockResolvedValue(referencedItem);

      const result = await buildFirestoreReference(item, referenceDef, mockRegistry);

      expect(mockRegistry.get).toHaveBeenCalledWith(['user']);
      expect(mockLibrary.operations.get).toHaveBeenCalledWith({ kt: 'user', pk: 'user123' });
      expect(result.refs.author.item).toEqual(referencedItem);
      expect(result.refs.author.key).toEqual({ kt: 'user', pk: 'user123' });
    });

    it('should derive kta from reference key if not provided', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author'
        // No kta provided
      };

      const referencedItem = {
        key: { kt: 'user', pk: 'user123' },
        name: 'John Doe'
      };

      mockLibrary.operations.get.mockResolvedValue(referencedItem);

      const result = await buildFirestoreReference(item, referenceDef, mockRegistry);

      expect(mockRegistry.get).toHaveBeenCalledWith(['user']);
      expect(result.refs.author.item).toEqual(referencedItem);
    });

    it('should skip reference if refs[name] is null', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: null
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      const result = await buildFirestoreReference(item, referenceDef, mockRegistry);

      expect(mockLibrary.operations.get).not.toHaveBeenCalled();
      expect(result).toEqual(item);
    });

    it('should skip reference if refs[name] does not exist', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {}
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      const result = await buildFirestoreReference(item, referenceDef, mockRegistry);

      expect(mockLibrary.operations.get).not.toHaveBeenCalled();
      expect(result).toEqual(item);
    });

    it('should use context for caching', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      const referencedItem = {
        key: { kt: 'user', pk: 'user123' },
        name: 'John Doe'
      };

      mockLibrary.operations.get.mockResolvedValue(referencedItem);

      const context = createOperationContext();
      
      // First call - should fetch
      await buildFirestoreReference(item, referenceDef, mockRegistry, context);
      expect(mockLibrary.operations.get).toHaveBeenCalledTimes(1);

      // Second call with same key - should use cache
      const item2 = {
        key: { kt: 'post', pk: '2' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };
      await buildFirestoreReference(item2, referenceDef, mockRegistry, context);
      expect(mockLibrary.operations.get).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should handle circular references with context', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      const context = createOperationContext();
      const priKey: PriKey<string> = { kt: 'user', pk: 'user123' };
      
      // Mark as in progress to simulate circular reference
      context.markInProgress(priKey);

      const result = await buildFirestoreReference(item, referenceDef, mockRegistry, context);

      // Should not call get, and should create a placeholder
      expect(mockLibrary.operations.get).not.toHaveBeenCalled();
      expect(result.refs.author.item).toEqual({ key: priKey });
    });

    it('should throw error if reference key format is invalid', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: 'invalid-key-format'
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      await expect(
        buildFirestoreReference(item, referenceDef, mockRegistry)
      ).rejects.toThrow('Invalid reference key format');
    });

    it('should throw error if registry is not provided', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      await expect(
        buildFirestoreReference(item, referenceDef, null as any)
      ).rejects.toThrow('registry is not present');
    });

    it('should throw error if library is not found in registry', async () => {
      const item = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        }
      };

      const referenceDef: FirestoreReferenceDefinition = {
        name: 'author',
        kta: ['user']
      };

      const emptyRegistry = {
        get: vi.fn().mockReturnValue(null)
      };

      await expect(
        buildFirestoreReference(item, referenceDef, emptyRegistry)
      ).rejects.toThrow('dependency is not present in registry');
    });
  });

  describe('stripReferenceItems', () => {
    it('should strip populated items from refs', () => {
      const item: Partial<Item<'post'>> = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: {
            key: { kt: 'user', pk: 'user123' },
            item: {
              key: { kt: 'user', pk: 'user123' },
              name: 'John Doe',
              email: 'john@example.com'
            } as any
          }
        } as any
      };

      const result = stripReferenceItems(item);

      expect(result.refs).toBeDefined();
      expect(result.refs?.author).toEqual({ kt: 'user', pk: 'user123' });
      expect((result.refs?.author as any).item).toBeUndefined();
    });

    it('should handle refs with only keys (no populated items)', () => {
      const item: Partial<Item<'post'>> = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: { kt: 'user', pk: 'user123' }
        } as any
      };

      const result = stripReferenceItems(item);

      expect(result.refs).toBeDefined();
      expect(result.refs?.author).toEqual({ kt: 'user', pk: 'user123' });
    });

    it('should handle items without refs', () => {
      const item: Partial<Item<'post'>> = {
        key: { kt: 'post', pk: '1' }
      };

      const result = stripReferenceItems(item);

      expect(result).toEqual(item);
    });

    it('should handle multiple references', () => {
      const item: Partial<Item<'post'>> = {
        key: { kt: 'post', pk: '1' },
        refs: {
          author: {
            key: { kt: 'user', pk: 'user123' },
            item: { key: { kt: 'user', pk: 'user123' }, name: 'John' } as any
          },
          category: {
            key: { kt: 'category', pk: 'cat1' },
            item: { key: { kt: 'category', pk: 'cat1' }, name: 'Tech' } as any
          }
        } as any
      };

      const result = stripReferenceItems(item);

      expect(result.refs?.author).toEqual({ kt: 'user', pk: 'user123' });
      expect(result.refs?.category).toEqual({ kt: 'category', pk: 'cat1' });
      expect((result.refs?.author as any).item).toBeUndefined();
      expect((result.refs?.category as any).item).toBeUndefined();
    });

    it('should preserve other item properties', () => {
      const item: Partial<Item<'post'>> = {
        key: { kt: 'post', pk: '1' },
        title: 'My Post',
        content: 'Post content',
        refs: {
          author: {
            key: { kt: 'user', pk: 'user123' },
            item: { key: { kt: 'user', pk: 'user123' }, name: 'John' } as any
          }
        } as any
      } as any;

      const result = stripReferenceItems(item);

      expect(result.title).toBe('My Post');
      expect(result.content).toBe('Post content');
      expect(result.key).toEqual({ kt: 'post', pk: '1' });
    });
  });
});

