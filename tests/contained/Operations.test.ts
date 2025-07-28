import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger instance
const mockLoggerInstance = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// Mocked dependency functions
const mockAbstractCreateOperations = vi.fn();
const mockGetAllOperation = vi.fn();
const mockGetOneOperation = vi.fn();

// Mock registry
const mockRegistry = {
  get: vi.fn(),
  libTree: vi.fn(),
  register: vi.fn(),
};

// ESM module mocks
vi.mock('../../src/logger', () => ({
  get: vi.fn(() => mockLoggerInstance),
  __esModule: true,
  default: { get: vi.fn(() => mockLoggerInstance) },
}));
vi.mock('../../src/Operations', () => ({ createOperations: mockAbstractCreateOperations }));
vi.mock('../../src/contained/ops/all', () => ({ getAllOperation: mockGetAllOperation }));
vi.mock('../../src/contained/ops/one', () => ({ getOneOperation: mockGetOneOperation }));

let createOperations: any;

describe('contained/Operations createOperations', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockAbstractCreateOperations.mockReset();
    mockGetAllOperation.mockReset();
    mockGetOneOperation.mockReset();
    mockLoggerInstance.debug.mockReset();
    const mod = await import('../../src/contained/Operations');
    createOperations = mod.createOperations;
  });

  it('calls logger.debug with correct args', () => {
    const firestore = { app: {} };
    const definition = {
      coordinate: { kta: ['test'], scopes: ['firestore'], toString: () => 'test' },
      options: {},
      collectionNames: ['testCollection']
    };
    mockAbstractCreateOperations.mockReturnValue({});
    mockGetAllOperation.mockReturnValue(vi.fn());
    mockGetOneOperation.mockReturnValue(vi.fn());
    createOperations(firestore, definition, mockRegistry);
    expect(mockLoggerInstance.debug).toHaveBeenCalledWith('createOperations', { firestore, definition });
  });

  it('calls Abstract.createOperations, getAllOperation, and getOneOperation with correct params', () => {
    const firestore = { app: {} };
    const definition = {
      coordinate: { kta: ['test'], scopes: ['firestore'], toString: () => 'test' },
      options: {},
      collectionNames: ['testCollection']
    };
    const mockOps = { op: true };
    const mockAll = vi.fn();
    const mockOne = vi.fn();
    mockAbstractCreateOperations.mockReturnValue(mockOps);
    mockGetAllOperation.mockReturnValue(mockAll);
    mockGetOneOperation.mockReturnValue(mockOne);
    const result = createOperations(firestore, definition, mockRegistry);
    expect(mockAbstractCreateOperations).toHaveBeenCalledWith(firestore, definition, mockRegistry);
    expect(mockGetAllOperation).toHaveBeenCalledWith(firestore, definition, mockRegistry);
    expect(mockGetOneOperation).toHaveBeenCalledWith(firestore, definition, mockRegistry);
    expect(result).toMatchObject({ ...mockOps, all: mockAll, one: mockOne });
  });

  it('returns an operations object with all, one, and spread abstract ops', () => {
    const firestore = { app: {} };
    const definition = {
      coordinate: { kta: ['test'], scopes: ['firestore'], toString: () => 'test' },
      options: {},
      collectionNames: ['testCollection']
    };
    const mockOps = { opA: vi.fn(), opB: vi.fn() };
    const mockAll = vi.fn();
    const mockOne = vi.fn();
    mockAbstractCreateOperations.mockReturnValue(mockOps);
    mockGetAllOperation.mockReturnValue(mockAll);
    mockGetOneOperation.mockReturnValue(mockOne);
    const result = createOperations(firestore, definition, mockRegistry);
    expect(result.all).toBe(mockAll);
    expect(result.one).toBe(mockOne);
    expect(result.opA).toBe(mockOps.opA);
    expect(result.opB).toBe(mockOps.opB);
  });
});
