import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = { default: vi.fn(), error: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('@/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock updateEvents and removeKey
const mockUpdateEvents = vi.fn((item: any) => ({ ...item, updated: true }));
const mockRemoveKey = vi.fn((item: any) => {
  // Remove 'key' property from item
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key: _removed, ...rest } = item;
  return rest;
});
vi.mock('@/EventCoordinator', () => ({
  updateEvents: mockUpdateEvents,
}));
vi.mock('@/KeyMaster', () => ({
  removeKey: mockRemoveKey,
}));

// Mock getReference to return a mock DocumentReference
const mockDocRef = {
  set: vi.fn(),
  get: vi.fn(),
};
const mockGetReference = vi.fn(() => mockDocRef);
vi.mock('@/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock processDoc to return the doc data
const mockProcessDoc = vi.fn((doc: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  return { ...data, processed: true };
});
vi.mock('@/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = vi.fn((item: any) => ({ ...item, validated: true }));
const mockIsValidItemKey = vi.fn(() => true);
vi.mock('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  isValidItemKey: mockIsValidItemKey,
  Item: class { },
  PriKey: Object,
  ComKey: Object,
  TypesProperties: Object,
}));

// Mock NotUpdatedError from @fjell/lib
const mockNotUpdatedError = vi.fn((op: any, coordinate: any, key: any) => {
  const err = new Error('NotUpdatedError: ' + String(key));
  err.name = 'NotUpdatedError';
  return err;
});
vi.mock('@fjell/lib', () => ({
  NotUpdatedError: mockNotUpdatedError,
}));

let getUpdateOperation: any;
beforeAll(async () => {
  ({ getUpdateOperation } = await import('@/ops/update'));
});

describe('getUpdateOperation', () => {
  const firestore = {};
  const definition = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA'] },
  };
  const validKey = { pk: 'id1', kt: 'pri' };
  const item = { foo: 'bar', key: { pk: 'id1', kt: 'pri' } };
  const docData = { foo: 'bar' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidItemKey.mockReturnValue(true);
    mockDocRef.set.mockReset();
    mockDocRef.get.mockReset();
  });

  it('updates and returns processed and validated item for a valid key', async () => {
    mockDocRef.set.mockResolvedValue(void 0);
    mockDocRef.get.mockResolvedValue({ exists: true, data: () => docData });
    const update = getUpdateOperation(firestore, definition);
    const result = await update(validKey, item);
    expect(mockLogger.default).toHaveBeenCalledWith('Update', { key: validKey, item });
    expect(mockIsValidItemKey).toHaveBeenCalledWith(validKey);
    expect(mockGetReference).toHaveBeenCalledWith(validKey, definition.collectionNames, firestore);
    expect(mockUpdateEvents).toHaveBeenCalledWith(item);
    expect(mockRemoveKey).toHaveBeenCalledWith(expect.objectContaining({ foo: 'bar', updated: true, key: { pk: 'id1', kt: 'pri' } }));
    expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({ foo: 'bar', updated: true }), { merge: true });
    expect(mockDocRef.get).toHaveBeenCalled();
    expect(mockProcessDoc).toHaveBeenCalledWith({ exists: true, data: expect.any(Function) }, ['TYPEA']);
    expect(mockValidateKeys).toHaveBeenCalledWith(expect.objectContaining({ processed: true }), ['TYPEA']);
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', processed: true, validated: true }));
  });

  it('throws if key is invalid', async () => {
    mockIsValidItemKey.mockReturnValue(false);
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('Key for Update is not a valid ItemKey');
    expect(mockLogger.error).toHaveBeenCalledWith('Key for Update is not a valid ItemKey: %j', validKey);
    expect(mockGetReference).not.toHaveBeenCalled();
    expect(mockDocRef.set).not.toHaveBeenCalled();
  });

  it('throws NotUpdatedError if doc does not exist after set', async () => {
    mockDocRef.set.mockResolvedValue(void 0);
    mockDocRef.get.mockResolvedValue({ exists: false });
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('NotUpdatedError');
    expect(mockNotUpdatedError).toHaveBeenCalledWith('update', definition.coordinate, validKey);
  });

  it('propagates error from set', async () => {
    const error = new Error('set failed');
    mockDocRef.set.mockRejectedValue(error);
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('set failed');
    expect(mockDocRef.set).toHaveBeenCalled();
  });

  it('propagates error from get', async () => {
    mockDocRef.set.mockResolvedValue(void 0);
    const error = new Error('get failed');
    mockDocRef.get.mockRejectedValue(error);
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('get failed');
    expect(mockDocRef.get).toHaveBeenCalled();
  });
});
