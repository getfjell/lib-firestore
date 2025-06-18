import { ItemTypeArray } from '@fjell/core';
// import LibLogger from '@/logger'; // Removed as no longer directly used in tests
import type { Options, Registry } from '@fjell/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define top-level mocks for createDefinition and createOperations
const mockCreateDefinition = vi.fn();
const mockCreateOperations = vi.fn();

// Define a holder for @fjell/lib mock functions
const fjellLibMocks = {
  wrapOperations: vi.fn((ops) => ops),
};

// Mock registry
const mockRegistry = {
  get: vi.fn(),
  libTree: vi.fn() as unknown as Registry['libTree'],
  register: vi.fn(),
} as Registry;

// Use unstable_mockModule to mock Definition and Operations modules
vi.mock('@/Definition', () => ({
  createDefinition: mockCreateDefinition,
}));

vi.mock('@/Operations', () => ({
  createOperations: mockCreateOperations,
}));

// Update @fjell/lib mock to use the externally defined mock function
vi.mock('@fjell/lib', () => ({
  wrapOperations: fjellLibMocks.wrapOperations,
}));

// let Definition: any; // Removed
// let Operations: any; // Removed
let createInstance: (...args: any[]) => any;

describe('Instance', () => {
  beforeEach(async () => {
    vi.resetModules();

    const instanceModule = await import('@/Instance');
    createInstance = instanceModule.createInstance;

    vi.clearAllMocks();

    // Definition = await import('@/Definition'); // Removed
    // Operations = await import('@/Operations'); // Removed
  });

  describe('createInstance', () => {
    let mockFirestore: any;
    let mockKeyTypes: ItemTypeArray<any, any, any, any, any, any>;
    let mockCollectionNames: string[];
    let mockLibOptions: Options<any, any, any, any, any, any, any>;
    let mockScopes: string[];

    beforeEach(() => {
      // Reset mocks state again (specifically for mock call arguments if testing multiple scenarios in one it block, though clearAllMocks above mostly handles it)
      // vi.clearAllMocks(); // This might be redundant if the outer one is sufficient.

      mockFirestore = { app: {} };
      mockKeyTypes = ['ITEM_TYPE'] as any;
      mockCollectionNames = ['collection1'];
      mockLibOptions = { someOption: true } as any;
      mockScopes = ['scope1'];

      // Set mock return values using global mock functions
      const mockDefReturn = { keyTypes: mockKeyTypes, scopes: mockScopes, collectionNames: mockCollectionNames };
      mockCreateDefinition.mockReturnValue(mockDefReturn);
      mockCreateOperations.mockReturnValue({ someOperation: vi.fn() });
      // fjellLibMocks.wrapOperations is already vi.fn((ops) => ops), can be overridden if needed
      // mockLoggerInstance.debug is vi.fn(), no specific return value needed for it to be called
    });

    it('should create an instance with definition, operations, and firestore', () => {
      const instance = createInstance(
        mockKeyTypes,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        mockScopes,
        mockRegistry
      );

      expect(instance).toHaveProperty('definition');
      expect(instance).toHaveProperty('operations');
      expect(instance).toHaveProperty('firestore');
      expect(instance.firestore).toBe(mockFirestore);
    });

    it('should call createDefinition with correct parameters', () => {
      createInstance(
        mockKeyTypes,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        mockScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledTimes(1); // Use global mock
      expect(mockCreateDefinition).toHaveBeenCalledWith( // Use global mock
        mockKeyTypes,
        mockScopes,
        mockCollectionNames,
        mockLibOptions
      );
    });

    it('should call createOperations with correct parameters', () => {
      const mockDef = { keyTypes: mockKeyTypes, scopes: mockScopes, collectionNames: mockCollectionNames };
      mockCreateDefinition.mockReturnValue(mockDef); // Use global mock

      createInstance(
        mockKeyTypes,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        mockScopes,
        mockRegistry
      );

      expect(mockCreateOperations).toHaveBeenCalledTimes(1); // Use global mock
      expect(mockCreateOperations).toHaveBeenCalledWith(mockFirestore, mockDef, mockRegistry); // Use global mock
    });

    it('should use default libOptions and scopes if not provided', () => {
      createInstance(mockKeyTypes, mockCollectionNames, mockFirestore, null, null, mockRegistry);

      expect(mockCreateDefinition).toHaveBeenCalledWith( // Use global mock
        mockKeyTypes,
        [], // Default scopes
        mockCollectionNames,
        {} // Default libOptions
      );
    });

  });
});
