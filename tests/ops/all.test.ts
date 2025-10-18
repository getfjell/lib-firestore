import type { Mock } from 'vitest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger to suppress output and allow assertions
const mockLogger = {
  debug: vi.fn(),
  default: vi.fn(),
  error: vi.fn(),
};
const mockLoggerGet = vi.fn(() => mockLogger);

vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock buildQuery to just return the collection reference (chainable)
const mockBuildQuery = vi.fn((itemQuery: any, colRef: any) => colRef);
vi.mock('../../src/QueryBuilder', () => ({
  buildQuery: mockBuildQuery,
}));

// Mock processDoc to return the doc data with a key
const mockProcessDoc = vi.fn((doc: any, kta: any) => {

  void kta; // suppress unused
  return { ...doc.data(), key: { kt: kta[0], pk: doc.id } };
});
vi.mock('../../src/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock getReference to return a mock CollectionReference
const mockColRef = {
  get: vi.fn() as Mock,
};
const mockGetReference = vi.fn(() => mockColRef);
vi.mock('../../src/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock validateKeys to just return the item, or throw if item.key.kt === 'THROW'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockValidateKeys = vi.fn((item: any, kta: any) => {
  if (item.key && item.key.kt === 'THROW') throw new Error('Key validation error');
  return item;
});
const mockValidateLocations = vi.fn(); // Mock validation function
vi.mock('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  validateLocations: mockValidateLocations,
  // Provide minimal stubs for types used in the test
  Item: class { },
  ItemQuery: Object,
  LocKeyArray: Array,
}));

// Import after mocks
let getAllOperation: any;
beforeAll(async () => {
  ({ getAllOperation } = await import('../../src/ops/all'));
});

describe('getAllOperation', () => {
  const firestore: any = {};
  const registry: any = {};
  const definition: any = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA'] },
    options: {
      references: [],
      aggregations: []
    }
  };
  const itemQuery: any = { limit: 2 };
  const locations: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns processed and validated items from Firestore', async () => {
    const docs = [
      { id: 'id1', data: () => ({ foo: 'bar' }) },
      { id: 'id2', data: () => ({ foo: 'baz' }) },
    ];
    mockColRef.get.mockResolvedValue({ docs } as unknown as never);
    const all = getAllOperation(firestore, definition, registry);
    const result = await all(itemQuery, locations);
    expect(mockGetReference).toHaveBeenCalledWith(locations, definition.collectionNames, firestore);
    expect(mockBuildQuery).toHaveBeenCalledWith(itemQuery, mockColRef);
    expect(mockColRef.get).toHaveBeenCalled();
    expect(mockProcessDoc).toHaveBeenCalledTimes(2);
    expect(mockValidateKeys).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { foo: 'bar', key: { kt: 'TYPEA', pk: 'id1' } },
      { foo: 'baz', key: { kt: 'TYPEA', pk: 'id2' } },
    ]);
  });

  it('returns an empty array if no docs are found', async () => {
    mockColRef.get.mockResolvedValue({ docs: [] } as unknown as never);
    const all = getAllOperation(firestore, definition, registry);
    const result = await all(itemQuery, locations);
    expect(result).toEqual([]);
    expect(mockProcessDoc).not.toHaveBeenCalled();
    expect(mockValidateKeys).not.toHaveBeenCalled();
  });

  it('throws if validateKeys throws', async () => {
    const docs = [
      { id: 'id1', data: () => ({ foo: 'bar' }) },
    ];
    // Patch processDoc to return a key with kt: 'THROW'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockProcessDoc.mockImplementationOnce((doc: any, kta: any) => ({ ...doc.data(), key: { kt: 'THROW', pk: doc.id } }));
    mockColRef.get.mockResolvedValue({ docs } as unknown as never);
    const all = getAllOperation(firestore, definition, registry);
    await expect(all(itemQuery, locations)).rejects.toThrow('Key validation error');
    expect(mockValidateKeys).toHaveBeenCalled();
  });

  it('handles missing references and aggregations options', async () => {
    const definitionWithoutRefsAggs: any = {
      collectionNames: ['testCollection'],
      coordinate: { kta: ['TYPEA'] },
      options: {} // No references or aggregations
    };
    const docs = [
      { id: 'id1', data: () => ({ foo: 'bar' }) },
    ];
    mockColRef.get.mockResolvedValue({ docs } as unknown as never);
    const all = getAllOperation(firestore, definitionWithoutRefsAggs, registry);
    const result = await all(itemQuery, locations);
    
    expect(mockProcessDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'id1' }),
      ['TYPEA'],
      [],
      [],
      registry
    );
    expect(result).toEqual([
      { foo: 'bar', key: { kt: 'TYPEA', pk: 'id1' } },
    ]);
  });
});
