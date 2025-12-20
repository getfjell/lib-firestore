import { Item } from "@fjell/types";
import { Coordinate, RegistryHub } from '@fjell/registry';
import * as Library from '@fjell/lib';
import { Registry } from '@fjell/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define a mock item type for testing
interface MockItem extends Item<'mockType', 'l1', 'l2', 'l3', 'l4', 'l5'> {
  id: string;
  name: string;
  itemType: 'mockType';
}

// Mock the dependencies
const mockCreateFirestoreLibraryFromComponents = vi.fn();
const mockLoggerGet = vi.fn();
const mockLoggerDebug = vi.fn();

// Mock Firebase Firestore
const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  batch: vi.fn(),
} as unknown as FirebaseFirestore.Firestore;

// Mock Registry
const mockRegistry = {
  register: vi.fn(),
  get: vi.fn(),
  libTree: vi.fn(),
} as unknown as Registry;

// Mock RegistryHub
const mockRegistryHub = {
  register: vi.fn(),
  get: vi.fn(),
} as unknown as RegistryHub;

// Mock Coordinate
const mockCoordinate: Coordinate<'mockType', 'l1', 'l2', 'l3', 'l4', 'l5'> = {
  kta: ['mockType', 'l1', 'l2', 'l3', 'l4', 'l5'],
  scopes: ['firestore'],
};

// Mock Operations
const mockOperations: Library.Operations<MockItem, 'mockType', 'l1', 'l2', 'l3', 'l4', 'l5'> = {
  get: vi.fn(),
  all: vi.fn(),
  one: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  find: vi.fn(),
} as any;

// Mock Options
const mockOptions = {
  itemType: 'mockType',
  searchableFields: ['name'],
} as any;

// Mock the logger module
vi.mock('../src/logger', () => ({
  default: {
    get: mockLoggerGet,
  },
}));

// Mock the FirestoreLibrary module
vi.mock('../src/FirestoreLibrary', () => ({
  createFirestoreLibraryFromComponents: mockCreateFirestoreLibraryFromComponents,
}));

describe('FirestoreLibraryFactory', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Setup logger mock to return an object with debug method
    mockLoggerGet.mockReturnValue({
      debug: mockLoggerDebug,
      default: mockLoggerDebug,
    });

    // Setup default return value for createFirestoreLibraryFromComponents
    mockCreateFirestoreLibraryFromComponents.mockReturnValue({
      registry: mockRegistry,
      coordinate: mockCoordinate,
      firestore: mockFirestore,
      operations: mockOperations,
      options: mockOptions,
    });
  });

  describe('createFirestoreLibraryFactory', () => {
    it('should create and return a factory function', async () => {
      // Import the function after mocks are set up
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      expect(factory).toBeTypeOf('function');
      expect(mockLoggerGet).toHaveBeenCalledWith('FirestoreLibraryFactory');
    });

    it('should return a function that creates firestore library instances', async () => {
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      const context = {
        registry: mockRegistry,
        registryHub: mockRegistryHub,
      };

      const result = factory(mockCoordinate, context);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Creating firestore library',
        {
          coordinate: mockCoordinate,
          registry: mockRegistry,
          firestore: mockFirestore,
          operations: mockOperations,
          options: mockOptions,
        }
      );

      expect(mockCreateFirestoreLibraryFromComponents).toHaveBeenCalledWith(
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

    it('should work with context that only has registry (no registryHub)', async () => {
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      const context = {
        registry: mockRegistry,
      };

      const result = factory(mockCoordinate, context);

      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Creating firestore library',
        {
          coordinate: mockCoordinate,
          registry: mockRegistry,
          firestore: mockFirestore,
          operations: mockOperations,
          options: mockOptions,
        }
      );

      expect(mockCreateFirestoreLibraryFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );

      expect(result).toBeDefined();
    });

    it('should handle different coordinate types', async () => {
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const simpleCoordinate: Coordinate<'simpleType'> = {
        kta: ['simpleType'],
        scopes: ['firestore'],
      };

      const simpleOperations: Library.Operations<any, 'simpleType'> = {
        get: vi.fn(),
        all: vi.fn(),
        one: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        find: vi.fn(),
      } as any;

      const simpleOptions = {
        itemType: 'simpleType',
      } as any;

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        simpleOperations,
        simpleOptions
      );

      const context = {
        registry: mockRegistry,
      };

      factory(simpleCoordinate, context);

      expect(mockCreateFirestoreLibraryFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        simpleCoordinate,
        mockFirestore,
        simpleOperations,
        simpleOptions
      );
    });

    it('should log debug information when factory function is called', async () => {
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      const context = {
        registry: mockRegistry,
        registryHub: mockRegistryHub,
      };

      factory(mockCoordinate, context);

      expect(mockLoggerDebug).toHaveBeenCalledTimes(1);
      expect(mockLoggerDebug).toHaveBeenCalledWith(
        'Creating firestore library',
        expect.objectContaining({
          coordinate: mockCoordinate,
          registry: mockRegistry,
          firestore: mockFirestore,
          operations: mockOperations,
          options: mockOptions,
        })
      );
    });

    it('should return the exact result from createFirestoreLibraryFromComponents', async () => {
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const expectedResult = {
        custom: 'library-result',
        registry: mockRegistry,
        coordinate: mockCoordinate,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      };

      mockCreateFirestoreLibraryFromComponents.mockReturnValue(expectedResult);

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      const context = {
        registry: mockRegistry,
      };

      const result = factory(mockCoordinate, context);

      expect(result).toBe(expectedResult);
    });

    it('should work with null registryHub in context', async () => {
      const { createFirestoreLibraryFactory } = await import('../src/FirestoreLibraryFactory');

      const factory = createFirestoreLibraryFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      const context = {
        registry: mockRegistry,
      };

      const result = factory(mockCoordinate, context);

      expect(mockCreateFirestoreLibraryFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );

      expect(result).toBeDefined();
    });
  });
});
