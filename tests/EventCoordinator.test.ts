/* eslint-disable no-undefined */
import { createEvents, updateEvents } from '@/EventCoordinator';
import { CollectionReference, DocumentReference, DocumentSnapshot, Firestore } from '@google-cloud/firestore';

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

describe('EventCoordinator', () => {
  let firestoreMock: jest.Mocked<Firestore>;
  let collectionRefMock: jest.Mocked<CollectionReference>;
  let documentRefMock: jest.Mocked<DocumentReference>;
  let documentSnapshotMock: jest.Mocked<DocumentSnapshot>;
  // let queryMock: jest.Mocked<Query>;

  beforeEach(() => {
    firestoreMock = new (Firestore as any)();
    collectionRefMock = new (CollectionReference as any)();
    documentRefMock = new (DocumentReference as any)();
    documentSnapshotMock = new (DocumentSnapshot as any)();
    // queryMock = new (Query as any)();

    firestoreMock.collection.mockReturnValue(collectionRefMock);
    collectionRefMock.doc.mockReturnValue(documentRefMock);
    documentRefMock.get.mockResolvedValue(documentSnapshotMock);
    // @ts-ignore
    documentSnapshotMock.exists = true;
    documentSnapshotMock.data.mockReturnValue({});
  });

  describe('createEvents', () => {
    test('should add created event if not present', () => {
      const item = { events: {} } as any;
      const result = createEvents(item);
      expect(result.events?.created).toBeDefined();
      expect(result.events?.created.at).toBeInstanceOf(Date);
    });

    test('should not overwrite existing created event', () => {
      const existingDate = new Date('2020-01-01');
      const item = { events: { created: { at: existingDate } } } as any;
      const result = createEvents(item);
      expect(result.events?.created.at).toBe(existingDate);
    });

    test('should add updated event', () => {
      const item = { events: {} } as any;
      const result = createEvents(item);
      expect(result.events?.updated).toBeDefined();
      expect(result.events?.updated.at).toBeInstanceOf(Date);
    });

    test('should not overwrite existing updated event', () => {
      const existingDate = new Date('2020-01-01');
      const item = { events: { updated: { at: existingDate } } } as any;
      const result = createEvents(item);
      expect(result.events?.updated?.at).toBe(existingDate);
    });

    test('should merge new events with existing events', () => {
      const existingDate = new Date('2020-01-01');
      const item = { events: { customEvent: { at: existingDate } } } as any;
      const result = createEvents(item);
      expect(result.events?.customEvent.at).toBe(existingDate);
      expect(result.events?.created).toBeDefined();
      expect(result.events?.updated).toBeDefined();
    });

    test('should add events to an item that lacks the events property completely', () => {
      const item = {} as any;
      const result = createEvents(item);
      expect(result.events).toBeDefined();
      expect(result.events?.created).toBeDefined();
      expect(result.events?.created.at).toBeInstanceOf(Date);
      expect(result.events?.updated).toBeDefined();
      expect(result.events?.updated.at).toBeInstanceOf(Date);
    });
  });

  describe('updateEvents', () => {
    test('should add updated event if not present', () => {
      const item = { events: {} } as any;
      const result = updateEvents(item);
      expect(result.events?.updated).toBeDefined();
      expect(result.events?.updated.at).toBeInstanceOf(Date);
    });

    test('should overwrite existing updated event', () => {
      const existingDate = new Date('2020-01-01');
      const item = { events: { updated: { at: existingDate } } } as any;
      const result = updateEvents(item);
      expect(result.events?.updated.at).not.toBe(existingDate);
    });

    test('should add created event if not present', () => {
      const item = { events: {} } as any;
      const result = updateEvents(item);
      expect(result.events?.created).toBeDefined();
      expect(result.events?.created.at).toBeInstanceOf(Date);
    });

    test('should not overwrite existing created event', () => {
      const existingDate = new Date('2020-01-01');
      const item = { events: { created: { at: existingDate } } } as any;
      const result = updateEvents(item);
      expect(result.events?.created.at).toBe(existingDate);
    });

    test('should merge new events with existing events', () => {
      const existingDate = new Date('2020-01-01');
      const item = { events: { customEvent: { at: existingDate } } } as any;
      const result = updateEvents(item);
      expect(result.events?.customEvent.at).toBe(existingDate);
      expect(result.events?.created).toBeDefined();
      expect(result.events?.updated).toBeDefined();
    });

    test('should add events to an item that lacks the events property completely', () => {
      const item = {} as any;
      const result = updateEvents(item);
      expect(result.events).toBeDefined();
      expect(result.events?.created).toBeDefined();
      expect(result.events?.created.at).toBeInstanceOf(Date);
      expect(result.events?.updated).toBeDefined();
      expect(result.events?.updated.at).toBeInstanceOf(Date);
    });
  });
 
});