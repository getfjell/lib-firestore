import { jest } from '@jest/globals';

// Mock logger instance
const mockLoggerInstance = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

// Mocked dependency functions
const mockAbstractCreateOperations = jest.fn();
const mockGetAllOperation = jest.fn();
const mockGetOneOperation = jest.fn();

// ESM module mocks
jest.unstable_mockModule('@/logger', () => ({
  get: jest.fn(() => mockLoggerInstance),
  __esModule: true,
  default: { get: jest.fn(() => mockLoggerInstance) },
}));
jest.unstable_mockModule('@/Operations', () => ({ createOperations: mockAbstractCreateOperations }));
jest.unstable_mockModule('@/contained/ops/all', () => ({ getAllOperation: mockGetAllOperation }));
jest.unstable_mockModule('@/contained/ops/one', () => ({ getOneOperation: mockGetOneOperation }));

let createOperations: any;

describe('contained/Operations createOperations', () => {
  beforeEach(async () => {
    jest.resetModules();
    mockAbstractCreateOperations.mockReset();
    mockGetAllOperation.mockReset();
    mockGetOneOperation.mockReset();
    mockLoggerInstance.debug.mockReset();
    const mod = await import('../../src/contained/Operations');
    createOperations = mod.createOperations;
  });

  it('calls logger.debug with correct args', () => {
    const firestore = { app: {} };
    const definition = { foo: 'bar' };
    mockAbstractCreateOperations.mockReturnValue({});
    mockGetAllOperation.mockReturnValue(jest.fn());
    mockGetOneOperation.mockReturnValue(jest.fn());
    createOperations(firestore, definition);
    expect(mockLoggerInstance.debug).toHaveBeenCalledWith('createOperations', { firestore, definition });
  });

  it('calls Abstract.createOperations, getAllOperation, and getOneOperation with correct params', () => {
    const firestore = { app: {} };
    const definition = { foo: 'baz' };
    const mockOps = { op: true };
    const mockAll = jest.fn();
    const mockOne = jest.fn();
    mockAbstractCreateOperations.mockReturnValue(mockOps);
    mockGetAllOperation.mockReturnValue(mockAll);
    mockGetOneOperation.mockReturnValue(mockOne);
    const result = createOperations(firestore, definition);
    expect(mockAbstractCreateOperations).toHaveBeenCalledWith(firestore, definition);
    expect(mockGetAllOperation).toHaveBeenCalledWith(firestore, definition);
    expect(mockGetOneOperation).toHaveBeenCalledWith(firestore, definition);
    expect(result).toMatchObject({ ...mockOps, all: mockAll, one: mockOne });
  });

  it('returns an operations object with all, one, and spread abstract ops', () => {
    const firestore = { app: {} };
    const definition = { foo: 'qux' };
    const mockOps = { opA: jest.fn(), opB: jest.fn() };
    const mockAll = jest.fn();
    const mockOne = jest.fn();
    mockAbstractCreateOperations.mockReturnValue(mockOps);
    mockGetAllOperation.mockReturnValue(mockAll);
    mockGetOneOperation.mockReturnValue(mockOne);
    const result = createOperations(firestore, definition);
    expect(result.all).toBe(mockAll);
    expect(result.one).toBe(mockOne);
    expect(result.opA).toBe(mockOps.opA);
    expect(result.opB).toBe(mockOps.opB);
  });
});
