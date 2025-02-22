/* eslint-disable no-undefined */
import { processDoc } from '@/DocProcessor';
import { ItemEvent } from '@fjell/core';
import { DocumentSnapshot, Timestamp } from '@google-cloud/firestore';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});
jest.mock('@google-cloud/firestore');

describe('DocProcessor', () => {
  let documentSnapshotMock: jest.Mocked<DocumentSnapshot>;

  beforeEach(() => {
    documentSnapshotMock = new (DocumentSnapshot as any)();
    documentSnapshotMock.data.mockReturnValue({});
  });

  describe('processDoc', () => {
    test('should process document with no events', () => {
      const mockData = {
        id: '123',
        name: 'Test Item'
      };
      documentSnapshotMock.data.mockReturnValue(mockData);
      
      const result = processDoc(documentSnapshotMock, ['test']);
      
      expect(result).toEqual(expect.objectContaining(mockData));
    });

    test('should handle events without timestamps', () => {
      const mockData = {
        events: {
          created: {
            by: 'user1'
          } as unknown as ItemEvent
        }
      };
      documentSnapshotMock.data.mockReturnValue(mockData);

      const result = processDoc(documentSnapshotMock, ['test']);

      expect(result.events?.created.by).toBe('user1');
      expect(result.events?.created.at).toBeUndefined();
    });

    test('should preserve non-event properties', () => {
      const mockData = {
        id: '123',
        name: 'Test Item',
        events: {
          created: {
            at: new Timestamp(1234567890, 0),
            by: 'user1'
          } as unknown as ItemEvent
        }
      };
      documentSnapshotMock.data.mockReturnValue(mockData);

      const result = processDoc(documentSnapshotMock, ['test']);

      expect(result.id).toBe('123');
      expect(result.name).toBe('Test Item');
    });
  });
});
