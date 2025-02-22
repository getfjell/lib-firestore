import { Definition } from '@/Definition';
import { getFindOperation } from '@/ops/find';
import { Item, LocKeyArray } from '@fjell/core';
import * as Library from '@fjell/lib';
import { Operations } from '@fjell/lib';

jest.mock('@fjell/logging', () => {
  return {
    get: jest.fn().mockReturnThis(),
    getLogger: jest.fn().mockReturnThis(),
    default: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    emergency: jest.fn(),
    alert: jest.fn(),
    critical: jest.fn(),
    notice: jest.fn(),
    time: jest.fn().mockReturnThis(),
    end: jest.fn(),
    log: jest.fn(),
  }
});

describe('find', () => {
  let mockLibOptions: Library.Options<any, any>;
  let mockFinderFn: jest.Mock;
  type TestItem = Item<'test'>;
  let definitionMock: jest.Mocked<Definition<TestItem, 'test'>>;
  let operations: jest.Mocked<Operations<TestItem, 'test'>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFinderFn = jest.fn();
    mockLibOptions = {
      finders: {
        testFinder: mockFinderFn
      }
    } as any;
    definitionMock = {
      collectionNames: ['test'],
      coordinate: { kta: ['test'] },
      options: mockLibOptions
    } as any;
    operations = {
      find: jest.fn()
    } as any;
  });

  it('should call finder function with correct parameters', async () => {
    const find = getFindOperation<TestItem, 'test'>(definitionMock, operations);
    const finderParams = { param1: 'value1', param2: 123 };
    const locations: [] = [];
    
    await find('testFinder', finderParams, locations);

    expect(mockFinderFn).toHaveBeenCalledWith(finderParams, locations);
  });

  it('should return results from finder function', async () => {
    const expectedResults = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' }
    ];
    mockFinderFn.mockResolvedValue(expectedResults);

    const find = getFindOperation<TestItem, 'test'>(definitionMock, operations);
    const result = await find('testFinder', {});

    expect(result).toEqual(expectedResults);
  });

  it('should throw error when finder not found', async () => {
    const find = getFindOperation<TestItem, 'test'>(definitionMock, operations);

    await expect(
      find('nonExistentFinder', {})
    ).rejects.toThrow('No finders found');
  });

  it('should throw error when no finders defined', async () => {
    const libOptionsWithoutFinders = {} as Library.Options<any, any>;
    definitionMock.options = libOptionsWithoutFinders;
    const find = getFindOperation<TestItem, 'test'>(definitionMock, operations);

    await expect(
      find('testFinder', {})
    ).rejects.toThrow('No finders found');
  });

  it('should handle locations parameter', async () => {
  
    const mockLibOptions = {
      finders: {
        testFinder: mockFinderFn
      }
    } as any;

    definitionMock.options = mockLibOptions;

    const find = getFindOperation<Item<'test', 'order'>, 'test', 'order'>(definitionMock as any, operations);
    const locations: LocKeyArray<'order'> = [{ kt: 'order', lk: '123' }];

    await find('testFinder', {}, locations);

    expect(mockFinderFn).toHaveBeenCalledWith({}, locations);
  });
});
