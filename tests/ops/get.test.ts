import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = { debug: vi.fn(), error: vi.fn(), default: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock getReference to return a mock DocumentReference
const mockDocRef = {
  get: vi.fn(),
};
const mockGetReference = vi.fn(() => mockDocRef);
vi.mock('../../src/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock processDoc to return the doc data
const mockProcessDoc = vi.fn((doc: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  return { ...data, processed: true };
});
vi.mock('../../src/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = vi.fn((item: any) => ({ ...item, validated: true }));
const mockIsValidItemKey = vi.fn(() => true);
const mockIsComKey = vi.fn(() => false);
vi.mock('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  isValidItemKey: mockIsValidItemKey,
  isComKey: mockIsComKey,
  // Provide minimal stubs for types used in the test
  Item: class { },
  PriKey: Object,
  ComKey: Object,
}));

// Mock errors from @fjell/lib
const mockNotFoundError = vi.fn((op: any, coordinate: any, key: any) => {
  const err = new Error('NotFoundError: ' + String(key));
  err.name = 'NotFoundError';
  return err;
});
const mockInvalidKeyTypeError = vi.fn(() => {
  const err = new Error('Key for Get is not a valid ItemKey');
  err.name = 'InvalidKeyTypeError';
  return err;
});
const mockLocationKeyOrderError = vi.fn(() => {
  const err = new Error('LocationKeyOrderError');
  err.name = 'LocationKeyOrderError';
  return err;
});
vi.mock('@fjell/lib', () => ({
  NotFoundError: mockNotFoundError,
  InvalidKeyTypeError: mockInvalidKeyTypeError,
  LocationKeyOrderError: mockLocationKeyOrderError,
}));

let getGetOperation: any;
beforeAll(async () => {
  ({ getGetOperation } = await import('../../src/ops/get'));
});

describe('getGetOperation', () => {
  const firestore = {};
  const registry = {} as any;
  const definition = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA'] },
    options: {
      references: [],
      aggregations: []
    }
  };
  const validKey = { pk: 'id1', kt: 'pri' };
  const docData = { foo: 'bar' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidItemKey.mockReturnValue(true);
    mockDocRef.get.mockReset();
  });

  it('returns processed and validated item for a valid key', async () => {
    mockDocRef.get.mockResolvedValue({ exists: true, data: () => docData });
    const get = getGetOperation(firestore, definition, registry);
    const result = await get(validKey);
    expect(mockIsValidItemKey).toHaveBeenCalledWith(validKey);
    expect(mockGetReference).toHaveBeenCalledWith(validKey, definition.collectionNames, firestore);
    expect(mockDocRef.get).toHaveBeenCalled();
    expect(mockProcessDoc).toHaveBeenCalledWith(expect.objectContaining({ exists: true }), ['TYPEA'], [], [], registry);
    expect(mockValidateKeys).toHaveBeenCalledWith(expect.objectContaining({ processed: true }), ['TYPEA']);
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', processed: true, validated: true }));
  });

  it('throws if key is invalid', async () => {
    mockIsValidItemKey.mockReturnValue(false);
    const get = getGetOperation(firestore, definition, registry);
    await expect(get(validKey)).rejects.toThrow('Key for Get is not a valid ItemKey');
    expect(mockLogger.error).toHaveBeenCalledWith('Key for Get is not a valid ItemKey: %j', validKey);
    expect(mockGetReference).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if doc does not exist', async () => {
    mockDocRef.get.mockResolvedValue({ exists: false });
    const get = getGetOperation(firestore, definition, registry);
    await expect(get(validKey)).rejects.toThrow('NotFoundError');
    expect(mockNotFoundError).toHaveBeenCalledWith('get', definition.coordinate, validKey);
  });

  it('handles missing references and aggregations options', async () => {
    const definitionWithoutRefsAggs: any = {
      collectionNames: ['testCollection'],
      coordinate: { kta: ['TYPEA'] },
      options: {} // No references or aggregations
    };
    mockDocRef.get.mockResolvedValue({ exists: true, data: () => docData });
    const get = getGetOperation(firestore, definitionWithoutRefsAggs, registry);
    const result = await get(validKey);
    
    expect(mockProcessDoc).toHaveBeenCalledWith(
      expect.objectContaining({ exists: true }),
      ['TYPEA'],
      [],
      [],
      registry
    );
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', processed: true, validated: true }));
  });

  it('uses collection group query for empty loc ComKey', async () => {
    const compositeDefinition = {
      collectionNames: ['testCollection'],
      coordinate: { kta: ['TYPEA', 'TYPEB'] },
      options: {
        references: [],
        aggregations: []
      }
    };
    
    // Empty loc array means "find by primary key across all locations"
    const emptyLocKey = { kt: 'TYPEA', pk: 'id1', loc: [] };
    
    // Mock collection group query
    const mockSnapshot = {
      empty: false,
      docs: [{
        ref: { path: 'parents/parent1/testCollection/id1' },
        id: 'id1',
        data: () => docData
      }]
    };
    
    const mockCollectionGroup = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockSnapshot)
    };
    
    const mockFirestore = {
      collectionGroup: vi.fn(() => mockCollectionGroup)
    };
    
    mockIsComKey.mockReturnValue(true);
    
    const get = getGetOperation(mockFirestore as any, compositeDefinition, registry);
    const result = await get(emptyLocKey);
    
    // Should use collection group query
    expect(mockFirestore.collectionGroup).toHaveBeenCalledWith('testCollection');
    expect(mockCollectionGroup.where).toHaveBeenCalledWith('id', '==', 'id1');
    expect(mockCollectionGroup.limit).toHaveBeenCalledWith(1);
    expect(mockCollectionGroup.get).toHaveBeenCalled();
    
    // Should process the found document
    expect(mockProcessDoc).toHaveBeenCalledWith(
      mockSnapshot.docs[0],
      ['TYPEA', 'TYPEB'],
      [],
      [],
      registry
    );
    
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', processed: true, validated: true }));
  });

  it('throws NotFoundError when collection group query finds no documents', async () => {
    const compositeDefinition = {
      collectionNames: ['testCollection'],
      coordinate: { kta: ['TYPEA', 'TYPEB'] },
      options: {
        references: [],
        aggregations: []
      }
    };
    
    const emptyLocKey = { kt: 'TYPEA', pk: 'id1', loc: [] };
    
    // Mock empty collection group query result
    const mockSnapshot = {
      empty: true,
      docs: []
    };
    
    const mockCollectionGroup = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockSnapshot)
    };
    
    const mockFirestore = {
      collectionGroup: vi.fn(() => mockCollectionGroup)
    };
    
    mockIsComKey.mockReturnValue(true);
    
    const get = getGetOperation(mockFirestore as any, compositeDefinition, registry);
    
    await expect(get(emptyLocKey)).rejects.toThrow('NotFoundError');
    expect(mockNotFoundError).toHaveBeenCalledWith('get', compositeDefinition.coordinate, emptyLocKey);
  });
});
