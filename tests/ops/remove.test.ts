/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Registry } from '@fjell/lib';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = {
  default: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
};
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock registry
const mockRegistry = {
  type: 'lib' as const,
  get: vi.fn(),
  register: vi.fn(),
  createInstance: vi.fn(),
  instanceTree: vi.fn(),
} as unknown as Registry;

// Mock @fjell/core
const mockValidateKeys = vi.fn((item: any, kta: any) => ({ ...item, validated: true }));
const mockIsValidItemKey = vi.fn(() => true);
const mockGenerateKeyArray = vi.fn((key: any) => {
  // Return an array containing the original key object
  if (key && typeof key === 'object') {
    return [key];
  }
  return [{ pk: 'mockKey' }];
});
const mockIsPriKey = vi.fn(() => true);
vi.mock('@fjell/core', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    validateKeys: mockValidateKeys,
    isValidItemKey: mockIsValidItemKey,
    generateKeyArray: mockGenerateKeyArray,
    isPriKey: mockIsPriKey,
  };
});

// Mock getUpdateOperation
const mockUpdateOperation = vi.fn();
const mockGetUpdateOperation = vi.fn(() => mockUpdateOperation);
vi.mock('../../src/ops/update', () => ({
  getUpdateOperation: mockGetUpdateOperation,
}));

let getRemoveOperations: any;
beforeAll(async () => {
  ({ getRemoveOperations } = await import('../../src/ops/remove'));
});

describe('getRemoveOperations', () => {
  const mockDocRef = {
    set: vi.fn(),
    get: vi.fn(),
  };
  const mockCollection = {
    doc: vi.fn(() => mockDocRef),
  };
  const firestore = {
    collection: vi.fn(() => mockCollection),
  };
  const definition: any = {
    options: {},
    coordinate: { kta: ['TYPEA'] },
    collectionNames: ['testCollection'],
  };
  const validKey: any = { pk: 'id1', kt: 'TYPEA' };
  const removedItem: any = { foo: 'bar', events: { deleted: { at: new Date() } } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidItemKey.mockReturnValue(true);
    mockUpdateOperation.mockReset();
    // @ts-ignore
    mockUpdateOperation.mockResolvedValue(removedItem);
    mockValidateKeys.mockImplementation((item: any) => ({ ...item, validated: true }));
    firestore.collection.mockClear();
    mockCollection.doc.mockClear();
    mockDocRef.set.mockClear();
    mockDocRef.get.mockClear();
    mockDocRef.get.mockResolvedValue({ exists: true, data: () => ({}) });
  });

  it('removes item and returns validated item (no postRemove)', async () => {
    const remove = getRemoveOperations(firestore, definition, mockRegistry);
    const result = await remove(validKey);
    // The logger is called multiple times with the new verbose format
    expect(mockLogger.default).toHaveBeenCalled();
    expect(mockIsValidItemKey).toHaveBeenCalledWith(validKey);
    expect(mockGetUpdateOperation).toHaveBeenCalledWith(firestore, definition, mockRegistry);
    expect(mockUpdateOperation).toHaveBeenCalledWith(validKey, expect.objectContaining({ events: expect.any(Object) }));
    expect(mockValidateKeys).toHaveBeenCalledWith(removedItem, definition.coordinate.kta);
    expect(result).toEqual(expect.objectContaining({ ...removedItem, validated: true }));
  });

  it('throws if key is invalid', async () => {
    mockIsValidItemKey.mockReturnValue(false);
    const remove = getRemoveOperations(firestore, definition, mockRegistry);
    await expect(remove(validKey)).rejects.toThrow('Key for Remove is not a valid ItemKey');
    expect(mockLogger.error).toHaveBeenCalledWith('🔥 [LIB-FIRESTORE] Key for Remove is not a valid ItemKey: %j', validKey);
    expect(mockUpdateOperation).not.toHaveBeenCalled();
  });

  it('propagates error from updateOperation', async () => {
    const error = new Error('update failed');
    // @ts-ignore
    mockUpdateOperation.mockRejectedValue(error);
    const remove = getRemoveOperations(firestore, definition, mockRegistry);
    await expect(remove(validKey)).rejects.toThrow('update failed');
    expect(mockUpdateOperation).toHaveBeenCalled();
  });
});
