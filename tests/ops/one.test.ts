import { jest } from '@jest/globals';

// Mock logger to suppress output and allow assertions
const mockLogger = { default: jest.fn() };
const mockLoggerGet = jest.fn(() => mockLogger);
jest.unstable_mockModule('@/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock getAllOperation to control its return value
const mockGetAllOperation = jest.fn();
jest.unstable_mockModule('@/ops/all', () => ({
  getAllOperation: mockGetAllOperation,
}));

// Mock @fjell/core types for type compatibility
jest.unstable_mockModule('@fjell/core', () => ({
  Item: class { },
  ItemQuery: Object,
  LocKeyArray: Array,
}));

// Import after mocks
let getOneOperation: any;
beforeAll(async () => {
  ({ getOneOperation } = await import('@/ops/one'));
});

describe('getOneOperation', () => {
  const firestore: any = {};
  const definition: any = { collectionNames: ['testCollection'], coordinate: { kta: ['TYPEA'] } };
  const itemQuery: any = { limit: 1 };
  const locations: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the first item if getAllOperation returns items', async () => {
    const items = [{ foo: 'bar' }, { foo: 'baz' }];
    // getAllOperation returns a function (the op) that returns items
    mockGetAllOperation.mockReturnValue(() => Promise.resolve(items));
    const one = getOneOperation(firestore, definition);
    const result = await one(itemQuery, locations);
    expect(mockGetAllOperation).toHaveBeenCalledWith(firestore, definition);
    expect(result).toEqual(items[0]);
  });

  it('returns null if getAllOperation returns an empty array', async () => {
    mockGetAllOperation.mockReturnValue(() => Promise.resolve([]));
    const one = getOneOperation(firestore, definition);
    const result = await one(itemQuery, locations);
    expect(result).toBeNull();
  });

  it('throws if getAllOperation throws', async () => {
    const error = new Error('getAllOperation failed');
    mockGetAllOperation.mockReturnValue(() => Promise.reject(error));
    const one = getOneOperation(firestore, definition);
    await expect(one(itemQuery, locations)).rejects.toThrow('getAllOperation failed');
  });
});
