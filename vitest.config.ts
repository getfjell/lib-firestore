import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'tests/**',
        'src/index.ts',
        '**/*.d.ts',
        'dist/**',
        'build.js',
        'docs/**',
        'coverage/**',
        'scripts/**',
        'eslint.config.mjs',
        'vitest.config.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    server: {
      deps: {
        inline: [/@fjell/],
      },
    },
  },
  build: {
    sourcemap: true,
  },
});
