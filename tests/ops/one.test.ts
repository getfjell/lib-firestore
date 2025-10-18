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
vi.mock('@fjell/core', () => ({
  Item: class { },
  ItemQuery: Object,
  LocKeyArray: Array,
  validateLocations: vi.fn(), // Mock validation function
}));

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
    const items = [{ foo: 'bar' }, { foo: 'baz' }];
    // getAllOperation returns a function (the op) that returns items
    mockGetAllOperation.mockReturnValue(() => Promise.resolve(items));
    const one = getOneOperation(firestore, definition, mockRegistry);
    const result = await one(itemQuery, locations);
    expect(mockGetAllOperation).toHaveBeenCalledWith(firestore, definition, mockRegistry);
    expect(result).toEqual(items[0]);
  });

  it('returns null if getAllOperation returns an empty array', async () => {
    mockGetAllOperation.mockReturnValue(() => Promise.resolve([]));
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
