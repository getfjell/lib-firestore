import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Registry } from '@fjell/lib';
import type { Item } from '@fjell/core';

// Mocks for operation creators used by createOperations
const mockGetAllOperation = vi.fn(() => vi.fn());
const mockGetOneOperation = vi.fn(() => vi.fn());
const mockGetCreateOperation = vi.fn(() => vi.fn());
const mockGetUpdateOperation = vi.fn(() => vi.fn());
const mockGetGetOperation = vi.fn(() => vi.fn());
const mockGetRemoveOperations = vi.fn(() => vi.fn());
const mockGetFindOperation = vi.fn();

// Mock the logger
const mockLoggerGet = vi.fn(() => ({ debug: vi.fn(), default: vi.fn() }));

vi.mock('../src/ops/all', () => ({ getAllOperation: mockGetAllOperation }));
vi.mock('../src/ops/one', () => ({ getOneOperation: mockGetOneOperation }));
vi.mock('../src/ops/create', () => ({ getCreateOperation: mockGetCreateOperation }));
vi.mock('../src/ops/update', () => ({ getUpdateOperation: mockGetUpdateOperation }));
vi.mock('../src/ops/get', () => ({ getGetOperation: mockGetGetOperation }));
vi.mock('../src/ops/remove', () => ({ getRemoveOperations: mockGetRemoveOperations }));
vi.mock('../src/ops/find', () => ({ getFindOperation: mockGetFindOperation }));
vi.mock('../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

describe('createOperations.findOne wrapper', () => {
  let mockFirestore: any;
  let mockDefinition: any;
  let mockRegistry: Registry;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFirestore = {} as any;
    mockDefinition = {
      name: 'testDefinition',
      collectionNames: ['test-collection'],
      coordinate: { kta: ['TYPEA'] },
      options: { finders: {} },
    } as any;
    mockRegistry = {
      type: 'lib',
      get: vi.fn(),
      register: vi.fn(),
      createInstance: vi.fn(),
      instanceTree: vi.fn(),
    } as unknown as Registry;
  });

  it('returns first result when find returns non-empty array', async () => {
    const expected = { id: 'first' };
    const findResult = {
      items: [expected, { id: 'second' }],
      metadata: { total: 2, returned: 2, offset: 0, hasMore: false }
    };
    mockGetFindOperation.mockReturnValueOnce(vi.fn().mockResolvedValue(findResult));

    const { createOperations } = await import('../src/Operations');
    const ops = createOperations<Item<'TYPEA'>, 'TYPEA'>(mockFirestore, mockDefinition, mockRegistry);

    const result = await ops.findOne('anyFinder');
    expect(result).toEqual(expected);
    expect(mockGetFindOperation).toHaveBeenCalled();
  });

  it('returns null when find returns empty array', async () => {
    const findResult = {
      items: [],
      metadata: { total: 0, returned: 0, offset: 0, hasMore: false }
    };
    mockGetFindOperation.mockReturnValueOnce(vi.fn().mockResolvedValue(findResult));

    const { createOperations } = await import('../src/Operations');
    const ops = createOperations<Item<'TYPEA'>, 'TYPEA'>(mockFirestore, mockDefinition, mockRegistry);

    const result = await ops.findOne('anyFinder');
    expect(result).toBeNull();
  });
});
