import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger
const mockLogger = { debug: vi.fn(), error: vi.fn() };
const mockLoggerGet = vi.fn(() => mockLogger);
vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Mock getReference to return a mock DocumentReference
const mockDocRef = {
  get: vi.fn(),
};
const mockGetReference = vi.fn(() => mockDocRef);
vi.mock('../../src/ReferenceFinder', () => ({
  getReference: mockGetReference,
}));

// Mock processDoc to return the doc data
const mockProcessDoc = vi.fn((doc: any) => {
  const data = doc && typeof doc.data === 'function' ? doc.data() : {};
  return { ...data, processed: true };
});
vi.mock('../../src/DocProcessor', () => ({
  processDoc: mockProcessDoc,
}));

// Mock validateKeys to just return the item as an object
const mockValidateKeys = vi.fn((item: any) => ({ ...item, validated: true }));
const mockIsValidItemKey = vi.fn(() => true);
vi.mock('@fjell/core', () => ({
  validateKeys: mockValidateKeys,
  isValidItemKey: mockIsValidItemKey,
  // Provide minimal stubs for types used in the test
  Item: class { },
  PriKey: Object,
  ComKey: Object,
}));

// Mock NotFoundError from @fjell/lib
const mockNotFoundError = vi.fn((op: any, coordinate: any, key: any) => {
  const err = new Error('NotFoundError: ' + String(key));
  err.name = 'NotFoundError';
  return err;
});
vi.mock('@fjell/lib', () => ({
  NotFoundError: mockNotFoundError,
}));

let getGetOperation: any;
beforeAll(async () => {
  ({ getGetOperation } = await import('../../src/ops/get'));
});

describe('getGetOperation', () => {
  const firestore = {};
  const definition = {
    collectionNames: ['testCollection'],
    coordinate: { kta: ['TYPEA'] },
  };
  const validKey = { pk: 'id1', kt: 'pri' };
  const docData = { foo: 'bar' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsValidItemKey.mockReturnValue(true);
    mockDocRef.get.mockReset();
  });

  it('returns processed and validated item for a valid key', async () => {
    mockDocRef.get.mockResolvedValue({ exists: true, data: () => docData });
    const get = getGetOperation(firestore, definition);
    const result = await get(validKey);
    expect(mockIsValidItemKey).toHaveBeenCalledWith(validKey);
    expect(mockGetReference).toHaveBeenCalledWith(validKey, definition.collectionNames, firestore);
    expect(mockDocRef.get).toHaveBeenCalled();
    expect(mockProcessDoc).toHaveBeenCalledWith({ exists: true, data: expect.any(Function) }, ['TYPEA']);
    expect(mockValidateKeys).toHaveBeenCalledWith(expect.objectContaining({ processed: true }), ['TYPEA']);
    expect(result).toEqual(expect.objectContaining({ foo: 'bar', processed: true, validated: true }));
  });

  it('throws if key is invalid', async () => {
    mockIsValidItemKey.mockReturnValue(false);
    const get = getGetOperation(firestore, definition);
    await expect(get(validKey)).rejects.toThrow('Key for Get is not a valid ItemKey');
    expect(mockLogger.error).toHaveBeenCalledWith('Key for Get is not a valid ItemKey: %j', validKey);
    expect(mockGetReference).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if doc does not exist', async () => {
    mockDocRef.get.mockResolvedValue({ exists: false });
    const get = getGetOperation(firestore, definition);
    await expect(get(validKey)).rejects.toThrow('NotFoundError');
    expect(mockNotFoundError).toHaveBeenCalledWith('get', definition.coordinate, validKey);
  });
});
