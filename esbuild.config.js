import { build, context } from 'esbuild';
import { readFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

// Read dependencies from package.json to mark them as external
const { dependencies, peerDependencies } = JSON.parse(readFileSync('./package.json', 'utf-8'));
const external = [
  ...Object.keys(dependencies || {}),
  ...Object.keys(peerDependencies || {})
];

const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  target: 'es2022',
  sourcemap: true,
  minify: false,
  external, // Don't bundle dependencies
  platform: 'neutral',
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default']
};

async function buildESM() {
  const buildConfig = {
    ...baseConfig,
    format: 'esm',
    outfile: 'dist/index.js',
    splitting: false,
  };

  if (isWatch) {
    console.log('👀 Starting watch mode...');
    const ctx = await context(buildConfig);
    await ctx.watch();
    console.log('✅ Watching for changes...');
  } else {
    await build(buildConfig);
  }
}

async function buildAll() {
  try {
    console.log('Building ESM...');
    await buildESM();
    if (!isWatch) {
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildAll();
