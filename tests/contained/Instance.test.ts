import { jest } from '@jest/globals';

// Mock logger instance
const mockLoggerInstance = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };

// Mocked dependency functions
const mockCreateDefinition = jest.fn();
const mockCreateOperations = jest.fn();
const mockWrapOperations = jest.fn((ops: any, def: any) => ({ wrapped: ops, def }));

// ESM module mocks
jest.unstable_mockModule('@/logger', () => ({
  get: jest.fn(() => mockLoggerInstance),
  __esModule: true,
  default: { get: jest.fn(() => mockLoggerInstance) },
}));
jest.unstable_mockModule('@/Definition', () => ({ createDefinition: mockCreateDefinition }));
jest.unstable_mockModule('@/Operations', () => ({ createOperations: mockCreateOperations }));
jest.unstable_mockModule('@fjell/lib', () => ({
  Contained: { wrapOperations: mockWrapOperations },
}));

let createInstance: (...args: any[]) => any;

describe('contained/Instance createInstance', () => {
  beforeEach(async () => {
    jest.resetModules();
    mockCreateDefinition.mockReset();
    mockCreateOperations.mockReset();
    mockWrapOperations.mockReset();
    mockLoggerInstance.debug.mockReset();
    const mod = await import('../../src/contained/Instance');
    createInstance = mod.createInstance;
  });

  it('creates an instance with definition, operations, and firestore', () => {
    const keyTypes = ['typeA'];
    const collectionNames = ['colA'];
    const firestore = { app: {} };
    const libOptions = { opt: 1 };
    const scopes = ['scope1'];
    const mockDef = { keyTypes, scopes, collectionNames, coordinate: { kta: [] } };
    const mockOps = { op: true };
    mockCreateDefinition.mockReturnValue(mockDef);
    mockCreateOperations.mockReturnValue(mockOps);
    mockWrapOperations.mockImplementation((ops, def) => ({ wrapped: ops, def }));

    const result = createInstance(keyTypes, collectionNames, firestore, libOptions, scopes);
    expect(result).toHaveProperty('definition', mockDef);
    expect(result).toHaveProperty('operations');
    expect(result.operations).toMatchObject({ wrapped: expect.objectContaining({ op: true }), def: mockDef });
    expect(result).toHaveProperty('firestore', firestore);
  });

  it('calls logger.debug with correct args', () => {
    const keyTypes = ['typeB'];
    const collectionNames = ['colB'];
    const firestore = { app: {} };
    const libOptions = { foo: 'bar' };
    const scopes = ['scope2'];
    mockCreateDefinition.mockReturnValue({ coordinate: { kta: [] } });
    mockCreateOperations.mockReturnValue({});
    createInstance(keyTypes, collectionNames, firestore, libOptions, scopes);
    expect(mockLoggerInstance.debug).toHaveBeenCalledWith('createInstance', {
      keyTypes,
      collectionNames,
      firestore,
      libOptions,
      scopes,
    });
  });

  it('calls createDefinition and createOperations with correct params', () => {
    const keyTypes = ['typeC'];
    const collectionNames = ['colC'];
    const firestore = { app: {} };
    const libOptions = { baz: 2 };
    const scopes = ['scope3'];
    const mockDef = { keyTypes, scopes, collectionNames, coordinate: { kta: [] } };
    mockCreateDefinition.mockReturnValue(mockDef);
    mockCreateOperations.mockReturnValue({});
    createInstance(keyTypes, collectionNames, firestore, libOptions, scopes);
    expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, collectionNames, libOptions);
    expect(mockCreateOperations).toHaveBeenCalledWith(firestore, mockDef);
  });

  it('calls Contained.wrapOperations with correct params', () => {
    const keyTypes = ['typeD'];
    const collectionNames = ['colD'];
    const firestore = { app: {} };
    const libOptions = { foo: 'bar' };
    const scopes = ['scope4'];
    const mockDef = { keyTypes, scopes, collectionNames, coordinate: { kta: [] } };
    const mockOps = { op: true };
    mockCreateDefinition.mockReturnValue(mockDef);
    mockCreateOperations.mockReturnValue(mockOps);
    createInstance(keyTypes, collectionNames, firestore, libOptions, scopes);
    expect(mockWrapOperations).toHaveBeenCalledWith(
      expect.objectContaining({ op: true }),
      mockDef
    );
  });

  it('uses default libOptions and scopes if not provided', () => {
    const keyTypes = ['typeE'];
    const collectionNames = ['colE'];
    const firestore = { app: {} };
    mockCreateDefinition.mockReturnValue({ coordinate: { kta: [] } });
    mockCreateOperations.mockReturnValue({});
    createInstance(keyTypes, collectionNames, firestore);
    expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, [], collectionNames, {});
  });
});
