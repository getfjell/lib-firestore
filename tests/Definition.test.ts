/* eslint-disable no-undefined */
import { ItemTypeArray } from '@fjell/core';
import { jest } from '@jest/globals';

// Mock dependencies
const mockLibCreateDefinition = jest.fn();
const mockCreateCoordinate = jest.fn();
const mockCreateOptions = jest.fn();

// @ts-ignore
jest.unstable_mockModule('@fjell/lib', () => ({
  createDefinition: mockLibCreateDefinition,
}));

// @ts-ignore
jest.unstable_mockModule('../src/Coordinate', () => ({
  createCoordinate: mockCreateCoordinate,
}));

// @ts-ignore
jest.unstable_mockModule('../src/Options', () => ({
  createOptions: mockCreateOptions,
}));

let Definition: any;

describe('createDefinition', () => {
  beforeEach(async () => {
    // Clear mock call history before each test
    mockLibCreateDefinition.mockClear();
    mockCreateCoordinate.mockClear();
    mockCreateOptions.mockClear();

    Definition = await import('@/Definition');
  });

  it('should call createCoordinate with kta and scopes', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1', 'scope2'];
    const collectionNames = ['collection1'];

    Definition.createDefinition(kta, scopes, collectionNames);

    expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
  });

  it('should call createOptions with libOptions', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1'];
    const libOptions = { someOption: 'value' };

    Definition.createDefinition(kta, scopes, collectionNames, libOptions as any); // Cast to any for simplicity in test

    expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
  });

  it('should call Library.createDefinition with coordinate and options', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1'];
    const mockCoordinate = { type: 'coordinate' };
    const mockOptions = { type: 'options' };

    mockCreateCoordinate.mockReturnValue(mockCoordinate);
    mockCreateOptions.mockReturnValue(mockOptions);

    Definition.createDefinition(kta, scopes, collectionNames);

    expect(mockLibCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);
  });

  it('should return a definition object with collectionNames and properties from Library.createDefinition', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1', 'collection2'];
    const mockLibDef = { libProp: 'libValue' };

    mockLibCreateDefinition.mockReturnValue(mockLibDef);
    // Mock other functions as they are called before the final object construction
    mockCreateCoordinate.mockReturnValue({});
    mockCreateOptions.mockReturnValue({});

    const definition = Definition.createDefinition(kta, scopes, collectionNames);

    expect(definition).toEqual({
      ...mockLibDef,
      collectionNames,
    });
  });

  it('should handle undefined libOptions', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1'];
    const mockCoordinate = { type: 'coordinate' };
    const mockOptions = { type: 'options' }; // Options even if libOptions is undefined

    mockCreateCoordinate.mockReturnValue(mockCoordinate);
    mockCreateOptions.mockReturnValue(mockOptions); // createOptions will be called with undefined
    mockLibCreateDefinition.mockReturnValue({ libProp: 'libValue' });

    Definition.createDefinition(kta, scopes, collectionNames, undefined);

    expect(mockCreateOptions).toHaveBeenCalledWith(undefined);
    expect(mockLibCreateDefinition).toHaveBeenCalledWith(mockCoordinate, mockOptions);
  });
});
