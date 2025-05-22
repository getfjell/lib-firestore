import { Definition } from '@/Definition';
import { Item } from '@fjell/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock individual operation creators
const mockGetAllOperation = vi.fn();
const mockGetOneOperation = vi.fn();
const mockGetCreateOperation = vi.fn();
const mockGetUpdateOperation = vi.fn();
const mockGetGetOperation = vi.fn();
const mockGetRemoveOperations = vi.fn();
const mockGetFindOperation = vi.fn();

// Mock the logger
const mockLoggerGet = vi.fn();
const mockLoggerDebug = vi.fn();

vi.mock('../src/ops/all', () => ({
  getAllOperation: mockGetAllOperation,
}));
vi.mock('../src/ops/one', () => ({
  getOneOperation: mockGetOneOperation,
}));
vi.mock('../src/ops/create', () => ({
  getCreateOperation: mockGetCreateOperation,
}));
vi.mock('../src/ops/update', () => ({
  getUpdateOperation: mockGetUpdateOperation,
}));
vi.mock('../src/ops/get', () => ({
  getGetOperation: mockGetGetOperation,
}));
vi.mock('../src/ops/remove', () => ({
  getRemoveOperations: mockGetRemoveOperations,
}));
vi.mock('../src/ops/find', () => ({
  getFindOperation: mockGetFindOperation,
}));
vi.mock('../src/logger', () => ({
  default: {
    get: mockLoggerGet.mockReturnValue({ debug: mockLoggerDebug }),
  },
}));

describe('createOperations', () => {
  let mockFirestore: any;
  let mockDefinition: Definition<Item<string>, string>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock Firestore and Definition
    mockFirestore = {
      collection: vi.fn(),
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
    const mockAll = vi.fn();
    const mockOne = vi.fn();
    const mockCreate = vi.fn();
    const mockUpdate = vi.fn();
    const mockGet = vi.fn();
    const mockRemove = vi.fn();
    const mockFind = vi.fn();

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
