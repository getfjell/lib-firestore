import { ItemTypeArray } from '@fjell/core';
// import LibLogger from '@/logger'; // Removed as no longer directly used in tests
import { jest } from '@jest/globals';
import type { Options } from '@fjell/lib';

// Define a stable mock logger instance
const mockLoggerInstance = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock logger to consistently return the same mock instance
jest.mock('@/logger', () => ({
  get: jest.fn().mockReturnValue(mockLoggerInstance),
}));

// Define top-level mocks for createDefinition and createOperations
const mockCreateDefinition = jest.fn();
const mockCreateOperations = jest.fn();

// Define a holder for @fjell/lib mock functions
const fjellLibMocks = {
  wrapOperations: jest.fn((ops) => ops),
};

// Use unstable_mockModule to mock Definition and Operations modules
jest.unstable_mockModule('@/Definition', () => ({
  createDefinition: mockCreateDefinition,
}));

jest.unstable_mockModule('@/Operations', () => ({
  createOperations: mockCreateOperations,
}));

// Update @fjell/lib mock to use the externally defined mock function
jest.mock('@fjell/lib', () => ({
  wrapOperations: fjellLibMocks.wrapOperations,
}));

// let Definition: any; // Removed
// let Operations: any; // Removed
let createInstance: (...args: any[]) => any;

describe('Instance', () => {
  beforeEach(async () => {
    jest.resetModules();

    const instanceModule = await import('@/Instance');
    createInstance = instanceModule.createInstance;

    jest.clearAllMocks();

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
      // jest.clearAllMocks(); // This might be redundant if the outer one is sufficient.

      mockFirestore = { app: {} };
      mockKeyTypes = ['ITEM_TYPE'] as any;
      mockCollectionNames = ['collection1'];
      mockLibOptions = { someOption: true } as any;
      mockScopes = ['scope1'];

      // Set mock return values using global mock functions
      const mockDefReturn = { keyTypes: mockKeyTypes, scopes: mockScopes, collectionNames: mockCollectionNames };
      mockCreateDefinition.mockReturnValue(mockDefReturn);
      mockCreateOperations.mockReturnValue({ someOperation: jest.fn() });
      // fjellLibMocks.wrapOperations is already jest.fn((ops) => ops), can be overridden if needed
      // mockLoggerInstance.debug is jest.fn(), no specific return value needed for it to be called
    });

    it('should create an instance with definition, operations, and firestore', () => {
      const instance = createInstance(
        mockKeyTypes,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        mockScopes
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
        mockScopes
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
        mockScopes
      );

      expect(mockCreateOperations).toHaveBeenCalledTimes(1); // Use global mock
      expect(mockCreateOperations).toHaveBeenCalledWith(mockFirestore, mockDef); // Use global mock
    });

    it('should use default libOptions and scopes if not provided', () => {
      createInstance(mockKeyTypes, mockCollectionNames, mockFirestore);

      expect(mockCreateDefinition).toHaveBeenCalledWith( // Use global mock
        mockKeyTypes,
        [], // Default scopes
        mockCollectionNames,
        {} // Default libOptions
      );
    });

  });
});
