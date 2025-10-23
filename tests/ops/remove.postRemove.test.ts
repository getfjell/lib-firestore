import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Registry } from '@fjell/lib';

// Mock logger
const mockLogger = { default: vi.fn(), error: vi.fn(), debug: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('../../src/logger', () => ({ default: { get: mockLoggerGet } }));

// Mock getUpdateOperation
const mockUpdateOperation = vi.fn();
const mockGetUpdateOperation = vi.fn(() => mockUpdateOperation);
vi.mock('../../src/ops/update', () => ({ getUpdateOperation: mockGetUpdateOperation }));

let getRemoveOperations: any;
beforeAll(async () => {
  ({ getRemoveOperations } = await import('../../src/ops/remove'));
});

describe('getRemoveOperations with postRemove hook', () => {
  const firestore = {} as any;
  const registry = {} as Registry;
  const definition: any = {
    options: {
      hooks: {
        postRemove: vi.fn((item: any) => ({ ...item, postRemoved: true })),
      },
    },
    coordinate: { kta: ['TYPEA'] },
    collectionNames: ['testCollection'],
  };

  const validKey: any = { pk: 'id1', kt: 'TYPEA' };
  const removedItem: any = { key: { kt: 'TYPEA', pk: 'id1' }, foo: 'bar', events: { deleted: { at: new Date() } } };

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    mockUpdateOperation.mockResolvedValue(removedItem);
  });

  it('invokes postRemove hook and returns its result', async () => {
    const remove = getRemoveOperations(firestore, definition, registry);
    const result = await remove(validKey);

    expect(mockGetUpdateOperation).toHaveBeenCalled();
    expect(definition.options.hooks.postRemove).toHaveBeenCalledWith(expect.objectContaining(removedItem));
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', postRemoved: true }));
  });
});
