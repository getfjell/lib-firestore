import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = { default: vi.fn(), debug: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock getReference to return a mock CollectionReference
const mockCollectionRef = {
  doc: vi.fn((id) => {
    const set = vi.fn();
    const get = vi.fn();
    // Save for assertions if needed
    // @ts-ignore
    mockCollectionRef._lastDocRef = { set, get, path: `mock/doc/path/${id}` };
    return { set, get, path: `mock/doc/path/${id}` };
  }),
  _lastDocRef: null, // for test assertions if needed
};
const mockGetReference = vi.fn(() => mockCollectionRef);
vi.mock('../../src/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock createEvents to just return the item as an object
const mockCreateEvents = vi.fn((item: any) => ({ ...(typeof item === 'object' ? item : {}), events: { created: true } }));
vi.mock('../../src/EventCoordinator', () => ({
  createEvents: mockCreateEvents,
}));

// Mock processDoc to return the doc data
const mockProcessDoc = vi.fn((doc: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  return { ...data, events: data.events, processed: true };
});
vi.mock('../../src/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = vi.fn((item: any) => ({ ...item, validated: true }));
const mockIsComKey = vi.fn((key: any) => Boolean(key && key.loc));
vi.mock('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  isComKey: mockIsComKey,
  // Provide minimal stubs for types used in the test
  Item: class { },
  TypesProperties: Object,
  PriKey: Object,
  ComKey: Object,
  LocKeyArray: Array,
}));

// Patch global crypto.randomUUID for test
let originalRandomUUID: any;
beforeAll(() => {
  if (!global.crypto) {
    (global as any).crypto = { randomUUID: () => '00000000-0000-0000-0000-000000000000' };
  } else {
    originalRandomUUID = global.crypto.randomUUID;
    global.crypto.randomUUID = () => '00000000-0000-0000-0000-000000000000';
  }
});
afterAll(() => {
  if (originalRandomUUID) {
    global.crypto.randomUUID = originalRandomUUID;
  }
});

let getCreateOperation: any;
beforeAll(async () => {
  ({ getCreateOperation } = await import('../../src/ops/create'));
});

describe('getCreateOperation', () => {
  const firestore = {};
  const definition = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA'] },
  };
  const item = { foo: 'bar' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectionRef.doc.mockReset();
  });

  it('creates a document with a generated key when no key is provided', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'bar' }) })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    const result = await create(item);
    expect(mockGetReference).toHaveBeenCalledWith([], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000000');
    expect(mockCreateEvents).toHaveBeenCalledWith(item);
    expect(lastDocRef!.set).toHaveBeenCalledWith(expect.objectContaining({ foo: 'bar', events: { created: true } }));
    expect(lastDocRef!.get).toHaveBeenCalled();
    expect(mockProcessDoc).toHaveBeenCalledWith(expect.anything(), ['TYPEA']);
    expect(mockValidateKeys).toHaveBeenCalledWith(expect.objectContaining({ processed: true }), ['TYPEA']);
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', events: { created: true }, processed: true, validated: true }));
  });

  it('creates a document with a provided PriKey', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'baz' }) })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    const options = { key: { pk: 'custom-id', kt: 'pri' } };
    mockIsComKey.mockReturnValue(false);
    const result = await create(item, options);
    expect(mockGetReference).toHaveBeenCalledWith([], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('custom-id');
    expect(result).toEqual(expect.objectContaining({ foo: 'baz', events: { created: true }, processed: true, validated: true }));
    expect(lastDocRef!.set).toHaveBeenCalled();
    expect(lastDocRef!.get).toHaveBeenCalled();
  });

  it('creates a document with a provided ComKey and locations', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'qux' }) })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    const options = { key: { pk: 'com-id', loc: ['loc1'], kt: 'com' } };
    mockIsComKey.mockReturnValue(true);
    const result = await create(item, options);
    expect(mockGetReference).toHaveBeenCalledWith(['loc1'], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('com-id');
    expect(result).toEqual(expect.objectContaining({ foo: 'qux', events: { created: true }, processed: true, validated: true }));
    expect(lastDocRef!.set).toHaveBeenCalled();
    expect(lastDocRef!.get).toHaveBeenCalled();
  });

  it('creates a document with explicit locations (no key)', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'baz' }) })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    const options = { locations: ['loc2'] };
    const result = await create(item, options);
    expect(mockGetReference).toHaveBeenCalledWith(['loc2'], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000000');
    expect(result).toEqual(expect.objectContaining({ foo: 'baz', events: { created: true }, processed: true, validated: true }));
    expect(lastDocRef!.set).toHaveBeenCalled();
    expect(lastDocRef!.get).toHaveBeenCalled();
  });

  it('throws if the document does not exist after set', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: false })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    await expect(create(item)).rejects.toThrow('Item not saved');
    expect(lastDocRef!.set).toHaveBeenCalled();
    expect(lastDocRef!.get).toHaveBeenCalled();
  });
});
