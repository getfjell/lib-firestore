import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@fjell/core';
import type { Definition } from '../../src/Definition';
import type { Registry } from '@fjell/lib';

// Mock logger at the top level
vi.mock('../../src/logger', () => ({
  default: {
    get: vi.fn().mockReturnValue({
      debug: vi.fn(),
      error: vi.fn(),
      default: vi.fn(),
    }),
  },
}));

// Import after mocking
import { getUpsertOperation } from '../../src/ops/upsert';

describe('getUpsertOperation', () => {
  let mockFirestore: any;
  let mockDefinition: Definition<Item<string>, string>;
  let mockRegistry: Registry;
  let mockOperations: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFirestore = {};
    mockDefinition = {
      coordinate: {
        kta: ['test'],
        scopes: ['firestore']
      },
      options: {},
      collectionNames: ['test-collection']
    } as Definition<Item<string>, string>;
    mockRegistry = {
      type: 'lib',
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    } as unknown as Registry;

    mockOperations = {
      get: vi.fn(),
      create: vi.fn(),
    };
  });

  it('should return existing item when get succeeds', async () => {
    const existingItem = { id: 'test-id', name: 'existing' };
    mockOperations.get.mockResolvedValue(existingItem);

    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);

    const result = await upsert({ kt: 'test', pk: 'test-id' }, { name: 'new' });

    expect(result).toBe(existingItem);
    expect(mockOperations.get).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' });
    expect(mockOperations.create).not.toHaveBeenCalled();
  });

  it('should create new item when get fails', async () => {
    const newItem = { id: 'test-id', name: 'created' };
    mockOperations.get.mockRejectedValue(new Error('Not found'));
    mockOperations.create.mockResolvedValue(newItem);

    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);

    const result = await upsert({ kt: 'test', pk: 'test-id' }, { name: 'new' });

    expect(result).toBe(newItem);
    expect(mockOperations.get).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' });
    expect(mockOperations.create).toHaveBeenCalledWith({ name: 'new' }, { key: { kt: 'test', pk: 'test-id' } });
  });

  it('should be a function', () => {
    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);
    expect(typeof upsert).toBe('function');
  });
});
