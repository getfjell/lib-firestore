import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLoggerInstance = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const mockCreateDefinition = vi.fn();
const mockCreateOperations = vi.fn();
const mockWrapOperations = vi.fn((ops) => ops);

// Use unstable_mockModule for ESM mocking
vi.mock('@/logger', () => ({
  get: vi.fn(() => mockLoggerInstance),
  __esModule: true,
  default: { get: vi.fn(() => mockLoggerInstance) }
}));
vi.mock('@/Definition', () => ({ createDefinition: mockCreateDefinition }));
vi.mock('@/Operations', () => ({ createOperations: mockCreateOperations }));
vi.mock('@fjell/lib', () => ({ Primary: { wrapOperations: mockWrapOperations } }));

// Import after mocks
let createInstance: any;

describe('primary/Instance createInstance', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockCreateDefinition.mockReset();
    mockCreateOperations.mockReset();
    mockWrapOperations.mockReset();
    mockLoggerInstance.debug.mockReset();
    const mod = await import('../../src/primary/Instance');
    createInstance = mod.createInstance;
  });

  it('creates an instance with definition, operations, and firestore', () => {
    const keyType = 'typeA';
    const collectionName = 'colA';
    const firestore = { app: {} };
    const libOptions = { opt: 1 };
    const scopes = ['scope1'];
    const mockDef = {
      collectionNames: [collectionName],
      coordinate: { kta: [keyType], scopes: ['firestore', ...scopes], toString: () => '' },
      options: { opt: 1, hooks: { preCreate: () => { }, preUpdate: () => { } } }
    };
    const mockOps = { op: true };
    mockCreateDefinition.mockReturnValue(mockDef);
    mockCreateOperations.mockReturnValue(mockOps);
    mockWrapOperations.mockImplementation((ops) => ({ wrapped: ops }));

    const result = createInstance(keyType, collectionName, firestore, libOptions, scopes);
    expect(result.definition).toMatchObject({
      collectionNames: [collectionName],
      coordinate: { kta: [keyType], scopes: ['firestore', ...scopes] },
      options: expect.objectContaining({ opt: 1 }),
    });
    expect(result).toHaveProperty('operations');
    expect(result.operations).toEqual(expect.any(Object));
    expect(result).toHaveProperty('firestore', firestore);
  });

  it('calls logger.debug with correct args', () => {
    const keyType = 'typeB';
    const collectionName = 'colB';
    const firestore = { app: {} };
    const libOptions = { foo: 'bar' };
    const scopes = ['scope2'];
    mockCreateDefinition.mockReturnValue({});
    mockCreateOperations.mockReturnValue({});
    createInstance(keyType, collectionName, firestore, libOptions, scopes);
    expect(mockLoggerInstance.debug).toHaveBeenCalledWith('createInstance', {
      keyType,
      collectionName,
      libOptions,
      scopes,
    });
  });

  it('calls createDefinition and createOperations with correct params', () => {
    const keyType = 'typeC';
    const collectionName = 'colC';
    const firestore = { app: {} };
    const libOptions = { baz: 2 };
    const scopes = ['scope3'];
    const mockDef = {
      collectionNames: [collectionName],
      coordinate: { kta: [keyType], scopes: ['firestore', ...scopes], toString: () => '' },
      options: { opt: 1, hooks: { preCreate: () => { }, preUpdate: () => { } } }
    };
    mockCreateDefinition.mockReturnValue(mockDef);
    mockCreateOperations.mockReturnValue({});
    createInstance(keyType, collectionName, firestore, libOptions, scopes);
    expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], scopes, [collectionName], libOptions);
    expect(mockCreateOperations).toHaveBeenCalledWith(firestore, mockDef);
  });

  it('uses default libOptions and scopes if not provided', () => {
    const keyType = 'typeD';
    const collectionName = 'colD';
    const firestore = { app: {} };
    mockCreateDefinition.mockReturnValue({});
    mockCreateOperations.mockReturnValue({});
    createInstance(keyType, collectionName, firestore);
    expect(mockCreateDefinition).toHaveBeenCalledWith([keyType], [], [collectionName], {});
  });
});
