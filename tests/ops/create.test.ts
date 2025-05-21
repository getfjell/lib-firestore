import { jest } from '@jest/globals';

// Mock logger
const mockLogger = { default: jest.fn(), debug: jest.fn() };
const mockLoggerGet = jest.fn(() => mockLogger);
jest.unstable_mockModule('@/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock getReference to return a mock CollectionReference
const mockCollectionRef = {
  doc: jest.fn((id) => {
    const set = jest.fn();
    const get = jest.fn();
    // Save for assertions if needed
    // @ts-ignore
    mockCollectionRef._lastDocRef = { set, get, path: `mock/doc/path/${id}` };
    return { set, get, path: `mock/doc/path/${id}` };
  }),
  _lastDocRef: null, // for test assertions if needed
};
const mockGetReference = jest.fn(() => mockCollectionRef);
jest.unstable_mockModule('@/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock createEvents to just return the item as an object
const mockCreateEvents = jest.fn((item: any) => ({ ...(typeof item === 'object' ? item : {}), events: { created: true } }));
jest.unstable_mockModule('@/EventCoordinator', () => ({
  createEvents: mockCreateEvents,
}));

// Mock processDoc to return the doc data
const mockProcessDoc = jest.fn((doc: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  return { ...data, events: data.events, processed: true };
});
jest.unstable_mockModule('@/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = jest.fn((item: any) => ({ ...item, validated: true }));
const mockIsComKey = jest.fn((key: any) => Boolean(key && key.loc));
jest.unstable_mockModule('@fjell/core', () => ({
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
const originalCrypto = global.crypto;
beforeAll(() => {
  global.crypto = { randomUUID: () => 'generated-uuid' } as any;
});
afterAll(() => {
  global.crypto = originalCrypto;
});

let getCreateOperation: any;
beforeAll(async () => {
  ({ getCreateOperation } = await import('@/ops/create'));
});

describe('getCreateOperation', () => {
  const firestore = {};
  const definition = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA'] },
  };
  const item = { foo: 'bar' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectionRef.doc.mockReset();
  });

  it('creates a document with a generated key when no key is provided', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: jest.fn(() => void 0),
        get: jest.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'bar' }) })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    const result = await create(item);
    expect(mockGetReference).toHaveBeenCalledWith([], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('generated-uuid');
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
        set: jest.fn(() => void 0),
        get: jest.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'baz' }) })),
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
        set: jest.fn(() => void 0),
        get: jest.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'qux' }) })),
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
        set: jest.fn(() => void 0),
        get: jest.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'baz' }) })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition);
    const options = { locations: ['loc2'] };
    const result = await create(item, options);
    expect(mockGetReference).toHaveBeenCalledWith(['loc2'], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('generated-uuid');
    expect(result).toEqual(expect.objectContaining({ foo: 'baz', events: { created: true }, processed: true, validated: true }));
    expect(lastDocRef!.set).toHaveBeenCalled();
    expect(lastDocRef!.get).toHaveBeenCalled();
  });

  it('throws if the document does not exist after set', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: jest.fn(() => void 0),
        get: jest.fn(() => ({ exists: false })),
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
