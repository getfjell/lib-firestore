import { jest } from '@jest/globals';

// Mock logger
const mockLogger = { default: jest.fn(), error: jest.fn() };
const mockLoggerGet = jest.fn(() => mockLogger);
jest.unstable_mockModule('@/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock updateEvents and removeKey
const mockUpdateEvents = jest.fn((item: any) => ({ ...item, updated: true }));
const mockRemoveKey = jest.fn((item: any) => {
  // Remove 'key' property from item
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { key: _removed, ...rest } = item;
  return rest;
});
jest.unstable_mockModule('@/EventCoordinator', () => ({
  updateEvents: mockUpdateEvents,
}));
jest.unstable_mockModule('@/KeyMaster', () => ({
  removeKey: mockRemoveKey,
}));

// Mock getReference to return a mock DocumentReference
const mockDocRef = {
  set: jest.fn(),
  get: jest.fn(),
};
const mockGetReference = jest.fn(() => mockDocRef);
jest.unstable_mockModule('@/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock processDoc to return the doc data
const mockProcessDoc = jest.fn((doc: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  return { ...data, processed: true };
});
jest.unstable_mockModule('@/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = jest.fn((item: any) => ({ ...item, validated: true }));
const mockIsValidItemKey = jest.fn(() => true);
jest.unstable_mockModule('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  isValidItemKey: mockIsValidItemKey,
  Item: class { },
  PriKey: Object,
  ComKey: Object,
  TypesProperties: Object,
}));

// Mock NotUpdatedError from @fjell/lib
const mockNotUpdatedError = jest.fn((op: any, coordinate: any, key: any) => {
  const err = new Error('NotUpdatedError: ' + String(key));
  err.name = 'NotUpdatedError';
  return err;
});
jest.unstable_mockModule('@fjell/lib', () => ({
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
    jest.clearAllMocks();
    mockIsValidItemKey.mockReturnValue(true);
    mockDocRef.set.mockReset();
    mockDocRef.get.mockReset();
  });

  it('updates and returns processed and validated item for a valid key', async () => {
    // @ts-expect-error
    mockDocRef.set.mockResolvedValue(void 0);
    // @ts-expect-error
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
    // @ts-expect-error
    mockDocRef.set.mockResolvedValue(void 0);
    // @ts-expect-error
    mockDocRef.get.mockResolvedValue({ exists: false });
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('NotUpdatedError');
    expect(mockNotUpdatedError).toHaveBeenCalledWith('update', definition.coordinate, validKey);
  });

  it('propagates error from set', async () => {
    const error = new Error('set failed');
    // @ts-expect-error
    mockDocRef.set.mockRejectedValue(error);
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('set failed');
    expect(mockDocRef.set).toHaveBeenCalled();
  });

  it('propagates error from get', async () => {
    // @ts-expect-error
    mockDocRef.set.mockResolvedValue(void 0);
    const error = new Error('get failed');
    // @ts-expect-error
    mockDocRef.get.mockRejectedValue(error);
    const update = getUpdateOperation(firestore, definition);
    await expect(update(validKey, item)).rejects.toThrow('get failed');
    expect(mockDocRef.get).toHaveBeenCalled();
  });
});
