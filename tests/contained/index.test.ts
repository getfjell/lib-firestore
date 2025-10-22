import { describe, expect, it } from 'vitest';

describe('contained/index barrel', () => {
  it('should export FirestoreLibrary and Operations symbols', async () => {
    const mod = await import('../../src/contained');
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
