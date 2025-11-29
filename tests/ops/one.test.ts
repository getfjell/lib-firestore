import type { Registry } from '@fjell/lib';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger to suppress output and allow assertions
const mockLogger = { default: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock getAllOperation to control its return value
const mockGetAllOperation = vi.fn();
vi.mock('../../src/ops/all', () => ({
  getAllOperation: mockGetAllOperation,
}));

// Mock registry
const mockRegistry = {
  type: 'lib' as const,
  get: vi.fn(),
  register: vi.fn(),
  createInstance: vi.fn(),
  instanceTree: vi.fn(),
} as unknown as Registry;

// Mock @fjell/core types for type compatibility
const mockValidateLocations = vi.fn(); // Mock validation function
vi.mock('@fjell/core', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    validateLocations: mockValidateLocations,
  };
});

// Import after mocks
let getOneOperation: any;
beforeAll(async () => {
  ({ getOneOperation } = await import('../../src/ops/one'));
});

describe('getOneOperation', () => {
  const firestore: any = {};
  const definition: any = { collectionNames: ['testCollection'], coordinate: { kta: ['TYPEA'] } };
  const itemQuery: any = { limit: 1 };
  const locations: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the first item if getAllOperation returns items', async () => {
    const items = [{ key: { kt: 'TYPEA', pk: 'item-1' }, foo: 'bar' }, { key: { kt: 'TYPEA', pk: 'item-2' }, foo: 'baz' }];
    // getAllOperation returns a function (the op) that returns AllOperationResult
    mockGetAllOperation.mockReturnValue(() => Promise.resolve({ items, metadata: { total: 2, returned: 2, offset: 0, hasMore: false } }));
    const one = getOneOperation(firestore, definition, mockRegistry);
    const result = await one(itemQuery, locations);
    expect(mockGetAllOperation).toHaveBeenCalledWith(firestore, definition, mockRegistry);
    expect(result).toEqual(items[0]);
  });

  it('returns null if getAllOperation returns an empty array', async () => {
    mockGetAllOperation.mockReturnValue(() => Promise.resolve({ items: [], metadata: { total: 0, returned: 0, offset: 0, hasMore: false } }));
    const one = getOneOperation(firestore, definition, mockRegistry);
    const result = await one(itemQuery, locations);
    expect(result).toBeNull();
  });

  it('throws if getAllOperation throws', async () => {
    const error = new Error('getAllOperation failed');
    mockGetAllOperation.mockReturnValue(() => Promise.reject(error));
    const one = getOneOperation(firestore, definition, mockRegistry);
    await expect(one(itemQuery, locations)).rejects.toThrow('getAllOperation failed');
  });
});
