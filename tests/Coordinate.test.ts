import { createCoordinate, SCOPE_FIRESTORE } from '../src/Coordinate';
import { ItemTypeArray } from "@fjell/types";
import { describe, expect, it } from 'vitest';

describe('Coordinate', () => {
  describe('createCoordinate', () => {
    it('should create a coordinate with default firestore scope', () => {
      const kta: ItemTypeArray<string> = ['test'];
      const coordinate = createCoordinate<string>(kta);
      expect(coordinate.scopes).toContain(SCOPE_FIRESTORE);
      expect(coordinate.scopes.length).toBe(1);
      expect(coordinate.kta).toEqual(kta);
    });

    it('should create a coordinate with firestore scope and custom scopes', () => {
      const kta: ItemTypeArray<string, string> = ['test', 'level1'];
      const customScopes = ['customScope1', 'customScope2'];
      const coordinate = createCoordinate<string, string>(kta, customScopes);

      expect(coordinate.scopes).toContain(SCOPE_FIRESTORE);
      customScopes.forEach(scope => {
        expect(coordinate.scopes).toContain(scope);
      });
      expect(coordinate.scopes.length).toBe(1 + customScopes.length);
      expect(coordinate.kta).toEqual(kta);
    });

    it('should correctly construct the itemTypeArray portion of the coordinate', () => {
      const kta1: ItemTypeArray<string> = ['entity'];
      const coord1 = createCoordinate<string>(kta1);
      expect(coord1.kta).toEqual(['entity']);

      const kta2: ItemTypeArray<string, string, string> = ['entity', 'type', 'id'];
      const coord2 = createCoordinate<string, string, string>(kta2);
      expect(coord2.kta).toEqual(['entity', 'type', 'id']);
    });

    it('should handle empty custom scopes array', () => {
      const kta: ItemTypeArray<string> = ['sample'];
      const coordinate = createCoordinate<string>(kta, []);
      expect(coordinate.scopes).toContain(SCOPE_FIRESTORE);
      expect(coordinate.scopes.length).toBe(1);
      expect(coordinate.kta).toEqual(kta);
    });

    it('should handle KTA with all levels', () => {
      const kta: ItemTypeArray<string, string, string, string, string, string> = ['l0', 'l1', 'l2', 'l3', 'l4', 'l5'];
      const coordinate = createCoordinate<string, string, string, string, string, string>(kta);
      expect(coordinate.kta).toEqual(['l0', 'l1', 'l2', 'l3', 'l4', 'l5']);
      expect(coordinate.scopes).toContain(SCOPE_FIRESTORE);
    });
  });
});
