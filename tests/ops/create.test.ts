import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = { default: vi.fn(), debug: vi.fn(), error: vi.fn() };
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

// Mock processDoc to return the doc data with a key
const mockProcessDoc = vi.fn((doc: any, kta: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  const docId = doc.id || '00000000-0000-0000-0000-000000000000';
  return { ...data, events: data.events, processed: true, key: { kt: kta[0], pk: docId } };
});
vi.mock('../../src/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = vi.fn((item: any) => ({ ...item, validated: true }));
const mockValidateLocations = vi.fn(); // Mock validation function
const mockIsComKey = vi.fn((key: any) => Boolean(key && key.loc));
vi.mock('@fjell/core', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    validateLocations: mockValidateLocations,
    isComKey: mockIsComKey,
  };
});

vi.mock('@fjell/validation', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    validateKeys: mockValidateKeys,
  };
});

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
  const registry = {};
  const definition = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA', 'LOC1'] }, // Added LOC1 to support location hierarchy
    options: {
      references: [],
      aggregations: []
    }
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
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'bar' }), id })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition, registry);
    const result = await create(item);
    expect(mockGetReference).toHaveBeenCalledWith([], ['testCollection'], firestore);
    expect(mockCollectionRef.doc).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000000');
    expect(mockCreateEvents).toHaveBeenCalledWith(item);
    expect(lastDocRef!.set).toHaveBeenCalledWith(expect.objectContaining({ foo: 'bar', events: { created: true } }));
    expect(lastDocRef!.get).toHaveBeenCalled();
    expect(mockProcessDoc).toHaveBeenCalledWith(expect.anything(), ['TYPEA', 'LOC1'], [], [], expect.anything());
    expect(mockValidateKeys).toHaveBeenCalledWith(expect.objectContaining({ processed: true }), ['TYPEA', 'LOC1']);
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', events: { created: true }, processed: true, validated: true }));
  });

  it('creates a document with a provided PriKey', async () => {
    // This test expects an error because we're using a composite library but providing a PriKey
    const create = getCreateOperation(firestore, definition, registry);
    const options = { key: { pk: 'custom-id', kt: 'TYPEA' } };
    mockIsComKey.mockReturnValue(false);
    await expect(create(item, options)).rejects.toThrow('composite item library');
  });

  it('creates a document with a provided ComKey and locations', async () => {
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'qux' }), id: 'com-id' })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition, registry);
    const options = { key: { pk: 'com-id', loc: [{ kt: 'LOC1', lk: 'loc1' }], kt: 'TYPEA' } };
    mockIsComKey.mockReturnValue(true);
    const result = await create(item, options);
    expect(mockGetReference).toHaveBeenCalledWith([{ kt: 'LOC1', lk: 'loc1' }], ['testCollection'], firestore);
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
        get: vi.fn(() => ({ exists: true, data: () => ({ events: { created: true }, foo: 'baz' }), id })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definition, registry);
    const options = { locations: [{ kt: 'LOC1', lk: 'loc2' }] };
    const result = await create(item, options);
    expect(mockGetReference).toHaveBeenCalledWith([{ kt: 'LOC1', lk: 'loc2' }], ['testCollection'], firestore);
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
    const create = getCreateOperation(firestore, definition, registry);
    await expect(create(item)).rejects.toThrow('Item not saved');
    expect(lastDocRef!.set).toHaveBeenCalled();
    expect(lastDocRef!.get).toHaveBeenCalled();
  });

  it('handles missing references and aggregations options', async () => {
    const definitionWithoutRefsAggs: any = {
      collectionNames: ['testCollection'],
      coordinate: { kta: ['TYPEA'] },
      options: {} // No references or aggregations
    };
    let lastDocRef;
    mockCollectionRef.doc.mockImplementationOnce((id) => {
      lastDocRef = {
        set: vi.fn(() => void 0),
        get: vi.fn(() => ({ exists: true, data: () => ({ foo: 'bar' }), id })),
        path: `mock/doc/path/${id}`,
      };
      return lastDocRef;
    });
    const create = getCreateOperation(firestore, definitionWithoutRefsAggs, registry);
    const result = await create(item);
    
    expect(mockProcessDoc).toHaveBeenCalledWith(
      expect.objectContaining({ exists: true }),
      ['TYPEA'],
      [],
      [],
      registry
    );
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', processed: true, validated: true }));
  });
});
