import { describe, expect, it } from 'vitest';

// Ensure index barrel re-exports without throwing

describe('primary/index barrel', () => {
  it('should export FirestoreLibrary symbols', async () => {
    const mod = await import('../../src/primary');
    expect(mod).toBeDefined();
    // It should at least contain createFirestoreLibrary or re-exports from file
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
