import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemTypeArray } from "@fjell/types";
import { Coordinate } from '@fjell/registry';
import { Registry } from '@fjell/lib';

// Mock logger instance
const mockLoggerInstance = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), default: vi.fn() };

// Mock dependencies
const mockCreateDefinition = vi.fn();
const mockCreateOperations = vi.fn();
const mockWrapOperations = vi.fn();

// Mock registry
const mockRegistry: Registry = {
  get: vi.fn(),
  libTree: vi.fn(),
  register: vi.fn(),
} as any;

// Mock firestore
const mockFirestore = {
  app: {},
  collection: vi.fn(),
  doc: vi.fn(),
} as any;

// ESM module mocks
vi.mock('../../src/logger', () => ({
  get: vi.fn(() => mockLoggerInstance),
  __esModule: true,
  default: { get: vi.fn(() => mockLoggerInstance) },
}));

vi.mock('../../src/Definition', () => ({
  createDefinition: mockCreateDefinition,
}));

vi.mock('../../src/contained/Operations', () => ({
  createOperations: mockCreateOperations,
}));

vi.mock('@fjell/lib', async () => {
  const actual = await vi.importActual('@fjell/lib');
  return {
    ...actual,
    Contained: {
      wrapOperations: mockWrapOperations,
    },
  };
});

let createFirestoreLibrary: any;
let FirestoreLibrary: any;

describe('contained/FirestoreLibrary', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.resetModules();
    mockCreateDefinition.mockReset();
    mockCreateOperations.mockReset();
    mockWrapOperations.mockReset();
    mockLoggerInstance.debug.mockReset();

    // Import the module under test
    const mod = await import('../../src/contained/FirestoreLibrary');
    createFirestoreLibrary = mod.createFirestoreLibrary;
    FirestoreLibrary = mod;
  });

  describe('createFirestoreLibrary', () => {
    const defaultKeyTypes: ItemTypeArray<'test', 'location1', 'location2'> = ['test', 'location1', 'location2'];
    const defaultCollectionNames = ['test-collection'];
    const defaultLibOptions = { timeout: 5000 };
    const defaultScopes = ['read', 'write'];

    const mockCoordinate: Coordinate<'test', 'location1', 'location2'> = {
      keyTypes: defaultKeyTypes,
      scopes: defaultScopes,
    } as any;

    const mockDefinition = {
      coordinate: mockCoordinate,
      options: defaultLibOptions,
      collectionNames: defaultCollectionNames,
    };

    const mockOperations = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    };

    const mockWrappedOperations = {
      ...mockOperations,
      all: vi.fn(),
      one: vi.fn(),
    };

    beforeEach(() => {
      mockCreateDefinition.mockReturnValue(mockDefinition);
      mockCreateOperations.mockReturnValue(mockOperations);
      mockWrapOperations.mockReturnValue(mockWrappedOperations);
    });

    it('should call logger.debug with correct parameters', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockLoggerInstance.default).toHaveBeenCalledWith('createFirestoreLibrary', {
        keyTypes: defaultKeyTypes,
        collectionNames: defaultCollectionNames,
        firestore: mockFirestore,
        libOptions: defaultLibOptions,
        scopes: defaultScopes,
      });
    });

    it('should call createDefinition with correct parameters', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        defaultScopes,
        defaultCollectionNames,
        defaultLibOptions
      );
    });

    it('should call createOperations with correct parameters', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateOperations).toHaveBeenCalledWith(
        mockFirestore,
        mockDefinition,
        mockRegistry
      );
    });

    it('should call Contained.wrapOperations with correct parameters', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockWrapOperations).toHaveBeenCalledWith(
        mockOperations,
        defaultLibOptions,
        mockCoordinate,
        mockRegistry
      );
    });

    it('should return a FirestoreLibrary with correct structure', () => {
      const result = createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(result).toEqual({
        coordinate: mockCoordinate,
        operations: mockWrappedOperations,
        options: defaultLibOptions,
        firestore: mockFirestore,
        registry: mockRegistry,
      });
    });

    it('should handle empty libOptions by using empty object', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        {},
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        defaultScopes,
        defaultCollectionNames,
        {}
      );
    });

    it('should handle null libOptions by using empty object', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        null,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        defaultScopes,
        defaultCollectionNames,
        {}
      );
    });

    it('should handle default scopes parameter', () => {
      // Test without passing scopes parameter to verify default behavior
      const result = createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        null,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        [],
        defaultCollectionNames,
        defaultLibOptions
      );
      expect(result).toBeDefined();
    });

    it('should handle empty scopes array', () => {
      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        [],
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        [],
        defaultCollectionNames,
        defaultLibOptions
      );
    });

    it('should work with minimal parameters', () => {
      const result = createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        {},
        [],
        mockRegistry
      );

      expect(result).toBeDefined();
      expect(result.coordinate).toBe(mockCoordinate);
      expect(result.operations).toBe(mockWrappedOperations);
      expect(result.firestore).toBe(mockFirestore);
      expect(result.registry).toBe(mockRegistry);
    });

    it('should work with single-level key types', () => {
      const singleKeyTypes: ItemTypeArray<'item'> = ['item'];

      createFirestoreLibrary(
        singleKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        singleKeyTypes,
        defaultScopes,
        defaultCollectionNames,
        defaultLibOptions
      );
    });

    it('should work with complex key types (5 levels)', () => {
      const complexKeyTypes: ItemTypeArray<'item', 'l1', 'l2', 'l3', 'l4', 'l5'> =
        ['item', 'l1', 'l2', 'l3', 'l4', 'l5'];

      createFirestoreLibrary(
        complexKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        complexKeyTypes,
        defaultScopes,
        defaultCollectionNames,
        defaultLibOptions
      );
    });

    it('should work with multiple collection names', () => {
      const multipleCollections = ['collection1', 'collection2', 'collection3'];

      createFirestoreLibrary(
        defaultKeyTypes,
        multipleCollections,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        defaultScopes,
        multipleCollections,
        defaultLibOptions
      );
    });

    it('should work with complex libOptions', () => {
      const complexOptions = {
        timeout: 10000,
        retries: 3,
        caching: true,
        validation: { strict: true },
      };

      createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        complexOptions,
        defaultScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        defaultKeyTypes,
        defaultScopes,
        defaultCollectionNames,
        complexOptions
      );
    });

    it('should preserve all properties from wrapped operations', () => {
      const extendedWrappedOperations = {
        ...mockWrappedOperations,
        customOperation: vi.fn(),
        anotherOperation: vi.fn(),
      };

      mockWrapOperations.mockReturnValue(extendedWrappedOperations);

      const result = createFirestoreLibrary(
        defaultKeyTypes,
        defaultCollectionNames,
        mockFirestore,
        defaultLibOptions,
        defaultScopes,
        mockRegistry
      );

      expect(result.operations).toBe(extendedWrappedOperations);
      expect(result.operations.customOperation).toBeDefined();
      expect(result.operations.anotherOperation).toBeDefined();
    });
  });

  describe('FirestoreLibrary interface compliance', () => {
    it('should export createFirestoreLibrary function', () => {
      expect(typeof createFirestoreLibrary).toBe('function');
    });

    it('should have FirestoreLibrary interface available', () => {
      expect(FirestoreLibrary).toBeDefined();
      expect(FirestoreLibrary.createFirestoreLibrary).toBe(createFirestoreLibrary);
    });
  });
});
