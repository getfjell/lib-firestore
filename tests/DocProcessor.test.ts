/* eslint-disable no-undefined */

let mockAddKeyFn: any;
vi.mock('../src/KeyMaster', () => ({
  addKey: vi.fn((...args: any[]) => mockAddKeyFn(...args)),
}));

import { processDoc } from '@/DocProcessor';
import { AllItemTypeArrays } from '@fjell/core';
import { DocumentData, DocumentSnapshot, Timestamp } from '@google-cloud/firestore';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('DocProcessor', () => {
  let mockAddKey: Mock;

  beforeEach(async () => {
    // Clear all mocks, including the logger ones inside mockLoggerInstance
    vi.clearAllMocks();

    mockAddKeyFn = vi.fn();
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

    it('should process a document correctly, converting Timestamp to Date', () => {
      const rawDate = new Date();
      const firestoreTimestamp = Timestamp.fromDate(rawDate);
      const mockData = {
        name: 'Test Item',
        events: {
          created: { at: firestoreTimestamp, by: 'user1' },
        },
      };
      const doc = mockDocSnapshot('doc1', mockData) as DocumentSnapshot;

      const result = processDoc(doc, keyTypes);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events?.created?.at).toBeInstanceOf(Date);
      expect((result.events?.created?.at as Date).toISOString()).toEqual(rawDate.toISOString());
      expect(result.name).toBe('Test Item');
    });

    it('should handle documents with no events property', () => {
      const mockData = { name: 'No Events Item' };
      const doc = mockDocSnapshot('doc2', mockData) as DocumentSnapshot;

      const result = processDoc(doc, keyTypes);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events).toBeUndefined();
      expect(result.name).toBe('No Events Item');
    });

    it('should handle events where at is already a Date', () => {
      const existingDate = new Date();
      const mockData = {
        name: 'PreExisting Date Item',
        events: {
          updated: { at: existingDate, by: 'user2' },
        },
      };
      const doc = mockDocSnapshot('doc3', mockData) as DocumentSnapshot;

      const result = processDoc(doc, keyTypes);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events?.updated?.at).toBeInstanceOf(Date);
      expect(result.events?.updated?.at).toEqual(existingDate);
    });

    it('should handle events where at is undefined', () => {
      const mockData = {
        name: 'Undefined At Item',
        events: {

          deleted: { by: 'user3' } as any,
        },
      };
      const doc = mockDocSnapshot('doc4', mockData) as DocumentSnapshot;

      const result = processDoc(doc, keyTypes);

      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events?.deleted?.at).toBeUndefined();
    });

    it('should handle events object being present but empty', () => {
      const mockData = {
        name: 'Empty Events Object',
        events: {},
      };
      const doc = mockDocSnapshot('doc5', mockData) as DocumentSnapshot;
      const result = processDoc(doc, keyTypes);
      expect(mockAddKey).toHaveBeenCalledTimes(1);
      expect(mockAddKey).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), keyTypes);
      expect(result.events).toEqual({});
    });
  });
});
