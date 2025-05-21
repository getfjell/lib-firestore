import { Item } from '@fjell/core';
import { Definition } from '@/Definition';
import { jest } from '@jest/globals';

// Mock individual operation creators
const mockGetAllOperation = jest.fn();
const mockGetOneOperation = jest.fn();
const mockGetCreateOperation = jest.fn();
const mockGetUpdateOperation = jest.fn();
const mockGetGetOperation = jest.fn();
const mockGetRemoveOperations = jest.fn();
const mockGetFindOperation = jest.fn();

// Mock the logger
const mockLoggerGet = jest.fn();
const mockLoggerDebug = jest.fn();

jest.unstable_mockModule('../src/ops/all', () => ({
  getAllOperation: mockGetAllOperation,
}));
jest.unstable_mockModule('../src/ops/one', () => ({
  getOneOperation: mockGetOneOperation,
}));
jest.unstable_mockModule('../src/ops/create', () => ({
  getCreateOperation: mockGetCreateOperation,
}));
jest.unstable_mockModule('../src/ops/update', () => ({
  getUpdateOperation: mockGetUpdateOperation,
}));
jest.unstable_mockModule('../src/ops/get', () => ({
  getGetOperation: mockGetGetOperation,
}));
jest.unstable_mockModule('../src/ops/remove', () => ({
  getRemoveOperations: mockGetRemoveOperations,
}));
jest.unstable_mockModule('../src/ops/find', () => ({
  getFindOperation: mockGetFindOperation,
}));
jest.unstable_mockModule('../src/logger', () => ({
  default: {
    get: mockLoggerGet.mockReturnValue({ debug: mockLoggerDebug }),
  },
}));

describe('createOperations', () => {
  let mockFirestore: any;
  let mockDefinition: Definition<Item<string>, string>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock Firestore and Definition
    mockFirestore = {
      collection: jest.fn(),
      // Add other Firestore methods if needed by operations
    };
    mockDefinition = {
      name: 'testDefinition',
      collectionName: 'testCollection',
      fields: {},
      // Add other Definition properties if needed
    } as unknown as Definition<Item<string>, string>; // Cast for simplicity
  });

  it('should initialize logger with "Operations"', async () => {
    // Dynamically import after mocks are set up
    const { createOperations: createOps } = await import('../src/Operations');
    createOps(mockFirestore, mockDefinition);
    expect(mockLoggerGet).toHaveBeenCalledWith('Operations');
  });

  it('should call each get<OperationName>Operation with firestore and definition', async () => {
    const { createOperations: createOps } = await import('../src/Operations');
    createOps(mockFirestore, mockDefinition);

    expect(mockGetAllOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition);
    expect(mockGetOneOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition);
    expect(mockGetCreateOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition);
    expect(mockGetUpdateOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition);
    expect(mockGetGetOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition);
    expect(mockGetRemoveOperations).toHaveBeenCalledWith(mockFirestore, mockDefinition);
    // For find, it's called with definition and the operations object itself
    // We'll test this more specifically if needed, for now, just check it's called.
    expect(mockGetFindOperation).toHaveBeenCalledWith(mockDefinition, expect.any(Object));
  });

  it('should return an operations object with all defined operations', async () => {
    const mockAll = jest.fn();
    const mockOne = jest.fn();
    const mockCreate = jest.fn();
    const mockUpdate = jest.fn();
    const mockGet = jest.fn();
    const mockRemove = jest.fn();
    const mockFind = jest.fn();

    mockGetAllOperation.mockReturnValue(mockAll);
    mockGetOneOperation.mockReturnValue(mockOne);
    mockGetCreateOperation.mockReturnValue(mockCreate);
    mockGetUpdateOperation.mockReturnValue(mockUpdate);
    mockGetGetOperation.mockReturnValue(mockGet);
    mockGetRemoveOperations.mockReturnValue(mockRemove);
    mockGetFindOperation.mockReturnValue(mockFind);

    const { createOperations: createOps } = await import('../src/Operations');
    const operations = createOps(mockFirestore, mockDefinition);

    expect(operations.all).toBe(mockAll);
    expect(operations.one).toBe(mockOne);
    expect(operations.create).toBe(mockCreate);
    expect(operations.update).toBe(mockUpdate);
    expect(operations.get).toBe(mockGet);
    expect(operations.remove).toBe(mockRemove);
    expect(operations.find).toBe(mockFind);
  });

  it('should include an upsert operation that throws "Not implemented"', async () => {
    const { createOperations: createOps } = await import('../src/Operations');
    const operations = createOps(mockFirestore, mockDefinition);
    expect(() => operations.upsert({} as any, {} as any)).toThrow('Not implemented');
  });
});
