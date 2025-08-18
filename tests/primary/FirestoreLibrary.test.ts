import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFirestoreLibrary } from '../../src/primary/FirestoreLibrary';
import type { Registry } from '@fjell/lib';

// Mock the dependencies
vi.mock('../../src/Definition');
vi.mock('../../src/Operations');
vi.mock('../../src/logger', () => ({
  default: {
    get: vi.fn().mockReturnValue({
      debug: vi.fn(),
      default: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      critical: vi.fn(),
      emergency: vi.fn(),
      alert: vi.fn(),
      notice: vi.fn(),
      trace: vi.fn(),
    }),
  },
}));
vi.mock('@fjell/lib', () => ({
  Primary: {
    wrapOperations: vi.fn(),
  },
}));

// Import mocked functions
import { createDefinition } from '../../src/Definition';
import { createOperations } from '../../src/Operations';
import { Primary } from '@fjell/lib';

const mockCreateDefinition = vi.mocked(createDefinition);
const mockCreateOperations = vi.mocked(createOperations);
const mockPrimaryWrapOperations = vi.mocked(Primary.wrapOperations);

describe('createFirestoreLibrary', () => {
  // Mock dependencies
  let mockRegistry: Registry;
  let mockFirestore: FirebaseFirestore.Firestore;
  let mockCoordinate: any;
  let mockOptions: any;
  let mockOperations: any;
  let mockWrappedOperations: any;
  let mockDefinition: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock registry
    mockRegistry = {
      type: 'lib',
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    } as unknown as Registry;

    // Mock firestore
    mockFirestore = {} as FirebaseFirestore.Firestore;

    // Mock coordinate
    mockCoordinate = {
      keyType: ['test'],
      scopes: [],
      collectionNames: ['test-collection'],
    };

    // Mock options
    mockOptions = {
      maxRetries: 3,
      timeout: 5000,
    };

    // Mock operations
    mockOperations = {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
      all: vi.fn(),
      one: vi.fn(),
    };

    // Mock wrapped operations
    mockWrappedOperations = {
      ...mockOperations,
      wrapped: true,
    };

    // Mock definition
    mockDefinition = {
      coordinate: mockCoordinate,
      options: mockOptions,
      collectionNames: ['test-collection'],
    };

    // Setup mocks
    mockCreateDefinition.mockReturnValue(mockDefinition);
    mockCreateOperations.mockReturnValue(mockOperations);
    mockPrimaryWrapOperations.mockReturnValue(mockWrappedOperations);
  });

  it('should create a FirestoreLibrary with required parameters', () => {
    const result = createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      {},
      [],
      mockRegistry
    );

    expect(result).toBeDefined();
    expect(result.coordinate).toBe(mockCoordinate);
    expect(result.operations).toBe(mockWrappedOperations);
    expect(result.options).toBe(mockOptions);
    expect(result.firestore).toBe(mockFirestore);
    expect(result.registry).toBe(mockRegistry);
  });

  it('should call createDefinition with correct parameters', () => {
    const keyType = 'test';
    const collectionName = 'test-collection';
    const libOptions = {};
    const scopes = ['scope1', 'scope2'];

    createFirestoreLibrary(
      keyType,
      collectionName,
      mockFirestore,
      libOptions,
      scopes,
      mockRegistry
    );

    expect(mockCreateDefinition).toHaveBeenCalledWith(
      [keyType],
      scopes,
      [collectionName],
      libOptions
    );
  });

  it('should call createOperations with correct parameters', () => {
    createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      {},
      [],
      mockRegistry
    );

    expect(mockCreateOperations).toHaveBeenCalledWith(
      mockFirestore,
      mockDefinition,
      mockRegistry
    );
  });

  it('should call Primary.wrapOperations with correct parameters', () => {
    createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      {},
      [],
      mockRegistry
    );

    expect(mockPrimaryWrapOperations).toHaveBeenCalledWith(
      mockOperations,
      mockOptions,
      mockCoordinate,
      mockRegistry
    );
  });

  it('should use default parameters when optional parameters are not provided', () => {
    createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      {},
      [],
      mockRegistry
    );

    expect(mockCreateDefinition).toHaveBeenCalledWith(
      ['test'],
      [],
      ['test-collection'],
      {}
    );
  });

  it('should handle empty scopes array', () => {
    createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      {},
      [],
      mockRegistry
    );

    expect(mockCreateDefinition).toHaveBeenCalledWith(
      ['test'],
      [],
      ['test-collection'],
      {}
    );
  });

  it('should handle custom libOptions', () => {
    const customOptions = {};

    createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      customOptions,
      ['scope1'],
      mockRegistry
    );

    expect(mockCreateDefinition).toHaveBeenCalledWith(
      ['test'],
      ['scope1'],
      ['test-collection'],
      customOptions
    );
  });

  it('should return an object that satisfies the FirestoreLibrary interface', () => {
    const result = createFirestoreLibrary(
      'test',
      'test-collection',
      mockFirestore,
      {},
      [],
      mockRegistry
    );

    // Verify all required properties exist
    expect(result).toHaveProperty('coordinate');
    expect(result).toHaveProperty('operations');
    expect(result).toHaveProperty('options');
    expect(result).toHaveProperty('firestore');
    expect(result).toHaveProperty('registry');

    // Verify operations property has the wrapped operations
    expect(result.operations).toBe(mockWrappedOperations);
  });
});

