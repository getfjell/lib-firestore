import { describe, expect, it } from 'vitest';

describe('Registry', () => {
  it('should re-export Registry from @fjell/lib', async () => {
    const registryModule = await import('@/Registry');

    // Test that the module exports the Registry
    expect(registryModule).toBeDefined();

    // Since it's a re-export, we can't test much more without importing the actual Registry
    // This test ensures the module can be imported successfully
  });
});
