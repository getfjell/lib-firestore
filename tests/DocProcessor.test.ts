/* eslint-disable no-undefined */
import { processDoc } from '@/DocProcessor';
import { AllItemTypeArrays } from '@fjell/core';
import { DocumentData, DocumentSnapshot, Timestamp } from '@google-cloud/firestore';
import { jest } from '@jest/globals';

interface MockLogger {
  default: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
}

// Mock a logger to prevent console output during tests and allow for assertions on logger calls if needed.
const mockLoggerInstance: MockLogger = {
  default: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
const mockLoggerGet: jest.Mock<() => MockLogger> = jest.fn(() => mockLoggerInstance);

jest.unstable_mockModule('@/logger', () => ({
  default: {
    get: mockLoggerGet,
  },
}));

// Mock the KeyMaster module as its specific logic is not the focus of DocProcessor tests.
let mockAddKeyFn: jest.Mock;
jest.unstable_mockModule('../src/KeyMaster', () => ({

  addKey: jest.fn((...args: any[]) => mockAddKeyFn(...args)),
}));

describe('DocProcessor', () => {
  let mockAddKey: jest.Mock;
  let Logger: MockLogger;

  beforeEach(async () => {
    // Clear all mocks, including the logger ones inside mockLoggerInstance
    jest.clearAllMocks();
    // If mockLoggerInstance's functions were called, they need to be reset too.
    // jest.clearAllMocks() should handle mocks created by jest.fn(),
    // but if we re-assign mockLoggerInstance, we need to ensure its mocks are fresh.
    mockLoggerInstance.default.mockClear();
    mockLoggerInstance.error.mockClear();
    mockLoggerInstance.warn.mockClear();

    mockAddKeyFn = jest.fn();
    mockAddKey = (await import('../src/KeyMaster')).addKey as jest.Mock;
    Logger = mockLoggerGet(); // This will now return the consistently typed mockLoggerInstance
  });

  describe('convertDates (internal function, tested via processDoc)', () => {
    // Tests for convertDates will be implicitly covered by processDoc tests
    // as convertDates is not an exported member and is called by processDoc.
  });

  describe('processDoc', () => {
    const mockDocSnapshot = (id: string, data: DocumentData | undefined): Partial<DocumentSnapshot> => ({
      data: jest.fn().mockReturnValue(data) as () => DocumentData | undefined,
      id,
      exists: data !== undefined,
      ref: { id, parent: { id: 'mockParentCollection', path: 'mock/path' } } as any,
      createTime: data ? Timestamp.now() : undefined,
      updateTime: data ? Timestamp.now() : undefined,
      readTime: data ? Timestamp.now() : undefined,
    });

    const keyTypes: AllItemTypeArrays<string, string> = ['typeA', 'typeB'];

    it('should throw an error if document data is undefined', () => {
      const docId = 'testDocWithNoData';
      const doc = mockDocSnapshot(docId, undefined) as DocumentSnapshot;
      expect(() => processDoc(doc, keyTypes)).toThrow(`Document data for doc.id='${docId}' is undefined.`);
      expect(Logger.error).not.toHaveBeenCalled();
    });

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

      expect(mockAddKey).not.toHaveBeenCalled();
      expect(result.events?.created?.at).toBeInstanceOf(Date);
      expect((result.events?.created?.at as Date).toISOString()).toEqual(rawDate.toISOString());
      expect(result.name).toBe('Test Item');
    });

    it('should handle documents with no events property', () => {
      const mockData = { name: 'No Events Item' };
      const doc = mockDocSnapshot('doc2', mockData) as DocumentSnapshot;

      const result = processDoc(doc, keyTypes);

      expect(mockAddKey).not.toHaveBeenCalled();
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

      expect(mockAddKey).not.toHaveBeenCalled();
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

      expect(mockAddKey).not.toHaveBeenCalled();
      expect(result.events?.deleted?.at).toBeUndefined();
    });

    it('should handle events object being present but empty', () => {
      const mockData = {
        name: 'Empty Events Object',
        events: {},
      };
      const doc = mockDocSnapshot('doc5', mockData) as DocumentSnapshot;
      const result = processDoc(doc, keyTypes);
      expect(mockAddKey).not.toHaveBeenCalled();
      expect(result.events).toEqual({});
    });
  });
});
