import { describe, expect, it, vi } from 'vitest';
import { buildQuery } from '../src/QueryBuilder';
import type { Query } from '@google-cloud/firestore';

// Mock the logger
vi.mock('../src/logger', () => ({
  default: { get: vi.fn(() => ({ debug: vi.fn(), default: vi.fn() })) },
}));

describe('QueryBuilder validation errors', () => {
  const mockQuery = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  } as unknown as Query;

  it('throws for undefined column', () => {
    expect(() =>
      buildQuery(
        {
          compoundCondition: {
            compoundType: 'AND',
            conditions: [{ column: undefined as any, operator: '==', value: 1 }],
          },
        },
        mockQuery as any
      )
    ).toThrow('Invalid field path: column is undefined. Field paths must be non-empty strings.');
  });

  it('throws for non-string column', () => {
    expect(() =>
      buildQuery(
        {
          compoundCondition: {
            compoundType: 'AND',
            conditions: [{ column: 123 as any, operator: '==', value: 1 }],
          },
        },
        mockQuery as any
      )
    ).toThrow('Invalid field path: "123" (type: number). Field paths must be strings.');
  });

  it('throws for empty string column', () => {
    expect(() =>
      buildQuery(
        {
          compoundCondition: {
            compoundType: 'AND',
            conditions: [{ column: '   ', operator: '==', value: 1 }],
          },
        },
        mockQuery as any
      )
    ).toThrow('Invalid field path: empty string. Field paths must be non-empty strings.');
  });
});