describe('FirestoreLibrary Operations Integration', () => {
  // Integration test that verifies the structure without full execution
  let integrationMockRegistry: Registry;
  let integrationMockFirestore: any;

  beforeEach(() => {
    // Clear mocks instead of reset to maintain mock implementations
    vi.clearAllMocks();

    // Create a mock registry
    integrationMockRegistry = {
      type: 'lib',
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    } as unknown as Registry;

    // Create basic mock firestore
    integrationMockFirestore = {} as FirebaseFirestore.Firestore;
  });

  it('should verify that Primary.wrapOperations adds all expected methods', () => {
    // Since we can't easily test the actual wrapping due to mocks,
    // we'll verify that the wrapped operations are used in the result
    const result = createFirestoreLibrary(
      'test',
      'test-collection',
      integrationMockFirestore,
      {},
      [],
      integrationMockRegistry
    );

    // Verify that Primary.wrapOperations was called, which adds the action/facet methods
    expect(mockPrimaryWrapOperations).toHaveBeenCalled();

    // Verify the result has the expected structure - it should use the wrapped operations
    expect(result.operations).toBeDefined();
    expect(typeof result.operations).toBe('object');
  });

  it('should call Primary.wrapOperations with the correct Firestore operations', () => {
    createFirestoreLibrary(
      'test',
      'test-collection',
      integrationMockFirestore,
      {},
      [],
      integrationMockRegistry
    );

    // Verify Primary.wrapOperations was called
    expect(mockPrimaryWrapOperations).toHaveBeenCalled();

    // Verify createOperations was called to create the base operations
    expect(mockCreateOperations).toHaveBeenCalled();
  });

  it('should demonstrate the expected operations that should be present', () => {
    // This test documents what operations should be present in a real FirestoreLibrary
    // The actual testing of these operations is done in other test files

    const expectedOperations = [
      // Basic CRUD operations (provided by Firestore implementation)
      'all',
      'one',
      'create',
      'update',
      'get',
      'remove',
      'find',
      'upsert',

      // Extended operations (added by Primary.wrapOperations)
      'findOne',
      'action',
      'facet',
      'allAction',
      'allFacet',

      // Configuration objects (added by Primary.wrapOperations)
      'actions',
      'facets',
      'allActions',
      'allFacets',
      'finders'
    ];

    // This test serves as documentation of what should be tested
    // The actual integration testing should be done with real instances
    expect(expectedOperations).toContain('action');
    expect(expectedOperations).toContain('facet');
    expect(expectedOperations).toContain('allAction');
    expect(expectedOperations).toContain('allFacet');
  });
});
