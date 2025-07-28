/* eslint-disable no-undefined */
import { ItemTypeArray } from '@fjell/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
const mockCreateCoordinate = vi.fn();
const mockCreateOptions = vi.fn();

// @ts-ignore
vi.mock('../src/Coordinate', () => ({
  createCoordinate: mockCreateCoordinate,
}));

// @ts-ignore
vi.mock('../src/Options', () => ({
  createOptions: mockCreateOptions,
}));

let Definition: any;

describe('createDefinition', () => {
  beforeEach(async () => {
    // Clear mock call history before each test
    mockCreateCoordinate.mockClear();
    mockCreateOptions.mockClear();

    Definition = await import('../src/Definition');
  });

  it('should call createCoordinate with kta and scopes', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1', 'scope2'];
    const collectionNames = ['collection1'];

    mockCreateCoordinate.mockReturnValue({});
    mockCreateOptions.mockReturnValue({});

    Definition.createDefinition(kta, scopes, collectionNames);

    expect(mockCreateCoordinate).toHaveBeenCalledWith(kta, scopes);
  });

  it('should call createOptions with libOptions', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1'];
    const libOptions = { someOption: true };

    mockCreateCoordinate.mockReturnValue({});
    mockCreateOptions.mockReturnValue({});

    Definition.createDefinition(kta, scopes, collectionNames, libOptions);

    expect(mockCreateOptions).toHaveBeenCalledWith(libOptions);
  });

  it('should return a definition object with coordinate, options, and collectionNames', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1', 'collection2'];
    const mockCoordinate = { type: 'coordinate' };
    const mockOptions = { type: 'options' };

    mockCreateCoordinate.mockReturnValue(mockCoordinate);
    mockCreateOptions.mockReturnValue(mockOptions);

    const definition = Definition.createDefinition(kta, scopes, collectionNames);

    expect(definition).toEqual({
      coordinate: mockCoordinate,
      options: mockOptions,
      collectionNames,
    });
  });

  it('should handle undefined libOptions', () => {
    const kta = ['item'] as ItemTypeArray<'item'>;
    const scopes = ['scope1'];
    const collectionNames = ['collection1'];
    const mockCoordinate = { type: 'coordinate' };
    const mockOptions = { type: 'options' };

    mockCreateCoordinate.mockReturnValue(mockCoordinate);
    mockCreateOptions.mockReturnValue(mockOptions);

    const definition = Definition.createDefinition(kta, scopes, collectionNames, undefined);

    expect(mockCreateOptions).toHaveBeenCalledWith(undefined);
    expect(definition).toEqual({
      coordinate: mockCoordinate,
      options: mockOptions,
      collectionNames,
    });
  });
});
