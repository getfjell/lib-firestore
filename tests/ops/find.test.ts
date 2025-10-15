import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger to suppress output and allow assertions
const mockLogger = {
  debug: vi.fn(),
  default: vi.fn(),
  error: vi.fn(),
};
const mockLoggerGet = vi.fn(() => mockLogger);

vi.mock('../../src/logger', () => ({
  default: { get: mockLoggerGet },
}));

// Import after mocks
let getFindOperation: any;
beforeAll(async () => {
  ({ getFindOperation } = await import('../../src/ops/find'));
});

describe('getFindOperation', () => {
  const mockFinderResult: any = [{ foo: 'bar' }];
  const finderParams = { param1: 'value1' };
  const locations = [{ kt: 'LOC1', lk: 'loc1' }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the correct finder and returns its result', async () => {
    // @ts-ignore
    const mockFinder: any = vi.fn().mockResolvedValue(mockFinderResult);
    const definition: any = {
      coordinate: { kta: ['TYPEA', 'LOC1'] },
      options: {
        finders: {
          myFinder: mockFinder,
        },
      },
    };
    const operations: any = {};
    const find = getFindOperation(definition, operations);
    const result = await find('myFinder', finderParams as any, locations as any);
    expect(mockFinder).toHaveBeenCalledWith(finderParams, locations);
    expect(result).toBe(mockFinderResult);
    expect(mockLogger.default).toHaveBeenCalledWith('Find', expect.objectContaining({ finder: 'myFinder' }));
  });

  it('throws if the finder throws', async () => {
    // @ts-ignore
    const mockFinder: any = vi.fn().mockRejectedValue(new Error('Finder error'));
    const definition: any = {
      coordinate: { kta: ['TYPEA', 'LOC1'] },
      options: {
        finders: {
          myFinder: mockFinder,
        },
      },
    };
    const operations: any = {};
    const find = getFindOperation(definition, operations);
    await expect(find('myFinder', finderParams as any, locations as any)).rejects.toThrow('Finder error');
    expect(mockFinder).toHaveBeenCalledWith(finderParams, locations);
  });

  it('throws if the finder does not exist', async () => {
    const definition: any = {
      coordinate: { kta: ['TYPEA', 'LOC1'] },
      options: {
        finders: {
          otherFinder: vi.fn(),
        },
      },
    };
    const operations: any = {};
    const find = getFindOperation(definition, operations);
    await expect(find('missingFinder', finderParams as any, locations as any)).rejects.toThrow('No finders found');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'No finders have been defined for this lib.  Requested finder %s with params %j',
      'missingFinder',
      finderParams
    );
  });

  it('throws if no finders are defined', async () => {
    const definition: any = {
      coordinate: { kta: ['TYPEA', 'LOC1'] },
      options: {},
    };
    const operations: any = {};
    const find = getFindOperation(definition, operations);
    await expect(find('anyFinder', finderParams as any, locations as any)).rejects.toThrow('No finders found');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'No finders have been defined for this lib.  Requested finder %s with params %j',
      'anyFinder',
      finderParams
    );
  });
});
