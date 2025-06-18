import type { Registry } from '@fjell/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger instance
const mockLoggerInstance = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

// Mocked dependency functions
const mockCreateDefinition = vi.fn();
const mockCreateOperations = vi.fn();
const mockWrapOperations = vi.fn((ops: any, def: any) => ({ wrapped: ops, def }));

// Mock registry
const mockRegistry = {
  get: vi.fn(),
  libTree: vi.fn() as unknown as Registry['libTree'],
  register: vi.fn(),
} as Registry;

// ESM module mocks
vi.mock('@/logger', () => ({
  get: vi.fn(() => mockLoggerInstance),
  __esModule: true,
  default: { get: vi.fn(() => mockLoggerInstance) },
}));
vi.mock('@/Definition', () => ({ createDefinition: mockCreateDefinition }));
vi.mock('@/Operations', () => ({ createOperations: mockCreateOperations }));
vi.mock('@fjell/lib', () => ({
  Contained: { wrapOperations: mockWrapOperations },
}));

let createInstance: (...args: any[]) => any;

describe('contained/Instance createInstance', () => {
  beforeEach(async () => {
    vi.resetModules();
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

    const result = createInstance(keyTypes, collectionNames, firestore, libOptions, scopes, mockRegistry);
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
    createInstance(keyTypes, collectionNames, firestore, libOptions, scopes, mockRegistry);
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
    createInstance(keyTypes, collectionNames, firestore, libOptions, scopes, mockRegistry);
    expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, scopes, collectionNames, libOptions);
    expect(mockCreateOperations).toHaveBeenCalledWith(firestore, mockDef, mockRegistry);
  });

  it('calls Contained.wrapOperations with correct params', () => {
    const keyTypes = ['typeD'] as [string];
    const collectionNames = ['colD'];
    const firestore = { app: {} };
    const libOptions = { opt: 1 };
    const scopes = ['scope4'];
    const mockDef = {
      collectionNames,
      coordinate: { kta: keyTypes, scopes: ['firestore', ...scopes], toString: () => '' },
      options: { opt: 1, hooks: { preCreate: () => { }, preUpdate: () => { } } }
    };
    const mockOps = { op: true };
    mockCreateDefinition.mockReturnValue(mockDef);
    mockCreateOperations.mockReturnValue(mockOps);
    mockWrapOperations.mockImplementation((ops, def) => ({ wrapped: ops, def }));

    createInstance(keyTypes, collectionNames, firestore, libOptions, scopes, mockRegistry);

    expect(mockWrapOperations).toHaveBeenCalledWith(
      expect.objectContaining({
        op: true,
        all: expect.any(Function),
        one: expect.any(Function)
      }),
      mockDef,
      mockRegistry
    );
  });

  it('uses default libOptions and scopes if not provided', () => {
    const keyTypes = ['typeE'];
    const collectionNames = ['colE'];
    const firestore = { app: {} };
    mockCreateDefinition.mockReturnValue({ coordinate: { kta: [] } });
    mockCreateOperations.mockReturnValue({});
    createInstance(keyTypes, collectionNames, firestore, null, null, mockRegistry);
    expect(mockCreateDefinition).toHaveBeenCalledWith(keyTypes, [], collectionNames, {});
  });
});
