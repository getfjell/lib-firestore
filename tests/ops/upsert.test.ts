import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Item, NotFoundError } from '@fjell/core';
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
      update: vi.fn(),
    };
  });

  it('should get and update existing item when get succeeds', async () => {
    const existingItem = { key: { kt: 'test', pk: 'test-id' }, id: 'test-id', name: 'existing' };
    const updatedItem = { key: { kt: 'test', pk: 'test-id' }, id: 'test-id', name: 'updated' };
    mockOperations.get.mockResolvedValue(existingItem);
    mockOperations.update.mockResolvedValue(updatedItem);

    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);

    const result = await upsert({ kt: 'test', pk: 'test-id' }, { name: 'new' });

    expect(result).toBe(updatedItem);
    expect(mockOperations.get).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' });
    expect(mockOperations.create).not.toHaveBeenCalled();
    expect(mockOperations.update).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' }, { name: 'new' });
  });

  it('should create and update new item when get fails with NotFoundError', async () => {
    const newItem = { key: { kt: 'test', pk: 'test-id' }, id: 'test-id', name: 'created' };
    const updatedItem = { key: { kt: 'test', pk: 'test-id' }, id: 'test-id', name: 'updated' };
    mockOperations.get.mockRejectedValue(new NotFoundError('Not found', 'test', { kt: 'test', pk: 'test-id' }));
    mockOperations.create.mockResolvedValue(newItem);
    mockOperations.update.mockResolvedValue(updatedItem);

    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);

    const result = await upsert({ kt: 'test', pk: 'test-id' }, { name: 'new' });

    expect(result).toBe(updatedItem);
    expect(mockOperations.get).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' });
    expect(mockOperations.create).toHaveBeenCalledWith({ name: 'new' }, { key: { kt: 'test', pk: 'test-id' } });
    expect(mockOperations.update).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' }, { name: 'new' });
  });

  it('should rethrow errors that are not NotFoundError', async () => {
    mockOperations.get.mockRejectedValue(new Error('Database connection failed'));

    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);

    await expect(upsert({ kt: 'test', pk: 'test-id' }, { name: 'new' })).rejects.toThrow('Database connection failed');
    expect(mockOperations.get).toHaveBeenCalledWith({ kt: 'test', pk: 'test-id' });
    expect(mockOperations.create).not.toHaveBeenCalled();
    expect(mockOperations.update).not.toHaveBeenCalled();
  });

  it('should be a function', () => {
    const upsert = getUpsertOperation(mockFirestore, mockDefinition, mockRegistry, mockOperations);
    expect(typeof upsert).toBe('function');
  });
});
