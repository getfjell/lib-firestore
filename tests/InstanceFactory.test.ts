import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInstanceFactory } from '@/InstanceFactory';
import { Item } from '@fjell/core';
import { createInstanceFromComponents } from '@/Instance';
import { Options } from '@/Options';
import { Coordinate, Registry, RegistryHub } from '@fjell/registry';
import * as Library from '@fjell/lib';

// Mock dependencies
vi.mock('@/Instance', () => ({
  createInstance: vi.fn(),
  createInstanceFromComponents: vi.fn(),
}));

vi.mock('@/logger', () => ({
  get: vi.fn(() => ({
    debug: vi.fn(),
  })),
  __esModule: true,
  default: { get: vi.fn(() => ({ debug: vi.fn() })) }
}));

const mockCreateInstanceFromComponents = vi.mocked(createInstanceFromComponents);

interface TestItem extends Item<'test'> {
  name: string;
  value: number;
}

describe('InstanceFactory', () => {
  let mockFirestore: FirebaseFirestore.Firestore;
  let mockOperations: Library.Operations<TestItem, 'test'>;
  let mockOptions: Options<TestItem, 'test'>;
  let mockCoordinate: Coordinate<'test'>;
  let mockRegistry: Registry;
  let mockRegistryHub: RegistryHub;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFirestore = {} as FirebaseFirestore.Firestore;
    mockOperations = {
      all: vi.fn(),
      one: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
    } as unknown as Library.Operations<TestItem, 'test'>;

    mockOptions = {
      hooks: {},
      validators: {},
      finders: {},
      actions: {},
      facets: {},
    } as Options<TestItem, 'test'>;

    mockCoordinate = {
      kta: ['test'],
      scopes: ['firestore'],
      toString: () => 'test-coordinate'
    } as Coordinate<'test'>;

    mockRegistry = {
      type: 'lib',
      get: vi.fn(),
      register: vi.fn(),
      createInstance: vi.fn(),
      instanceTree: vi.fn(),
    } as unknown as Registry;

    mockRegistryHub = {
      get: vi.fn(),
      register: vi.fn(),
      createRegistry: vi.fn(),
      registerRegistry: vi.fn(),
      getRegistry: vi.fn(),
      getRegisteredTypes: vi.fn(),
      unregisterRegistry: vi.fn(),
    } as unknown as RegistryHub;
  });

  describe('createInstanceFactory', () => {
    it('should create an instance factory function', () => {
      const factory = createInstanceFactory(mockFirestore, mockOperations, mockOptions);

      expect(factory).toBeInstanceOf(Function);
      expect(typeof factory).toBe('function');
    });

    it('should return a function that creates instances', () => {
      const mockInstance = {
        coordinate: mockCoordinate,
        registry: mockRegistry,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      };

      mockCreateInstanceFromComponents.mockReturnValue(mockInstance as any);

      const factory = createInstanceFactory(mockFirestore, mockOperations, mockOptions);
      const context = { registry: mockRegistry, registryHub: mockRegistryHub };

      const result = factory(mockCoordinate, context);

      expect(mockCreateInstanceFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );
      expect(result).toBe(mockInstance);
    });

    it('should work without registryHub in context', () => {
      const mockInstance = {
        coordinate: mockCoordinate,
        registry: mockRegistry,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      };

      mockCreateInstanceFromComponents.mockReturnValue(mockInstance as any);

      const factory = createInstanceFactory(mockFirestore, mockOperations, mockOptions);
      const context = { registry: mockRegistry };

      const result = factory(mockCoordinate, context);

      expect(mockCreateInstanceFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        mockCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );
      expect(result).toBe(mockInstance);
    });

    it('should handle different coordinate types', () => {
      const multiLevelCoordinate = {
        kta: ['test', 'level1', 'level2'],
        scopes: ['firestore', 'multi'],
        toString: () => 'multi-level-coordinate'
      } as unknown as Coordinate<'test'>;

      const mockInstance = {
        coordinate: multiLevelCoordinate,
        registry: mockRegistry,
        firestore: mockFirestore,
        operations: mockOperations,
        options: mockOptions,
      };

      mockCreateInstanceFromComponents.mockReturnValue(mockInstance as any);

      const factory = createInstanceFactory(mockFirestore, mockOperations, mockOptions);
      const context = { registry: mockRegistry };

      const result = factory(multiLevelCoordinate, context);

      expect(mockCreateInstanceFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        multiLevelCoordinate,
        mockFirestore,
        mockOperations,
        mockOptions
      );
      expect(result).toBe(mockInstance);
    });

    it('should pass through all provided parameters correctly', () => {
      const specificFirestore = { projectId: 'test-project' } as unknown as FirebaseFirestore.Firestore;
      const specificOperations = {
        all: vi.fn().mockName('specific-all'),
        one: vi.fn().mockName('specific-one'),
        get: vi.fn().mockName('specific-get'),
        create: vi.fn().mockName('specific-create'),
        update: vi.fn().mockName('specific-update'),
        remove: vi.fn().mockName('specific-remove'),
        find: vi.fn().mockName('specific-find'),
      } as unknown as Library.Operations<TestItem, 'test'>;

      const specificOptions = {
        hooks: { preCreate: vi.fn() },
        validators: {},
        finders: {},
        actions: {},
        facets: {},
      } as Options<TestItem, 'test'>;

      const mockInstance = {
        coordinate: mockCoordinate,
        registry: mockRegistry,
        firestore: specificFirestore,
        operations: specificOperations,
        options: specificOptions,
      };

      mockCreateInstanceFromComponents.mockReturnValue(mockInstance as any);

      const factory = createInstanceFactory(specificFirestore, specificOperations, specificOptions);
      const context = { registry: mockRegistry, registryHub: mockRegistryHub };

      const result = factory(mockCoordinate, context);

      expect(mockCreateInstanceFromComponents).toHaveBeenCalledWith(
        mockRegistry,
        mockCoordinate,
        specificFirestore,
        specificOperations,
        specificOptions
      );
      expect(result).toBe(mockInstance);
    });

    it('should create instances with correct type annotation', () => {
      const factory = createInstanceFactory(
        mockFirestore,
        mockOperations,
        mockOptions
      );

      // Type check - this should compile without errors
      expect(typeof factory).toBe('function');
    });
  });
});
