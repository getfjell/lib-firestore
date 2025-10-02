import { Item } from '@fjell/core';
import * as Library from '@fjell/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define a generic item type for testing purposes
interface MockItem extends Item<string, 'l1', 'l2', 'l3', 'l4', 'l5'> {
  id: string;
  name: string;
  // The following are typically part of the base Item type or a more specific interface
  itemType?: string;
  searchableFields?: string[];
}

// Mock the @fjell/lib module
const mockLibCreateOptions = vi.fn();
vi.mock('@fjell/lib', () => ({
  createOptions: mockLibCreateOptions,
}));

describe('createOptions', () => {
  beforeEach(() => {
    // Clear mock history before each test
    mockLibCreateOptions.mockClear();
  });

  it('should call Library.createOptions with provided options and return its result', async () => {
    // Import createOptions dynamically after mocks are set up
    const { createOptions } = await import('../src/Options');
    const libOptions: Partial<MockItem> = { // Type as Partial<MockItem>
      itemType: 'mockItem',
      searchableFields: ['name'],
      id: '123', // Add required properties of MockItem
      name: 'Test Item' // Add required properties of MockItem
    };
    const expectedOptionsOutput = { ...libOptions, someOtherProp: 'test' };
    mockLibCreateOptions.mockReturnValue(expectedOptionsOutput);

    // Cast to Library.Options when passing to the function
    const result: any = createOptions(libOptions as Library.Options<MockItem, string, 'l1', 'l2', 'l3', 'l4', 'l5'>);

    expect(mockLibCreateOptions).toHaveBeenCalledTimes(1);
    expect(mockLibCreateOptions).toHaveBeenCalledWith(libOptions);
    expect(result).toEqual(expectedOptionsOutput);
  });

  it('should call Library.createOptions with undefined if no options are provided and return its result', async () => {
    // Import createOptions dynamically after mocks are set up
    const { createOptions } = await import('../src/Options');
    const expectedOptionsOutput = { itemType: 'default', someOtherProp: 'defaultTest' };
    mockLibCreateOptions.mockReturnValue(expectedOptionsOutput);

    const result: any = createOptions();

    expect(mockLibCreateOptions).toHaveBeenCalledTimes(1);
    // @ts-ignore
     
    expect(mockLibCreateOptions).toHaveBeenCalledWith(undefined);
    expect(result).toEqual(expectedOptionsOutput);
  });

  it('should return the exact structure from Library.createOptions', async () => {
    const { createOptions } = await import('../src/Options');
    const mockOutput: any = { // Using 'any' for mockOutput to bypass strict type checking
      itemType: 'anotherMock',
      searchableFields: ['id'],
      anotherProperty: 123,
      nested: {
        deep: true,
      },
    };
    mockLibCreateOptions.mockReturnValue(mockOutput);

    const customOptions: Partial<MockItem> = { // Type as Partial<MockItem>
      itemType: 'custom',
      searchableFields: ['name'],
      id: '456', // Add required properties of MockItem
      name: 'Another Item' // Add required properties of MockItem
    };
    // Cast to Library.Options when passing to the function
    const result: any = createOptions(customOptions as Library.Options<MockItem, string, 'l1', 'l2', 'l3', 'l4', 'l5'>);

    expect(result).toEqual(mockOutput);
    expect(result.itemType).toBe('anotherMock');
    expect(result.searchableFields).toEqual(['id']);
    expect(result).toHaveProperty('anotherProperty');
    expect(result.nested?.deep).toBe(true);
  });
});
