/* eslint-disable no-undefined */
import { addKey, removeKey } from '@/KeyMaster';
import { Item, ItemProperties } from '@fjell/core';
import { describe, expect, it } from 'vitest';

// Mock FirebaseFirestore
const mockDoc = (id: string, parentStructure: string[] = []) => {
  const doc: any = { id };
  const currentParentRef: any = {};
  doc.ref = { parent: currentParentRef };

  let currentLevel = currentParentRef;
  for (let i = 0; i < parentStructure.length; i++) {
    currentLevel.parent = { id: parentStructure[i] };
    if (i < parentStructure.length - 1) {
      currentLevel.parent.parent = {};
      currentLevel = currentLevel.parent.parent;
    }
  }
  // Ensure the final parent.parent is undefined if not specified, or if it's the root
  if (parentStructure.length > 0) {
    let deepestParent = doc.ref;
    for (let i = 0; i < parentStructure.length; ++i) {
      if (deepestParent.parent && deepestParent.parent.parent) {
        deepestParent = deepestParent.parent.parent;
      } else if (deepestParent.parent && i === parentStructure.length - 1) {
        // final parent, its own parent is undefined
        delete deepestParent.parent.parent;
      } else {
        // structure is shorter than expected
        break;
      }
    }
  }

  return doc as FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>;
};

describe('KeyMaster', () => {
  describe('removeKey', () => {
    it('should remove the key property from an item', () => {
      const item: ItemProperties<'S1'> & { key?: object } = {
        prop1: 'value1',
        key: { kt: 'S1', pk: 'id1' },
      };
      const result = removeKey(item);
      expect(result).not.toHaveProperty('key');
      expect(result.prop1).toBe('value1');
    });

    it('should return the item as is if key property does not exist', () => {
      const item: ItemProperties<'S1'> = {
        prop1: 'value1',
      };
      const result = removeKey(item);
      expect(result).not.toHaveProperty('key');
      expect(result.prop1).toBe('value1');
    });
  });

  describe('addKey', () => {
    it('should add a simple key for a single key type', () => {
      const item: Partial<Item<'TYPEA'>> = {};
      const doc = mockDoc('docId1');
      const keyTypes = ['TYPEA'] as const;
      addKey<'TYPEA'>(item, doc, keyTypes);
      expect(item.key).toEqual({ kt: 'TYPEA', pk: 'docId1' });
    });

    it('should add a key with one level of location', () => {
      const item: Partial<Item<'TYPEA', 'LTYPE1'>> = {};
      const doc = mockDoc('docId1', ['parentId1']);
      const keyTypes = ['TYPEA', 'LTYPE1'] as const;
      addKey<'TYPEA', 'LTYPE1'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'TYPEA',
        pk: 'docId1',
        loc: [{ kt: 'LTYPE1', lk: 'parentId1' }],
      });
    });

    it('should add a key with two levels of location', () => {
      const item: Partial<Item<'TYPEA', 'LTYPE1', 'LTYPE2'>> = {};
      const doc = mockDoc('docId1', ['parentId1', 'grandParentId1']);
      const keyTypes = ['TYPEA', 'LTYPE1', 'LTYPE2'] as const;
      addKey<'TYPEA', 'LTYPE1', 'LTYPE2'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'TYPEA',
        pk: 'docId1',
        loc: [
          { kt: 'LTYPE1', lk: 'parentId1' },
          { kt: 'LTYPE2', lk: 'grandParentId1' },
        ],
      });
    });

    it('should add a key with three levels of location', () => {
      const item: Partial<Item<'TYPEA', 'LTYPE1', 'LTYPE2', 'LTYPE3'>> = {};
      const doc = mockDoc('docId1', ['parentId1', 'grandParentId1', 'greatGrandParentId1']);
      const keyTypes = ['TYPEA', 'LTYPE1', 'LTYPE2', 'LTYPE3'] as const;
      addKey<'TYPEA', 'LTYPE1', 'LTYPE2', 'LTYPE3'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'TYPEA',
        pk: 'docId1',
        loc: [
          { kt: 'LTYPE1', lk: 'parentId1' },
          { kt: 'LTYPE2', lk: 'grandParentId1' },
          { kt: 'LTYPE3', lk: 'greatGrandParentId1' },
        ],
      });
    });

    it('should add a key with four levels of location', () => {
      const item: Partial<Item<'T', 'L1', 'L2', 'L3', 'L4'>> = {};
      const doc = mockDoc('docId1', ['p1', 'p2', 'p3', 'p4']);
      const keyTypes = ['T', 'L1', 'L2', 'L3', 'L4'] as const;
      addKey<'T', 'L1', 'L2', 'L3', 'L4'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'T',
        pk: 'docId1',
        loc: [
          { kt: 'L1', lk: 'p1' },
          { kt: 'L2', lk: 'p2' },
          { kt: 'L3', lk: 'p3' },
          { kt: 'L4', lk: 'p4' },
        ],
      });
    });

    it('should add a key with five levels of location', () => {
      const item: Partial<Item<'T', 'L1', 'L2', 'L3', 'L4', 'L5'>> = {};
      const doc = mockDoc('docId1', ['p1', 'p2', 'p3', 'p4', 'p5']);
      const keyTypes = ['T', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
      addKey<'T', 'L1', 'L2', 'L3', 'L4', 'L5'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'T',
        pk: 'docId1',
        loc: [
          { kt: 'L1', lk: 'p1' },
          { kt: 'L2', lk: 'p2' },
          { kt: 'L3', lk: 'p3' },
          { kt: 'L4', lk: 'p4' },
          { kt: 'L5', lk: 'p5' },
        ],
      });
    });

    it('should handle missing parent ids gracefully by setting lk to undefined', () => {
      const item: Partial<Item<'TYPEA', 'LTYPE1', 'LTYPE2'>> = {};
      // Only one parentId provided, but two location types expected
      const doc = mockDoc('docId1', ['parentId1']);
      const keyTypes = ['TYPEA', 'LTYPE1', 'LTYPE2'] as const;
      addKey<'TYPEA', 'LTYPE1', 'LTYPE2'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'TYPEA',
        pk: 'docId1',
        loc: [
          { kt: 'LTYPE1', lk: 'parentId1' },
          { kt: 'LTYPE2', lk: undefined },
        ],
      });
    });

    it('should handle deeply nested missing parent ids gracefully', () => {
      const item: Partial<Item<'T', 'L1', 'L2', 'L3', 'L4', 'L5'>> = {};
      // Only p1 and p2 are present
      const doc = mockDoc('docId1', ['p1', 'p2']);
      const keyTypes = ['T', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
      addKey<'T', 'L1', 'L2', 'L3', 'L4', 'L5'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'T',
        pk: 'docId1',
        loc: [
          { kt: 'L1', lk: 'p1' },
          { kt: 'L2', lk: 'p2' },
          { kt: 'L3', lk: undefined },
          { kt: 'L4', lk: undefined },
          { kt: 'L5', lk: undefined },
        ],
      });
    });

    it('should handle no parent ids when location types are present', () => {
      const item: Partial<Item<'TYPEA', 'LTYPE1'>> = {};
      const doc = mockDoc('docId1', []); // No parent IDs
      const keyTypes = ['TYPEA', 'LTYPE1'] as const;
      addKey<'TYPEA', 'LTYPE1'>(item, doc, keyTypes);
      expect(item.key).toEqual({
        kt: 'TYPEA',
        pk: 'docId1',
        loc: [

          { kt: 'LTYPE1', lk: undefined }
        ],
      });
    });

  });
});
