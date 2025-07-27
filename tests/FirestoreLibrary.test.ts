import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dependencies
vi.mock('@/logger', () => ({
  default: {
    get: vi.fn().mockReturnValue({ debug: vi.fn() }),
  },
}));

vi.mock('@/Definition', () => ({
  createDefinition: vi.fn(),
}));

vi.mock('@/Operations', () => ({
  createOperations: vi.fn(),
}));

import {
  createFirestoreLibrary,
  createFirestoreLibraryFromComponents
} from '@/FirestoreLibrary';
import { createDefinition } from '@/Definition';
import { createOperations } from '@/Operations';

// Get references to the mocked functions
const mockCreateDefinition = vi.mocked(createDefinition);
const mockCreateOperations = vi.mocked(createOperations);

describe('FirestoreLibrary', () => {
  let mockRegistry: any;
  let mockFirestore: any;
  let mockCoordinate: any;
  let mockOperations: any;
  let mockOptions: any;
  let mockKta: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      register: vi.fn(),
      libTree: vi.fn(),
      get: vi.fn(),
    };

    mockFirestore = {
      collection: vi.fn(),
      doc: vi.fn(),
      batch: vi.fn(),
    };

    mockCoordinate = {
      keyType: 'test',
      locations: ['location1', 'location2'],
    };

    mockOperations = {
      all: vi.fn(),
      one: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      get: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
    };

    mockOptions = {};
    mockKta = ['test', 'location1', 'location2'];
  });

  describe('createFirestoreLibraryFromComponents', () => {
    it('should create a FirestoreLibrary with provided components', () => {
      const result = createFirestoreLibraryFromComponents(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );

      expect(result).toEqual({
        registry: mockRegistry,
        coordinate: mockCoordinate,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      });
    });

    it('should return a library with all required properties', () => {
      const result = createFirestoreLibraryFromComponents(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );

      expect(result).toHaveProperty('registry');
      expect(result).toHaveProperty('coordinate');
      expect(result).toHaveProperty('firestore');
      expect(result).toHaveProperty('operations');
      expect(result).toHaveProperty('options');
      expect(result.firestore).toBe(mockFirestore);
    });
  });

  describe('createFirestoreLibrary', () => {
    const mockCollectionNames = ['collection1', 'collection2'];
    const mockScopes = ['scope1', 'scope2'];
    const mockLibOptions = {};

    beforeEach(() => {
      const mockDefinition = {
        coordinate: mockCoordinate,
        options: mockOptions,
        collectionNames: mockCollectionNames,
      };

      mockCreateDefinition.mockReturnValue(mockDefinition);
      mockCreateOperations.mockReturnValue(mockOperations);
    });

    it('should create a FirestoreLibrary with all parameters provided', () => {
      const result = createFirestoreLibrary(
        mockKta,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        mockScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        mockKta,
        mockScopes,
        mockCollectionNames,
        mockLibOptions
      );

      expect(mockCreateOperations).toHaveBeenCalledWith(
        mockFirestore,
        expect.objectContaining({
          coordinate: mockCoordinate,
          options: mockOptions,
          collectionNames: mockCollectionNames,
        }),
        mockRegistry
      );

      expect(result).toEqual({
        registry: mockRegistry,
        coordinate: mockCoordinate,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      });
    });

    it('should handle null scopes by converting to empty array', () => {
      createFirestoreLibrary(
        mockKta,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        null,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        mockKta,
        [],
        mockCollectionNames,
        mockLibOptions
      );
    });

    it('should handle default scopes parameter', () => {
      createFirestoreLibrary(
        mockKta,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        mockKta,
        [],
        mockCollectionNames,
        mockLibOptions
      );
    });

    it('should handle null libOptions by converting to empty object', () => {
      createFirestoreLibrary(
        mockKta,
        mockCollectionNames,
        mockFirestore,
        null,
        mockScopes,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        mockKta,
        mockScopes,
        mockCollectionNames,
        {}
      );
    });

    it('should work with minimal parameters', () => {
      const result = createFirestoreLibrary(
        mockKta,
        mockCollectionNames,
        mockFirestore,
        null,
        null,
        mockRegistry
      );

      expect(mockCreateDefinition).toHaveBeenCalledWith(
        mockKta,
        [],
        mockCollectionNames,
        {}
      );

      expect(result).toEqual({
        registry: mockRegistry,
        coordinate: mockCoordinate,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      });
    });

    it('should pass the created definition to createOperations', () => {
      const mockDefinition = {
        coordinate: mockCoordinate,
        options: mockOptions,
        collectionNames: mockCollectionNames,
      };
      mockCreateDefinition.mockReturnValue(mockDefinition);

      createFirestoreLibrary(
        mockKta,
        mockCollectionNames,
        mockFirestore,
        mockLibOptions,
        mockScopes,
        mockRegistry
      );

      expect(mockCreateOperations).toHaveBeenCalledWith(
        mockFirestore,
        mockDefinition,
        mockRegistry
      );
    });
  });

  describe('FirestoreLibrary interface', () => {
    it('should extend Library interface and include firestore property', () => {
      const library = createFirestoreLibraryFromComponents(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );

      expect(library.firestore).toBe(mockFirestore);
      expect(library.registry).toBe(mockRegistry);
      expect(library.coordinate).toBe(mockCoordinate);
      expect(library.operations).toBe(mockOperations);
      expect(library.options).toBe(mockOptions);
    });
  });
});
