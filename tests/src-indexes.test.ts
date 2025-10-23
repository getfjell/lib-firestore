import { describe, expect, it } from 'vitest';

// This file ensures various top-level barrel files can import successfully

describe('barrel exports', () => {
  it('src/index exports without error', async () => {
    const mod = await import('../src');
    expect(mod).toBeDefined();
  });

  it('src/contained exports without error', async () => {
    const mod = await import('../src/contained');
    expect(mod).toBeDefined();
  });

  it('src/primary exports without error', async () => {
    const mod = await import('../src/primary');
    expect(mod).toBeDefined();
  });
});
