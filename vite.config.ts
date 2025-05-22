import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { VitePluginNode } from 'vite-plugin-node';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './src/index.ts',
      exportName: 'viteNodeApp',
      tsCompiler: 'swc',
    }),
    // visualizer({
    //     template: 'network',
    //     filename: 'network.html',
    //     projectRoot: process.cwd(),
    // }),
    dts({
      entryRoot: 'src',
      outDir: 'dist',
      exclude: ['./tests/**/*.ts'],
      include: ['./src/**/*.ts'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      input: 'src/index.ts',
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        preserveModules: true,
        exports: 'named',
        sourcemap: 'inline',
      },
    },
    // Make sure Vite generates ESM-compatible code
    modulePreload: false,
    minify: false,
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 79,
        branches: 80,
        functions: 73,
        lines: 79,
      },
      exclude: [
        ...((configDefaults.coverage.exclude ?? []) as string[]),
        'tests/**/*',
        'dist/**/*',
      ],
    },
  },
});