import { describe, expect, it } from 'vitest';

describe('processing/index barrel', () => {
  it('should export ReferenceBuilder related symbols', async () => {
    const mod = await import('../../src/processing');
    expect(mod).toBeDefined();
    expect('buildFirestoreReference' in mod).toBe(true);
    expect('stripReferenceItems' in mod).toBe(true);
  });
});
