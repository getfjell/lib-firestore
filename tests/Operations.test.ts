import { Definition } from '../src/Definition';
import { Item } from '@fjell/core';
import { Registry } from '@fjell/lib';
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

// Mock the registry
const mockRegistry = {
  register: vi.fn(),
  libTree: vi.fn(),
  get: vi.fn(),
} as unknown as Registry;

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
    get: mockLoggerGet.mockReturnValue({ debug: mockLoggerDebug, default: mockLoggerDebug }),
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
    createOps(mockFirestore, mockDefinition, mockRegistry);
    expect(mockLoggerGet).toHaveBeenCalledWith('Operations');
  });

  it('should call each get<OperationName>Operation with firestore and definition', async () => {
    const mockFirestore = {} as FirebaseFirestore.Firestore;
    const mockDefinition = {
      collectionNames: ['testCollection'],
      coordinate: {
        kta: ['testDefinition'] as [string],
        scopes: ['firestore'],
        toString: () => ''
      },
      options: {
        fields: {},
        hooks: {
          preCreate: () => { },
          preUpdate: () => { }
        }
      }
    } as any; // Using any here since we're just testing the function calls
    const mockRegistry = {
      type: 'lib' as const,
      get: vi.fn(),
      register: vi.fn(),
      createInstance: vi.fn(),
      instanceTree: vi.fn(),
    } as unknown as Registry;

    const { createOperations: createOps } = await import('../src/Operations');
    createOps(mockFirestore, mockDefinition, mockRegistry);

    expect(mockGetAllOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition, mockRegistry);
    expect(mockGetOneOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition, mockRegistry);
    expect(mockGetCreateOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition, mockRegistry);
    expect(mockGetUpdateOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition, mockRegistry);
    expect(mockGetGetOperation).toHaveBeenCalledWith(mockFirestore, mockDefinition, mockRegistry);
    expect(mockGetRemoveOperations).toHaveBeenCalledWith(mockFirestore, mockDefinition, mockRegistry);
    expect(mockGetFindOperation).toHaveBeenCalledWith(mockDefinition, expect.any(Object), mockRegistry);
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
    const operations = createOps(mockFirestore, mockDefinition, mockRegistry);

    expect(operations.all).toBe(mockAll);
    expect(operations.one).toBe(mockOne);
    expect(operations.create).toBe(mockCreate);
    expect(operations.update).toBe(mockUpdate);
    expect(operations.get).toBe(mockGet);
    expect(operations.remove).toBe(mockRemove);
    expect(operations.find).toBe(mockFind);
  });

  it('should include a functional upsert operation', async () => {
    const { createOperations: createOps } = await import('../src/Operations');
    const operations = createOps(mockFirestore, mockDefinition, mockRegistry);
    expect(operations.upsert).toBeDefined();
    expect(typeof operations.upsert).toBe('function');
    // Note: The actual upsert functionality is tested in integration tests
  });
});
