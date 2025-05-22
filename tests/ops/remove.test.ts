/* eslint-disable @typescript-eslint/no-unused-vars */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = { default: vi.fn(), error: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('@/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock @fjell/core
const mockValidateKeys = vi.fn((item: any, kta: any) => ({ ...item, validated: true }));
const mockIsValidItemKey = vi.fn(() => true);
vi.mock('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  isValidItemKey: mockIsValidItemKey,
  Item: class { },
  PriKey: Object,
  ComKey: Object,
  TypesProperties: Object,
}));

// Mock getUpdateOperation
const mockUpdateOperation = vi.fn();
const mockGetUpdateOperation = vi.fn(() => mockUpdateOperation);
vi.mock('@/ops/update', () => ({
  getUpdateOperation: mockGetUpdateOperation,
}));

let getRemoveOperations: any;
beforeAll(async () => {
  ({ getRemoveOperations } = await import('@/ops/remove'));
});

describe('getRemoveOperations', () => {
  const firestore = {};
  const definition: any = {
    options: {},
    coordinate: { kta: ['TYPEA'] },
    collectionNames: ['testCollection'],
  };
  const validKey: any = { pk: 'id1', kt: 'pri' };
  const removedItem: any = { foo: 'bar', events: { deleted: { at: new Date() } } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidItemKey.mockReturnValue(true);
    mockUpdateOperation.mockReset();
    // @ts-ignore
    mockUpdateOperation.mockResolvedValue(removedItem);
    mockValidateKeys.mockImplementation((item: any) => ({ ...item, validated: true }));
  });

  it('removes item and returns validated item (no postRemove)', async () => {
    const remove = getRemoveOperations(firestore, definition);
    const result = await remove(validKey);
    expect(mockLogger.default).toHaveBeenCalledWith('Remove', { key: validKey });
    expect(mockIsValidItemKey).toHaveBeenCalledWith(validKey);
    expect(mockGetUpdateOperation).toHaveBeenCalledWith(firestore, definition);
    expect(mockUpdateOperation).toHaveBeenCalledWith(validKey, expect.objectContaining({ events: expect.any(Object) }));
    expect(mockValidateKeys).toHaveBeenCalledWith(removedItem, definition.coordinate.kta);
    expect(result).toEqual(expect.objectContaining({ ...removedItem, validated: true }));
  });

  it('throws if key is invalid', async () => {
    mockIsValidItemKey.mockReturnValue(false);
    const remove = getRemoveOperations(firestore, definition);
    await expect(remove(validKey)).rejects.toThrow('Key for Remove is not a valid ItemKey');
    expect(mockLogger.error).toHaveBeenCalledWith('Key for Remove is not a valid ItemKey: %j', validKey);
    expect(mockUpdateOperation).not.toHaveBeenCalled();
  });

  it('propagates error from updateOperation', async () => {
    const error = new Error('update failed');
    // @ts-ignore
    mockUpdateOperation.mockRejectedValue(error);
    const remove = getRemoveOperations(firestore, definition);
    await expect(remove(validKey)).rejects.toThrow('update failed');
    expect(mockUpdateOperation).toHaveBeenCalled();
  });
});
